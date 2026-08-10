package wallet

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"retropick/apps/backend/internal/platform/httpx"
)

// HandlerConfig wires wallet discovery HTTP endpoints.
type HandlerConfig struct {
	Discoverer *Discoverer
	Sessions   SessionResolver
	Linker     AccountLinker
}

// Handler serves account-wallet discovery routes.
type Handler struct {
	discoverer *Discoverer
	sessions   SessionResolver
	linker     *Linker
}

// NewHandler builds a wallet HTTP handler.
func NewHandler(cfg HandlerConfig) *Handler {
	disc := cfg.Discoverer
	if disc == nil {
		disc = DefaultDiscoverer()
	}
	sessions := cfg.Sessions
	if sessions == nil {
		sessions = UnauthenticatedResolver{}
	}
	var linker *Linker
	if cfg.Linker != nil {
		linker = NewLinker(cfg.Linker)
	}
	return &Handler{discoverer: disc, sessions: sessions, linker: linker}
}

// RegisterRoutes mounts wallet discovery routes on the parent router.
func RegisterRoutes(r chi.Router, cfg HandlerConfig) {
	h := NewHandler(cfg)
	r.Get("/wallets", h.ListMyWallets)
	r.Post("/wallets/link", h.LinkExistingWallet)
}

// RegisterAccountWalletRoutes mounts deposit-wallet preview/relay routes.
func RegisterAccountWalletRoutes(r chi.Router, cfg HandlerConfig) {
	h := NewHandler(cfg)
	r.Post("/preview", h.PreviewAccountWallet)
	r.Post("/relay", h.RelayAccountWallet)
}

// ListMyWallets handles GET /api/v1/markets/me/wallets (listMyWallets).
func (h *Handler) ListMyWallets(w http.ResponseWriter, r *http.Request) {
	session, err := h.sessions.ResolveSession(r)
	if err != nil {
		writeWalletError(w, r, err)
		return
	}

	body, err := h.discoverer.ListWallets(r.Context(), session)
	if err != nil {
		writeWalletError(w, r, err)
		return
	}

	w.Header().Set("Cache-Control", "private, no-store")
	httpx.JSON(w, http.StatusOK, body)
}

// LinkExistingWallet handles POST /api/v1/markets/me/wallets/link.
func (h *Handler) LinkExistingWallet(w http.ResponseWriter, r *http.Request) {
	session, err := h.sessions.ResolveSession(r)
	if err != nil {
		writeWalletError(w, r, err)
		return
	}
	if h.linker == nil {
		writeWalletError(w, r, ErrLinkerUnwired)
		return
	}

	var req LinkExistingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeWalletError(w, r, ErrInvalidRequest)
		return
	}

	wallet, err := h.linker.LinkExisting(r.Context(), session, req)
	if err != nil {
		writeWalletError(w, r, err)
		return
	}

	w.Header().Set("Cache-Control", "private, no-store")
	httpx.JSON(w, http.StatusOK, wallet)
}

// PreviewAccountWallet handles POST /api/v1/markets/account-wallet/preview.
func (h *Handler) PreviewAccountWallet(w http.ResponseWriter, r *http.Request) {
	session, err := h.sessions.ResolveSession(r)
	if err != nil {
		writeWalletError(w, r, err)
		return
	}
	if h.linker == nil {
		writeWalletError(w, r, ErrLinkerUnwired)
		return
	}

	var req AccountWalletPreviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeWalletError(w, r, ErrInvalidRequest)
		return
	}

	body, err := h.linker.PreviewAccountWallet(session, req)
	if err != nil {
		writeWalletError(w, r, err)
		return
	}

	w.Header().Set("Cache-Control", "private, no-store")
	httpx.JSON(w, http.StatusOK, body)
}

// RelayAccountWallet handles POST /api/v1/markets/account-wallet/relay.
func (h *Handler) RelayAccountWallet(w http.ResponseWriter, r *http.Request) {
	session, err := h.sessions.ResolveSession(r)
	if err != nil {
		writeWalletError(w, r, err)
		return
	}
	if h.linker == nil {
		writeWalletError(w, r, ErrLinkerUnwired)
		return
	}

	var req AccountWalletRelayRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeWalletError(w, r, ErrInvalidRequest)
		return
	}

	body, err := h.linker.RelayAccountWallet(r.Context(), session, req)
	if err != nil {
		writeWalletError(w, r, err)
		return
	}

	w.Header().Set("Cache-Control", "private, no-store")
	httpx.JSON(w, http.StatusOK, body)
}

func writeWalletError(w http.ResponseWriter, r *http.Request, err error) {
	status := http.StatusInternalServerError
	code := "internal_error"
	message := "request failed"

	switch {
	case errors.Is(err, ErrUnauthorized):
		status = http.StatusUnauthorized
		code = "unauthorized"
		message = "authentication required"
	case errors.Is(err, ErrInvalidAddress), errors.Is(err, ErrInvalidRequest):
		status = http.StatusBadRequest
		code = "invalid_request"
		message = "invalid wallet address"
	case errors.Is(err, ErrLinkerUnwired):
		status = http.StatusServiceUnavailable
		code = "service_unavailable"
		message = "wallet linking is not configured"
	case errors.Is(err, ErrConflict):
		status = http.StatusConflict
		code = "conflict"
		message = "wallet linkage conflict"
	}

	httpx.JSON(w, status, ErrorResponse{Error: APIError{
		Code:      code,
		Message:   message,
		RequestID: middleware.GetReqID(r.Context()),
	}})
}
