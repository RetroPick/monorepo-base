package api

import (
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common"

	"retropick/apps/backend/internal/ethops"
)

type authNonceRequest struct {
	Wallet string `json:"wallet"`
}

type authVerifyRequest struct {
	Wallet    string `json:"wallet"`
	Message   string `json:"message"`
	Signature string `json:"signature"`
	Challenge string `json:"challenge"`
}

func AuthRouter() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/nonce", authNonceHandler)
	mux.HandleFunc("/verify", authVerifyHandler)
	mux.HandleFunc("/session", authSessionHandler)
	mux.HandleFunc("/logout", authLogoutHandler)
	return mux
}

func authNonceHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeAPIError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed", nil)
		return
	}
	var body authNonceRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeAPIError(w, http.StatusBadRequest, "INVALID_JSON", "invalid json", nil)
		return
	}
	wallet := strings.ToLower(strings.TrimSpace(body.Wallet))
	if !common.IsHexAddress(wallet) {
		writeAPIError(w, http.StatusBadRequest, "INVALID_WALLET", "invalid wallet", nil)
		return
	}
	cfg := authConfigFromContext(r)
	token, nonce, err := issueSignedNonce(wallet, time.Now().UTC(), cfg)
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, "AUTH_CONFIG_ERROR", err.Error(), nil)
		return
	}
	message := walletSignInMessage(wallet, nonce, cfg.NonceTTL)
	writeJSON(w, http.StatusOK, map[string]any{
		"wallet":    wallet,
		"message":   message,
		"challenge": token,
		"expiresIn": int(cfg.NonceTTL.Seconds()),
	})
}

func authVerifyHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeAPIError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed", nil)
		return
	}
	if origin := strings.TrimSpace(r.Header.Get("Origin")); origin != "" && !BuildCORSAllowOriginFunc()(r, origin) {
		writeAPIError(w, http.StatusForbidden, "ORIGIN_NOT_ALLOWED", "origin not allowed", nil)
		return
	}
	var body authVerifyRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeAPIError(w, http.StatusBadRequest, "INVALID_JSON", "invalid json", nil)
		return
	}
	wallet := strings.ToLower(strings.TrimSpace(body.Wallet))
	if !common.IsHexAddress(wallet) {
		writeAPIError(w, http.StatusBadRequest, "INVALID_WALLET", "invalid wallet", nil)
		return
	}
	cfg := authConfigFromContext(r)
	payload, err := verifyAuthBlob(cfg.SessionSecret, body.Challenge)
	if err != nil {
		writeAPIError(w, http.StatusUnauthorized, "INVALID_CHALLENGE", "challenge expired or invalid", nil)
		return
	}
	if !strings.EqualFold(payload.Wallet, wallet) {
		writeAPIError(w, http.StatusUnauthorized, "WALLET_MISMATCH", "wallet does not match challenge", nil)
		return
	}
	expected := walletSignInMessage(wallet, payload.Nonce, time.Duration(payload.ExpiresAt-payload.IssuedAt)*time.Second)
	if strings.TrimSpace(body.Message) != expected {
		writeAPIError(w, http.StatusUnauthorized, "MESSAGE_MISMATCH", "message does not match challenge", nil)
		return
	}
	sigHex := strings.TrimSpace(body.Signature)
	sigHex = strings.TrimPrefix(sigHex, "0x")
	sig, err := hex.DecodeString(sigHex)
	if err != nil || !ethops.VerifyPersonalSign(common.HexToAddress(wallet), []byte(expected), sig) {
		writeAPIError(w, http.StatusUnauthorized, "INVALID_SIGNATURE", "signature verification failed", nil)
		return
	}
	if err := issueSessionCookie(w, r, wallet); err != nil {
		writeAPIError(w, http.StatusInternalServerError, "SESSION_ISSUE_FAILED", err.Error(), nil)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"authenticated": true,
		"wallet":        wallet,
	})
}

func authSessionHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeAPIError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed", nil)
		return
	}
	session, err := parseSessionFromRequest(r)
	if err != nil {
		writeAPIError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "no active session", nil)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"authenticated": true,
		"wallet":        session.Wallet,
		"expiresAt":     session.ExpiresAt.Format(time.RFC3339),
	})
}

func authLogoutHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeAPIError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed", nil)
		return
	}
	if err := requireCSRFSameOrigin(r); err != nil {
		writeAPIError(w, http.StatusForbidden, "CSRF_REJECTED", err.Error(), nil)
		return
	}
	clearSessionCookies(w, r)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func walletSignInMessage(wallet, nonce string, ttl time.Duration) string {
	if ttl <= 0 {
		ttl = 10 * time.Minute
	}
	return strings.Join([]string{
		"RetroPick wallet sign-in",
		"",
		"Wallet: " + strings.ToLower(strings.TrimSpace(wallet)),
		"Nonce: " + nonce,
		"Version: 1",
		"Expires In Seconds: " + strconv.FormatInt(int64(ttl.Seconds()), 10),
	}, "\n")
}
