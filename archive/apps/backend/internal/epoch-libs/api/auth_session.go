package api

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
)

const (
	sessionCookieName = "rp_session"
	csrfCookieName    = "rp_csrf"
	csrfHeaderName    = "X-CSRF-Token"
)

type signedAuthPayload struct {
	Wallet    string `json:"wallet"`
	Nonce     string `json:"nonce,omitempty"`
	IssuedAt  int64  `json:"issuedAt"`
	ExpiresAt int64  `json:"expiresAt"`
}

type SessionState struct {
	Wallet    string
	ExpiresAt time.Time
}

func authSameSite(mode string) http.SameSite {
	switch strings.ToLower(strings.TrimSpace(mode)) {
	case "strict":
		return http.SameSiteStrictMode
	case "none":
		return http.SameSiteNoneMode
	default:
		return http.SameSiteLaxMode
	}
}

func authCookieSecure(r *http.Request, cfg AuthConfig) bool {
	if cfg.CookieSecure {
		return true
	}
	if r == nil || r.TLS == nil {
		return false
	}
	return true
}

func signAuthBlob(secret string, payload signedAuthPayload) (string, error) {
	if strings.TrimSpace(secret) == "" {
		return "", errors.New("auth session secret not configured")
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	body := base64.RawURLEncoding.EncodeToString(raw)
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(body))
	sig := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	return body + "." + sig, nil
}

func verifyAuthBlob(secret, token string) (*signedAuthPayload, error) {
	if strings.TrimSpace(secret) == "" {
		return nil, errors.New("auth session secret not configured")
	}
	body, sig, ok := strings.Cut(strings.TrimSpace(token), ".")
	if !ok || body == "" || sig == "" {
		return nil, errors.New("invalid auth token")
	}
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(body))
	want := mac.Sum(nil)
	got, err := base64.RawURLEncoding.DecodeString(sig)
	if err != nil || !hmac.Equal(got, want) {
		return nil, errors.New("invalid auth token signature")
	}
	raw, err := base64.RawURLEncoding.DecodeString(body)
	if err != nil {
		return nil, errors.New("invalid auth token body")
	}
	var payload signedAuthPayload
	if err := json.Unmarshal(raw, &payload); err != nil {
		return nil, errors.New("invalid auth token payload")
	}
	if payload.Wallet == "" {
		return nil, errors.New("missing session wallet")
	}
	expiresAt := time.Unix(payload.ExpiresAt, 0)
	if time.Now().UTC().After(expiresAt) {
		return nil, errors.New("auth token expired")
	}
	return &payload, nil
}

func issueSignedNonce(wallet string, now time.Time, cfg AuthConfig) (token string, nonce string, err error) {
	nonceBytes := make([]byte, 16)
	if _, err = rand.Read(nonceBytes); err != nil {
		return "", "", err
	}
	nonce = hex.EncodeToString(nonceBytes)
	payload := signedAuthPayload{
		Wallet:    strings.ToLower(strings.TrimSpace(wallet)),
		Nonce:     nonce,
		IssuedAt:  now.Unix(),
		ExpiresAt: now.Add(cfg.NonceTTL).Unix(),
	}
	token, err = signAuthBlob(cfg.SessionSecret, payload)
	return token, nonce, err
}

func parseSessionFromRequest(r *http.Request) (*SessionState, error) {
	cfg := authConfigFromContext(r)
	cookie, err := r.Cookie(sessionCookieName)
	if err != nil || strings.TrimSpace(cookie.Value) == "" {
		return nil, errors.New("missing session cookie")
	}
	payload, err := verifyAuthBlob(cfg.SessionSecret, cookie.Value)
	if err != nil {
		return nil, err
	}
	return &SessionState{
		Wallet:    strings.ToLower(strings.TrimSpace(payload.Wallet)),
		ExpiresAt: time.Unix(payload.ExpiresAt, 0).UTC(),
	}, nil
}

func issueSessionCookie(w http.ResponseWriter, r *http.Request, wallet string) error {
	cfg := authConfigFromContext(r)
	now := time.Now().UTC()
	payload := signedAuthPayload{
		Wallet:    strings.ToLower(strings.TrimSpace(wallet)),
		IssuedAt:  now.Unix(),
		ExpiresAt: now.Add(cfg.SessionTTL).Unix(),
	}
	token, err := signAuthBlob(cfg.SessionSecret, payload)
	if err != nil {
		return err
	}
	csrf, err := randomToken(24)
	if err != nil {
		return err
	}
	setCookie := func(name, value string, httpOnly bool, maxAge int) {
		http.SetCookie(w, &http.Cookie{
			Name:     name,
			Value:    value,
			Path:     "/",
			Domain:   cfg.CookieDomain,
			HttpOnly: httpOnly,
			Secure:   authCookieSecure(r, cfg),
			SameSite: authSameSite(cfg.CookieSameSite),
			MaxAge:   maxAge,
			Expires:  now.Add(time.Duration(maxAge) * time.Second),
		})
	}
	setCookie(sessionCookieName, token, true, int(cfg.SessionTTL.Seconds()))
	setCookie(csrfCookieName, csrf, false, int(cfg.SessionTTL.Seconds()))
	return nil
}

func clearSessionCookies(w http.ResponseWriter, r *http.Request) {
	cfg := authConfigFromContext(r)
	expired := time.Unix(0, 0).UTC()
	for _, name := range []string{sessionCookieName, csrfCookieName} {
		http.SetCookie(w, &http.Cookie{
			Name:     name,
			Value:    "",
			Path:     "/",
			Domain:   cfg.CookieDomain,
			HttpOnly: name == sessionCookieName,
			Secure:   authCookieSecure(r, cfg),
			SameSite: authSameSite(cfg.CookieSameSite),
			MaxAge:   -1,
			Expires:  expired,
		})
	}
}

func requireCSRFSameOrigin(r *http.Request) error {
	if r == nil {
		return errors.New("missing request")
	}
	switch r.Method {
	case http.MethodGet, http.MethodHead, http.MethodOptions:
		return nil
	}
	headerToken := strings.TrimSpace(r.Header.Get(csrfHeaderName))
	cookie, err := r.Cookie(csrfCookieName)
	if err != nil || strings.TrimSpace(cookie.Value) == "" {
		return errors.New("missing csrf cookie")
	}
	if headerToken == "" || cookie.Value != headerToken {
		return errors.New("csrf token mismatch")
	}
	origin := strings.TrimSpace(r.Header.Get("Origin"))
	if origin == "" {
		return nil
	}
	allow := BuildCORSAllowOriginFunc()
	if !allow(r, origin) {
		return fmt.Errorf("origin not allowed")
	}
	return nil
}

func randomToken(size int) (string, error) {
	buf := make([]byte, size)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}
