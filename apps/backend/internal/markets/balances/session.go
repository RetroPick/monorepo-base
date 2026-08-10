package balances

import (
	"net/http"

	"retropick/apps/backend/internal/markets/wallet"
)

// SessionContext carries authenticated user identity for balance reads.
type SessionContext = wallet.SessionContext

// SessionResolver extracts session context from an HTTP request.
type SessionResolver interface {
	ResolveSession(r *http.Request) (SessionContext, error)
}

// UnauthenticatedResolver is the production default until session middleware lands.
type UnauthenticatedResolver struct{}

func (UnauthenticatedResolver) ResolveSession(*http.Request) (SessionContext, error) {
	return SessionContext{}, ErrUnauthorized
}
