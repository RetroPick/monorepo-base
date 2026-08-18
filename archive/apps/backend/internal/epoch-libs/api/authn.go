package api

import (
	"errors"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type Principal struct {
	Wallet     string
	IsOperator bool
}

func PrincipalFromRequest(r *http.Request, jwtSecret string) (*Principal, error) {
	if session, err := parseSessionFromRequest(r); err == nil && session != nil {
		return &Principal{
			Wallet:     session.Wallet,
			IsOperator: false,
		}, nil
	}
	auth := strings.TrimSpace(r.Header.Get("Authorization"))
	if auth == "" || !strings.HasPrefix(strings.ToLower(auth), "bearer ") {
		return nil, errors.New("missing bearer token")
	}
	if strings.TrimSpace(jwtSecret) == "" {
		return nil, errors.New("jwt secret not configured")
	}
	tokenString := strings.TrimSpace(auth[len("Bearer "):])
	claims := jwt.MapClaims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (any, error) {
		if token.Method.Alg() != jwt.SigningMethodHS256.Alg() {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(jwtSecret), nil
	})
	if err != nil || token == nil || !token.Valid {
		return nil, errors.New("invalid token")
	}
	sub, _ := claims["sub"].(string)
	sub = strings.ToLower(strings.TrimSpace(sub))
	if !strings.HasPrefix(sub, "0x") || len(sub) != 42 {
		return nil, errors.New("invalid subject wallet")
	}
	isOperator := false
	if role, ok := claims["role"].(string); ok && strings.EqualFold(strings.TrimSpace(role), "operator") {
		isOperator = true
	}
	if op, ok := claims["isOperator"].(bool); ok && op {
		isOperator = true
	}
	return &Principal{
		Wallet:     sub,
		IsOperator: isOperator,
	}, nil
}

func WalletAuthorized(r *http.Request, wallet, jwtSecret string) bool {
	p, err := PrincipalFromRequest(r, jwtSecret)
	if err != nil {
		return false
	}
	return strings.EqualFold(strings.TrimSpace(wallet), p.Wallet)
}

func RequireOperator(next http.Handler, jwtSecret string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p, err := PrincipalFromRequest(r, jwtSecret)
		if err != nil {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}
		if !p.IsOperator {
			http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}
