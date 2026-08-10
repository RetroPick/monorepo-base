package orders

import (
	"context"
	"errors"
	"strings"

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
	orderSubmitEnabled bool
	venue              VenueSubmitter
	idempotency        *IdempotencyStore
	metrics            SubmitMetrics
}

// SubmitConfig wires submit dependencies.
type SubmitConfig struct {
	OrderSubmitEnabled bool
	Venue              VenueSubmitter
	Idempotency        *IdempotencyStore
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
	if cached, ok := s.submit.idempotency.Lookup(idempotencyKey); ok {
		if cached.BodyHash != bodyHash {
			return SubmitResponse{}, httpStatusIdempotencyConflict, ErrIdempotencyConflict
		}
		return cached.Response, cached.StatusCode, nil
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

	result, err := s.submit.venue.SubmitOrder(ctx, clobReq)
	if err != nil {
		s.submit.metrics.RecordOrderSubmit(false)
		if errors.Is(err, clob.ErrSubmitUnknown) {
			now := s.now().UTC()
			orderID := uuid.NewString()
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
			persistUnknownOrder(s, session, orderID, rec)
			s.submit.idempotency.Put(idempotencyKey, bodyHash, httpStatusSubmitCreated, resp)
			return resp, httpStatusSubmitCreated, nil
		}
		status, mapped := mapSubmitUpstreamError(err)
		return SubmitResponse{}, status, mapped
	}

	now := s.now().UTC()
	orderID := uuid.NewString()
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

	s.store.Delete(req.PreviewID)
	persistSubmittedOrder(s, session, orderID, rec, result.OrderID, mapVenueStatus(result.Status))
	s.submit.metrics.RecordOrderSubmit(true)
	s.submit.idempotency.Put(idempotencyKey, bodyHash, httpStatusSubmitCreated, resp)
	return resp, httpStatusSubmitCreated, nil
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
