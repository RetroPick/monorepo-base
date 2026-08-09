package wallet

import (
	"net/http"

	"retropick/apps/backend/internal/markets/auth"
)

// ContextSessionResolver reads session identity from request context populated
// by auth.OptionalSession middleware. It does not re-parse cookies or trust
// client-supplied identity headers.
type ContextSessionResolver struct{}

func (ContextSessionResolver) ResolveSession(r *http.Request) (SessionContext, error) {
	session, ok := auth.SessionFromContext(r.Context())
	if !ok || session == nil {
		return SessionContext{}, ErrUnauthorized
	}
	return SessionContext{
		UserID:        session.UserID,
		SignerAddress: session.Wallet,
	}, nil
}
