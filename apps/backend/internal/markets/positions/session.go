package positions

import (
	"net/http"

	"retropick/apps/backend/internal/markets/wallet"
)

// SessionContext carries authenticated user identity for position reads.
type SessionContext = wallet.SessionContext

// SessionResolver extracts session context from an HTTP request.
type SessionResolver interface {
	ResolveSession(r *http.Request) (SessionContext, error)
}

// UnauthenticatedResolver fails closed when session middleware is unwired.
type UnauthenticatedResolver struct{}

func (UnauthenticatedResolver) ResolveSession(*http.Request) (SessionContext, error) {
	return SessionContext{}, ErrUnauthorized
}

// FillSource optionally seeds empty projections from fill history (read-only).
type FillSource interface {
	ListFillSnapshots(userID string) []FillSnapshot
}
