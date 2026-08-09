package wallet

import (
	"errors"
	"net/http"
)

// ErrUnauthorized indicates no valid Markets session was resolved.
var ErrUnauthorized = errors.New("unauthorized")

// SessionContext carries authenticated user identity for wallet discovery.
type SessionContext struct {
	UserID        string
	SignerAddress string // normalized lowercase 0x
}

// SessionResolver extracts session context from an HTTP request.
// Production wiring uses ContextSessionResolver (reads auth.OptionalSession context).
type SessionResolver interface {
	ResolveSession(r *http.Request) (SessionContext, error)
}

// UnauthenticatedResolver denies all requests; used in tests and as HandlerConfig fallback.
type UnauthenticatedResolver struct{}

func (UnauthenticatedResolver) ResolveSession(*http.Request) (SessionContext, error) {
	return SessionContext{}, ErrUnauthorized
}
