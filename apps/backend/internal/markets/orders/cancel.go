package orders

import (
	"context"
	"errors"
	"strings"
	"time"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/clob"
	"retropick/apps/backend/internal/markets/wallet"
)

// VenueCanceller deletes resting orders on Polymarket CLOB V2.
type VenueCanceller interface {
	CancelOrder(ctx context.Context, venueOrderID string) (clob.CancelResult, error)
}

type clobVenueCanceller struct {
	client *clob.TradingClient
}

func (c clobVenueCanceller) CancelOrder(ctx context.Context, venueOrderID string) (clob.CancelResult, error) {
	return c.client.CancelOrder(ctx, clob.CancelRequest{OrderID: venueOrderID})
}

// CancelConfig wires cancel dependencies.
type CancelConfig struct {
	OrderSubmitEnabled bool
	Venue              VenueCanceller
	Idempotency        *CancelIdempotencyStore
}

type cancelService struct {
	orderSubmitEnabled bool
	venue              VenueCanceller
	idempotency        *CancelIdempotencyStore
}

func newCancel(cfg CancelConfig) cancelService {
	idem := cfg.Idempotency
	if idem == nil {
		idem = NewCancelIdempotencyStore()
	}
	return cancelService{
		orderSubmitEnabled: cfg.OrderSubmitEnabled,
		venue:              cfg.Venue,
		idempotency:        idem,
	}
}

const httpStatusCancelOK = 200

// CancelOrder validates cancel preview binding and relays to CLOB.
func (s *Service) CancelOrder(
	ctx context.Context,
	session wallet.SessionContext,
	targetOrderID string,
	idempotencyKey string,
	req CancelRequest,
) (CancelResponse, int, error) {
	if !s.cancel.orderSubmitEnabled {
		return CancelResponse{}, httpStatusCapabilityDisabled, ErrCapabilityDisabled
	}
	if err := s.validateSession(session); err != nil {
		return CancelResponse{}, 0, err
	}
	targetOrderID = strings.TrimSpace(targetOrderID)
	if targetOrderID == "" {
		return CancelResponse{}, 0, ErrInvalidRequest
	}
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	if idempotencyKey == "" {
		return CancelResponse{}, 0, ErrMissingIdempotencyKey
	}
	if err := validateCancelRequest(req); err != nil {
		return CancelResponse{}, 0, err
	}

	bodyHash := hashCancelBody(req)
	if cached, ok := s.cancel.idempotency.Lookup(idempotencyKey); ok {
		if cached.BodyHash != bodyHash {
			return CancelResponse{}, httpStatusIdempotencyConflict, ErrIdempotencyConflict
		}
		return cached.Response, cached.StatusCode, nil
	}

	rec, ok := s.cancelStore.Get(req.PreviewID)
	if !ok {
		return CancelResponse{}, httpStatusPreviewNotFound, ErrPreviewNotFound
	}
	if rec.UserID != session.UserID {
		return CancelResponse{}, httpStatusPreviewNotFound, ErrPreviewNotFound
	}
	if rec.TargetOrderID != targetOrderID {
		return CancelResponse{}, httpStatusIntegrityMismatch, ErrIntegrityMismatch
	}
	if !s.now().UTC().Before(rec.ExpiresAt) {
		return CancelResponse{}, httpStatusPreviewExpired, ErrPreviewExpired
	}
	if !VerifyCancelContentHash(rec.UnsignedPayload, rec.Metadata, req.ContentHash) {
		return CancelResponse{}, httpStatusIntegrityMismatch, ErrIntegrityMismatch
	}

	order, ok := s.projections.GetOrder(targetOrderID)
	if !ok {
		return CancelResponse{}, httpStatusPreviewNotFound, ErrOrderNotFound
	}
	if order.UserID != session.UserID {
		return CancelResponse{}, httpStatusIntegrityMismatch, ErrOrderNotOwned
	}
	if !isCancelableStatus(order.Status) {
		return CancelResponse{}, 0, ErrOrderNotCancelable
	}
	if strings.TrimSpace(req.Signature) == "" {
		return CancelResponse{}, 0, ErrInvalidRequest
	}

	if s.cancel.venue == nil {
		return CancelResponse{}, httpStatusUpstreamUnavailable, ErrUpstreamUnavailable
	}

	result, err := s.cancel.venue.CancelOrder(ctx, rec.UnsignedPayload.OrderID)
	if err != nil {
		if errors.Is(err, clob.ErrSubmitUnknown) {
			now := s.now().UTC()
			s.projections.UpdateOrder(targetOrderID, func(o *UserOrderRecord) {
				o.Status = orderStatusCancelPending
				o.UpdatedAt = now
			})
			resp := CancelResponse{
				SchemaVersion: SchemaVersion,
				OrderID:       targetOrderID,
				Status:        orderStatusCancelPending,
			}
			s.cancel.idempotency.Put(idempotencyKey, bodyHash, httpStatusCancelOK, resp)
			s.cancelStore.Delete(req.PreviewID)
			return resp, httpStatusCancelOK, nil
		}
		status, mapped := mapCancelUpstreamError(err)
		return CancelResponse{}, status, mapped
	}

	now := s.now().UTC()
	status := orderStatusCancelPending
	var canceledAt *time.Time
	if result.Success {
		status = orderStatusCanceled
		canceledAt = &now
	}
	s.projections.UpdateOrder(targetOrderID, func(o *UserOrderRecord) {
		o.Status = status
		o.UpdatedAt = now
	})

	resp := CancelResponse{
		SchemaVersion: SchemaVersion,
		OrderID:       targetOrderID,
		Status:        status,
		CanceledAt:    canceledAt,
		Provenance: markets.UpstreamProvenance{
			Source:     "polymarket_clob",
			UpstreamID: rec.UnsignedPayload.OrderID,
			ObservedAt: now,
		},
	}
	s.cancelStore.Delete(req.PreviewID)
	s.cancel.idempotency.Put(idempotencyKey, bodyHash, httpStatusCancelOK, resp)
	return resp, httpStatusCancelOK, nil
}

func validateCancelRequest(req CancelRequest) error {
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

func mapCancelUpstreamError(err error) (int, error) {
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
