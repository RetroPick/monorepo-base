package auth

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Session holds authenticated Markets session state.
type Session struct {
	UserID               string
	Wallet               string
	Standing             string
	TermsVersionAccepted string
	ExpiresAt            time.Time
}

type sessionClaims struct {
	UserID               string `json:"sub"`
	Wallet               string `json:"wallet"`
	Standing             string `json:"standing"`
	TermsVersionAccepted string `json:"termsVersion"`
	jwt.RegisteredClaims
}

func (m *Module) issueSessionToken(session Session) (string, error) {
	if strings.TrimSpace(m.cfg.SessionSecret) == "" {
		return "", errors.New("session secret not configured")
	}
	now := m.now().UTC()
	claims := sessionClaims{
		UserID:               session.UserID,
		Wallet:               strings.ToLower(strings.TrimSpace(session.Wallet)),
		Standing:             session.Standing,
		TermsVersionAccepted: session.TermsVersionAccepted,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(session.ExpiresAt),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(m.cfg.SessionSecret))
}

func (m *Module) parseSessionToken(tokenString string) (*Session, error) {
	if strings.TrimSpace(m.cfg.SessionSecret) == "" {
		return nil, errors.New("session secret not configured")
	}
	tokenString = strings.TrimSpace(tokenString)
	if tokenString == "" {
		return nil, errors.New("missing session token")
	}

	claims := &sessionClaims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (any, error) {
		if token.Method.Alg() != jwt.SigningMethodHS256.Alg() {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return []byte(m.cfg.SessionSecret), nil
	})
	if err != nil || !token.Valid {
		return nil, errors.New("invalid session token")
	}
	if claims.UserID == "" || claims.Wallet == "" {
		return nil, errors.New("invalid session claims")
	}
	expiresAt := time.Time{}
	if claims.ExpiresAt != nil {
		expiresAt = claims.ExpiresAt.Time.UTC()
	}
	if !expiresAt.IsZero() && m.now().UTC().After(expiresAt) {
		return nil, errors.New("session expired")
	}
	return &Session{
		UserID:               claims.UserID,
		Wallet:               strings.ToLower(strings.TrimSpace(claims.Wallet)),
		Standing:             claims.Standing,
		TermsVersionAccepted: claims.TermsVersionAccepted,
		ExpiresAt:            expiresAt,
	}, nil
}

func (m *Module) sessionFromRequest(r *http.Request) (*Session, error) {
	cookie, err := r.Cookie(m.cfg.CookieName)
	if err != nil || strings.TrimSpace(cookie.Value) == "" {
		return nil, errors.New("missing session cookie")
	}
	return m.parseSessionToken(cookie.Value)
}

func (m *Module) setSessionCookie(w http.ResponseWriter, r *http.Request, session Session) error {
	token, err := m.issueSessionToken(session)
	if err != nil {
		return err
	}
	csrf, err := randomToken(24)
	if err != nil {
		return err
	}
	now := m.now().UTC()
	maxAge := int(m.cfg.AccessTTL.Seconds())
	if maxAge < 1 {
		maxAge = int(defaultAccessTTL.Seconds())
	}
	setCookie := func(name, value string, httpOnly bool) {
		http.SetCookie(w, &http.Cookie{
			Name:     name,
			Value:    value,
			Path:     "/",
			Domain:   m.cfg.CookieDomain,
			HttpOnly: httpOnly,
			Secure:   m.cookieSecure(r),
			SameSite: m.cookieSameSite(),
			MaxAge:   maxAge,
			Expires:  now.Add(time.Duration(maxAge) * time.Second),
		})
	}
	setCookie(m.cfg.CookieName, token, true)
	setCookie(m.cfg.CSRFCookieName, csrf, false)
	return nil
}

func (m *Module) clearSessionCookies(w http.ResponseWriter, r *http.Request) {
	expired := time.Unix(0, 0).UTC()
	for _, pair := range []struct {
		name     string
		httpOnly bool
	}{
		{m.cfg.CookieName, true},
		{m.cfg.CSRFCookieName, false},
	} {
		http.SetCookie(w, &http.Cookie{
			Name:     pair.name,
			Value:    "",
			Path:     "/",
			Domain:   m.cfg.CookieDomain,
			HttpOnly: pair.httpOnly,
			Secure:   m.cookieSecure(r),
			SameSite: m.cookieSameSite(),
			MaxAge:   -1,
			Expires:  expired,
		})
	}
}

func (m *Module) cookieSecure(r *http.Request) bool {
	if m.cfg.CookieSecure {
		return true
	}
	if r != nil && r.TLS != nil {
		return true
	}
	return false
}

func (m *Module) cookieSameSite() http.SameSite {
	switch strings.ToLower(strings.TrimSpace(m.cfg.CookieSameSite)) {
	case "strict":
		return http.SameSiteStrictMode
	case "none":
		return http.SameSiteNoneMode
	default:
		return http.SameSiteLaxMode
	}
}

func randomToken(size int) (string, error) {
	buf := make([]byte, size)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}
