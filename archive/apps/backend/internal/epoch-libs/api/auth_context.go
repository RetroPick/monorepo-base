package api

import (
	"context"
	"net/http"
	"time"
)

type authContextKey string

const authSecretContextKey authContextKey = "auth_jwt_secret"
const authConfigContextKey authContextKey = "auth_config"

type AuthConfig struct {
	JWTSecret      string
	SessionSecret  string
	SessionTTL     time.Duration
	NonceTTL       time.Duration
	CookieDomain   string
	CookieSecure   bool
	CookieSameSite string
}

func WithAuthSecret(r *http.Request, secret string) *http.Request {
	ctx := r.Context()
	return r.WithContext(context.WithValue(ctx, authSecretContextKey, secret))
}

func WithAuthConfig(r *http.Request, cfg AuthConfig) *http.Request {
	ctx := context.WithValue(r.Context(), authConfigContextKey, cfg)
	ctx = context.WithValue(ctx, authSecretContextKey, cfg.JWTSecret)
	return r.WithContext(ctx)
}

func authSecretFromContext(r *http.Request) string {
	if r == nil {
		return ""
	}
	v := r.Context().Value(authSecretContextKey)
	s, _ := v.(string)
	return s
}

func authConfigFromContext(r *http.Request) AuthConfig {
	if r == nil {
		return AuthConfig{}
	}
	v := r.Context().Value(authConfigContextKey)
	cfg, _ := v.(AuthConfig)
	return cfg
}
