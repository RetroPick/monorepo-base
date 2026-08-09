package orders

import "errors"

var (
	ErrUnauthorized          = errors.New("unauthorized")
	ErrInvalidRequest        = errors.New("invalid request")
	ErrMarketNotFound        = errors.New("market not found")
	ErrTokenNotInCatalog     = errors.New("token not in catalog")
	ErrMakerNotLinked        = errors.New("maker not linked")
	ErrTickSizeViolation     = errors.New("tick size violation")
	ErrMinSizeViolation      = errors.New("min size violation")
	ErrUpstreamUnavailable   = errors.New("upstream unavailable")
	ErrIntegrityMismatch     = errors.New("integrity mismatch")
	ErrPreviewExpired        = errors.New("preview expired")
	ErrPreviewNotFound       = errors.New("preview not found")
	ErrCapabilityDisabled    = errors.New("capability disabled")
	ErrMissingIdempotencyKey = errors.New("missing idempotency key")
	ErrIdempotencyConflict   = errors.New("idempotency conflict")
	ErrOrderNotFound         = errors.New("order not found")
	ErrOrderNotOwned         = errors.New("order not owned")
	ErrOrderNotCancelable    = errors.New("order not cancelable")
	ErrAccountNotLinked          = errors.New("account not linked")
	ErrExchangeRoutingConflict   = errors.New("exchange routing conflict")
)
