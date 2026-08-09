package auth

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	siwe "github.com/spruceid/siwe-go"

	"retropick/apps/backend/internal/markets/eligibility"
	"retropick/apps/backend/internal/platform/httpx"
)

type siweRequest struct {
	Message   string `json:"message"`
	Signature string `json:"signature"`
}

// RegisterRoutes mounts Markets auth endpoints on the parent router.
func (m *Module) RegisterRoutes(r chiRouter) {
	r.Get("/api/v1/markets/auth/nonce", m.handleNonce)
	r.Post("/api/v1/markets/auth/siwe", m.handleSIWE)
	r.Get("/api/v1/markets/auth/session", m.handleSession)
	r.Post("/api/v1/markets/auth/logout", m.handleLogout)
}

type chiRouter interface {
	Get(pattern string, h http.HandlerFunc)
	Post(pattern string, h http.HandlerFunc)
}

func (m *Module) handleNonce(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeAuthError(w, r, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
	ip := eligibility.ClientIPFromRequest(r, m.ipTrust)
	if !m.limiter.Allow("nonce:" + ip) {
		writeAuthError(w, r, http.StatusTooManyRequests, "RATE_LIMITED", "too many auth requests")
		return
	}
	nonce, ttl, err := m.nonces.Issue()
	if err != nil {
		writeAuthError(w, r, http.StatusInternalServerError, "NONCE_ISSUE_FAILED", "could not issue nonce")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"nonce":     nonce,
		"expiresIn": int(ttl.Seconds()),
		"chainId":   m.cfg.ChainID,
	})
}

func (m *Module) handleSIWE(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeAuthError(w, r, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
	ip := eligibility.ClientIPFromRequest(r, m.ipTrust)
	if !m.limiter.Allow("siwe:" + ip) {
		writeAuthError(w, r, http.StatusTooManyRequests, "RATE_LIMITED", "too many auth requests")
		return
	}

	var body siweRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeAuthError(w, r, http.StatusBadRequest, "INVALID_JSON", "invalid json")
		return
	}

	msg, err := siwe.ParseMessage(strings.TrimSpace(body.Message))
	if err != nil {
		writeAuthError(w, r, http.StatusUnauthorized, "INVALID_SIWE", "invalid siwe message")
		return
	}
	if !m.nonces.Consume(msg.GetNonce()) {
		writeAuthError(w, r, http.StatusUnauthorized, "INVALID_NONCE", "nonce expired or invalid")
		return
	}

	wallet, err := VerifySIWE(m.cfg, body.Message, body.Signature, msg.GetNonce())
	if err != nil {
		writeAuthError(w, r, http.StatusUnauthorized, "INVALID_SIGNATURE", "signature verification failed")
		return
	}

	user, err := m.users.GetOrCreate(r.Context(), wallet.Hex())
	if err != nil {
		writeAuthError(w, r, http.StatusInternalServerError, "USER_LOOKUP_FAILED", "could not resolve user")
		return
	}

	expiresAt := m.nowUTC().Add(m.cfg.AccessTTL)
	session := Session{
		UserID:               user.UserID,
		Wallet:               user.Wallet,
		Standing:             string(user.Standing),
		TermsVersionAccepted: user.TermsVersionAccepted,
		ExpiresAt:            expiresAt,
	}
	if err := m.setSessionCookie(w, r, session); err != nil {
		writeAuthError(w, r, http.StatusInternalServerError, "SESSION_ISSUE_FAILED", "could not issue session")
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]any{
		"authenticated": true,
		"wallet":        user.Wallet,
		"expiresAt":     expiresAt.Format(time.RFC3339),
	})
}

func (m *Module) handleSession(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeAuthError(w, r, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
	session, err := m.sessionFromRequest(r)
	if err != nil {
		writeAuthError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "no active session")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"authenticated": true,
		"wallet":        session.Wallet,
		"expiresAt":     session.ExpiresAt.Format(time.RFC3339),
	})
}

func (m *Module) handleLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeAuthError(w, r, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
	if err := m.requireCSRFSameOrigin(r); err != nil {
		writeAuthError(w, r, http.StatusForbidden, "CSRF_REJECTED", err.Error())
		return
	}
	m.clearSessionCookies(w, r)
	httpx.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

// ParseCORSOrigins returns allowed browser origins for Markets auth cookies.
func ParseCORSOrigins(raw string) []string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return []string{"http://localhost:3001"}
	}
	return parseCSV(raw)
}

// FormatChainID returns the configured chain id as a decimal string for clients.
func (m *Module) FormatChainID() string {
	return strconv.FormatInt(m.cfg.ChainID, 10)
}
