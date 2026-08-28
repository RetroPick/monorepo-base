package realtime

import (
	"errors"

	"retropick/apps/backend/internal/markets/postgres"
)

var (
	ErrInvalidCatalogToken    = errors.New("invalid catalog token")
	ErrValidationUnavailable = errors.New("validation unavailable")
)

// SubscribeErrorCode maps validation failures to AsyncAPI control error codes.
func SubscribeErrorCode(err error) string {
	if err == nil {
		return "validation_unavailable"
	}
	if errors.Is(err, ErrInvalidCatalogToken) || errors.Is(err, postgres.ErrTokenNotInCatalog) {
		return "invalid_token"
	}
	return "validation_unavailable"
}
