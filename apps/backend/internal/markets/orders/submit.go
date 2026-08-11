package orders

import (
	"context"
	"errors"
	"strings"
	"sync"

	"github.com/google/uuid"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/clob"
	"retropick/apps/backend/internal/markets/wallet"
)

// VenueSubmitter posts signed orders to Polymarket CLOB V2.
type VenueSubmitter interface {
	SubmitOrder(ctx context.Context, req clob.SubmitRequest) (clob.SubmitResult, error)
}

// SubmitMetrics counts submit outcomes and preview-sign binding checks.
type SubmitMetrics interface {
	RecordOrderSubmit(success bool)
	RecordPreviewSignMatch(matched bool)
}

type nopSubmitMetrics struct{}

func (nopSubmitMetrics) RecordOrderSubmit(bool) {}

func (nopSubmitMetrics) RecordPreviewSignMatch(bool) {}

// Submit wires order submit dependencies into Service.
type Submit struct {
	mu                 sync.Mutex
	orderSubmitEnabled bool
	venue              VenueSubmitter
	idempotency        *IdempotencyStore
	journal            MutationJournal
	metrics            SubmitMetrics
}

// SubmitConfig wires submit dependencies.
type SubmitConfig struct {
	OrderSubmitEnabled bool
	Venue              VenueSubmitter
	Idempotency        *IdempotencyStore
	Journal            MutationJournal
	Metrics            SubmitMetrics
}

func newSubmit(cfg SubmitConfig) Submit {
	idem := cfg.Idempotency
	if idem == nil {
		idem = NewIdempotencyStore()
	}
	metrics := cfg.Metrics
	if metrics == nil {
		metrics = nopSubmitMetrics{}
	}
	return Submit{
		orderSubmitEnabled: cfg.OrderSubmitEnabled,
		venue:              cfg.Venue,
		idempotency:        idem,
		journal:            cfg.Journal,
		metrics:            metrics,
	}
}

const (
	httpStatusSubmitCreated       = 201
	httpStatusBadRequest          = 400
	httpStatusPreviewNotFound     = 404
	httpStatusIntegrityMismatch   = 409
	httpStatusPreviewExpired      = 410
	httpStatusIdempotencyConflict = 422
	httpStatusUpstreamUnavailable = 502
	httpStatusCapabilityDisabled  = 503
)

// SubmitOrder validates preview binding and relays a signed order upstream.
func (s *Service) SubmitOrder(
	ctx context.Context,
	session wallet.SessionContext,
	idempotencyKey string,
	req SubmitRequest,
) (SubmitResponse, int, error) {
	if s.submit.journal == nil {
		s.submit.mu.Lock()
		defer s.submit.mu.Unlock()
	}
	if !s.submit.orderSubmitEnabled {
		return SubmitResponse{}, httpStatusCapabilityDisabled, ErrCapabilityDisabled
	}
	if err := s.validateSession(session); err != nil {
		return SubmitResponse{}, 0, err
	}
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	if idempotencyKey == "" {
		return SubmitResponse{}, 0, ErrMissingIdempotencyKey
	}
	if err := validateSubmitRequest(req); err != nil {
		return SubmitResponse{}, 0, err
	}

	bodyHash := hashSubmitBody(req)
	if s.submit.journal == nil {
		if cached, ok := s.submit.idempotency.Lookup(idempotencyKey); ok {
			if cached.BodyHash != bodyHash {
				return SubmitResponse{}, httpStatusIdempotencyConflict, ErrIdempotencyConflict
			}
			return cached.Response, cached.StatusCode, nil
		}
	}

	rec, ok := s.store.Get(req.PreviewID)
	if !ok {
		return SubmitResponse{}, httpStatusPreviewNotFound, ErrPreviewNotFound
	}
	if rec.UserID != "" && rec.UserID != session.UserID {
		return SubmitResponse{}, httpStatusPreviewNotFound, ErrPreviewNotFound
	}
	if !s.now().UTC().Before(rec.ExpiresAt) {
		return SubmitResponse{}, httpStatusPreviewExpired, ErrPreviewExpired
	}
	if !VerifyContentHash(rec.UnsignedPayload, rec.Metadata, req.ContentHash) {
		s.submit.metrics.RecordPreviewSignMatch(false)
		return SubmitResponse{}, httpStatusIntegrityMismatch, ErrIntegrityMismatch
	}
	s.submit.metrics.RecordPreviewSignMatch(true)

	if s.submit.venue == nil {
		return SubmitResponse{}, httpStatusUpstreamUnavailable, ErrUpstreamUnavailable
	}

	clobReq := clob.SubmitRequest{
		Order:     payloadToCLOB(rec.UnsignedPayload),
		Signature: req.Signature,
		OrderType: clob.OrderTypeGTC,
	}

	var durableClaim MutationClaim
	if s.submit.journal != nil {
		var err error
		durableClaim, err = s.submit.journal.ClaimSubmit(ctx, SubmitMutationClaim{
			UserID:             session.UserID,
			IdempotencyKey:     idempotencyKey,
			RequestFingerprint: bodyHash,
			Intent:             mutationIntentFromPreview(req, rec, bodyHash),
		})
		if err != nil {
			if errors.Is(err, ErrJournalIdempotencyConflict) {
				return SubmitResponse{}, httpStatusIdempotencyConflict, ErrIdempotencyConflict
			}
			return SubmitResponse{}, httpStatusUpstreamUnavailable, ErrUpstreamUnavailable
		}
		if !durableClaim.ShouldSubmit {
			resp := replayResponseFromClaim(durableClaim)
			if s.submit.journal == nil {
				s.submit.idempotency.Put(idempotencyKey, bodyHash, httpStatusSubmitCreated, resp)
			}
			return resp, httpStatusSubmitCreated, nil
		}
	}

	result, err := s.submit.venue.SubmitOrder(ctx, clobReq)
	if err != nil {
		s.submit.metrics.RecordOrderSubmit(false)
		if errors.Is(err, clob.ErrSubmitUnknown) {
			now := s.now().UTC()
			orderID := submitOrderID(durableClaim)
			resp := SubmitResponse{
				SchemaVersion: SchemaVersion,
				OrderID:       orderID,
				Status:        orderStatusUnknown,
				SubmittedAt:   now,
				Provenance: markets.UpstreamProvenance{
					Source:     "polymarket_clob",
					ObservedAt: now,
				},
				Warnings: []string{"unknown_reconciling"},
			}
			if s.submit.journal != nil {
				if err := s.submit.journal.MarkSubmitUnknown(ctx, SubmitMutationResult{
					OrderID:    durableClaim.OrderID,
					AttemptID:  durableClaim.AttemptID,
					HTTPStatus: httpStatusSubmitCreated,
					ErrorCode:  "submit_unknown",
					Response:   resp,
					ObservedAt: now,
				}); err != nil {
					return SubmitResponse{}, httpStatusUpstreamUnavailable, ErrUpstreamUnavailable
				}
			}
			persistUnknownOrder(s, session, orderID, rec)
			if s.submit.journal == nil {
				s.submit.idempotency.Put(idempotencyKey, bodyHash, httpStatusSubmitCreated, resp)
			}
			return resp, httpStatusSubmitCreated, nil
		}
		status, mapped := mapSubmitUpstreamError(err)
		if s.submit.journal != nil {
			if err := s.submit.journal.MarkSubmitRejected(ctx, SubmitMutationResult{
				OrderID:    durableClaim.OrderID,
				AttemptID:  durableClaim.AttemptID,
				HTTPStatus: status,
				ErrorCode:  mapped.Error(),
				ObservedAt: s.now().UTC(),
			}); err != nil {
				return SubmitResponse{}, httpStatusUpstreamUnavailable, ErrUpstreamUnavailable
			}
		}
		return SubmitResponse{}, status, mapped
	}

	now := s.now().UTC()
	orderID := submitOrderID(durableClaim)
	resp := SubmitResponse{
		SchemaVersion: SchemaVersion,
		OrderID:       orderID,
		VenueOrderID:  result.OrderID,
		Status:        mapVenueStatus(result.Status),
		SubmittedAt:   now,
		Provenance: markets.UpstreamProvenance{
			Source:     "polymarket_clob",
			UpstreamID: result.OrderID,
			ObservedAt: now,
		},
	}

	if s.submit.journal != nil {
		if err := s.submit.journal.MarkSubmitAccepted(ctx, SubmitMutationResult{
			OrderID:      durableClaim.OrderID,
			AttemptID:    durableClaim.AttemptID,
			VenueOrderID: result.OrderID,
			HTTPStatus:   httpStatusSubmitCreated,
			Response:     resp,
			ObservedAt:   now,
		}); err != nil {
			return SubmitResponse{}, httpStatusUpstreamUnavailable, ErrUpstreamUnavailable
		}
	}
	s.store.Delete(req.PreviewID)
	persistSubmittedOrder(s, session, orderID, rec, result.OrderID, mapVenueStatus(result.Status))
	s.submit.metrics.RecordOrderSubmit(true)
	if s.submit.journal == nil {
		s.submit.idempotency.Put(idempotencyKey, bodyHash, httpStatusSubmitCreated, resp)
	}
	return resp, httpStatusSubmitCreated, nil
}

func mutationIntentFromPreview(req SubmitRequest, rec previewRecord, bodyHash string) OrderMutationIntent {
	previewID, _ := uuid.Parse(req.PreviewID)
	side := rec.Side
	if side == "" {
		if rec.UnsignedPayload.Side == 1 {
			side = SideSell
		} else {
			side = SideBuy
		}
	}
	return OrderMutationIntent{
		PreviewID:         previewID,
		ContentHash:       req.ContentHash,
		SignedPayloadHash: "0x" + bodyHash,
		MarketID:          rec.Metadata.MarketID,
		TokenID:           rec.Metadata.TokenID,
		Side:              side,
		Price:             rec.Price,
		Size:              rec.Size,
		MakerAmount:       rec.UnsignedPayload.MakerAmount,
		TakerAmount:       rec.UnsignedPayload.TakerAmount,
		ExchangeDomain:    rec.ExchangeDomain,
		MakerAddress:      rec.UnsignedPayload.Maker,
		SignerAddress:     rec.UnsignedPayload.Signer,
		UnsignedPayload:   rec.UnsignedPayload,
		Metadata:          rec.Metadata,
		ExpiresAt:         rec.ExpiresAt,
	}
}

func submitOrderID(claim MutationClaim) string {
	if claim.OrderID == uuid.Nil {
		return uuid.NewString()
	}
	return claim.OrderID.String()
}

func replayResponseFromClaim(claim MutationClaim) SubmitResponse {
	status := claim.State
	warnings := []string(nil)
	switch claim.State {
	case MutationStateNotSubmitted:
		status = OrderStatusNotSubmitted
	case MutationStateIntentPersisted, MutationStateSubmitting, MutationStateUnknownReconciling, orderStatusUnknown:
		status = orderStatusUnknown
		warnings = []string{"unknown_reconciling"}
	case MutationStateAccepted:
		status = orderStatusOpen
	}
	observedAt := claim.UpdatedAt
	if observedAt.IsZero() {
		observedAt = claim.CreatedAt
	}
	return SubmitResponse{
		SchemaVersion: SchemaVersion,
		OrderID:       submitOrderID(claim),
		VenueOrderID:  claim.VenueOrderID,
		Status:        status,
		SubmittedAt:   observedAt.UTC(),
		Provenance: markets.UpstreamProvenance{
			Source:     "polymarket_clob",
			UpstreamID: claim.VenueOrderID,
			ObservedAt: observedAt.UTC(),
		},
		Warnings: warnings,
	}
}

func hasLinkedWallet(wallets []wallet.LinkedWallet) bool {
	for _, w := range wallets {
		if w.LinkStatus == wallet.LinkStatusLinked {
			return true
		}
	}
	return false
}

func validateSubmitRequest(req SubmitRequest) error {
	req.PreviewID = strings.TrimSpace(req.PreviewID)
	req.ContentHash = strings.TrimSpace(req.ContentHash)
	req.Signature = strings.TrimSpace(req.Signature)
	if req.PreviewID == "" || req.ContentHash == "" || req.Signature == "" {
		return ErrInvalidRequest
	}
	if !strings.HasPrefix(req.ContentHash, "0x") || len(req.ContentHash) != 66 {
		return ErrInvalidRequest
	}
	if !strings.HasPrefix(req.Signature, "0x") {
		return ErrInvalidRequest
	}
	return nil
}

func payloadToCLOB(p UnsignedOrderPayload) clob.OrderPayload {
	return clob.OrderPayload{
		Salt:          p.Salt,
		Maker:         p.Maker,
		Signer:        p.Signer,
		TokenID:       p.TokenID,
		MakerAmount:   p.MakerAmount,
		TakerAmount:   p.TakerAmount,
		Side:          p.Side,
		SignatureType: p.SignatureType,
		Timestamp:     p.Timestamp,
		Metadata:      p.Metadata,
		Builder:       p.Builder,
	}
}

func mapVenueStatus(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "live", "open", "accepted":
		return orderStatusOpen
	case "":
		return orderStatusOpen
	default:
		return strings.ToLower(raw)
	}
}

func mapSubmitUpstreamError(err error) (int, error) {
	switch {
	case errors.Is(err, clob.ErrSubmitRejected):
		return httpStatusBadRequest, ErrInvalidRequest
	case errors.Is(err, clob.ErrAuthInvalid):
		return httpStatusUpstreamUnavailable, ErrUpstreamUnavailable
	case errors.Is(err, clob.ErrRateLimited):
		return httpStatusUpstreamUnavailable, ErrUpstreamUnavailable
	case errors.Is(err, clob.ErrCredentialsUnwired):
		return httpStatusUpstreamUnavailable, ErrUpstreamUnavailable
	default:
		return httpStatusUpstreamUnavailable, ErrUpstreamUnavailable
	}
}
