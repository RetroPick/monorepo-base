package auth

import (
	"context"

	"retropick/apps/backend/internal/markets/eligibility"
)

type contextKey string

const (
	sessionContextKey contextKey = "markets_auth_session"
	accountContextKey contextKey = "markets_auth_account"
)

// SessionFromContext returns the authenticated session when present.
func SessionFromContext(ctx context.Context) (*Session, bool) {
	if ctx == nil {
		return nil, false
	}
	v := ctx.Value(sessionContextKey)
	session, ok := v.(*Session)
	return session, ok && session != nil
}

// AccountFromContext returns eligibility account context when session is loaded.
func AccountFromContext(ctx context.Context) *eligibility.AccountContext {
	if ctx == nil {
		return nil
	}
	v := ctx.Value(accountContextKey)
	account, ok := v.(*eligibility.AccountContext)
	if !ok || account == nil {
		return nil
	}
	return account
}

func withSession(ctx context.Context, session *Session) context.Context {
	return context.WithValue(ctx, sessionContextKey, session)
}

func withAccount(ctx context.Context, account *eligibility.AccountContext) context.Context {
	return context.WithValue(ctx, accountContextKey, account)
}
