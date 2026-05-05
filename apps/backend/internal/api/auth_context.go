package api

import (
	"context"
	"net/http"
)

type authContextKey string

const authSecretContextKey authContextKey = "auth_jwt_secret"

func WithAuthSecret(r *http.Request, secret string) *http.Request {
	ctx := r.Context()
	return r.WithContext(context.WithValue(ctx, authSecretContextKey, secret))
}

func authSecretFromContext(r *http.Request) string {
	if r == nil {
		return ""
	}
	v := r.Context().Value(authSecretContextKey)
	s, _ := v.(string)
	return s
}
