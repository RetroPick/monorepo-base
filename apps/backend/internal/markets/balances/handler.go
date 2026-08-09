package balances

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"retropick/apps/backend/internal/platform/httpx"
)

// HandlerConfig wires balance read HTTP endpoints.
type HandlerConfig struct {
	Reader   *Reader
	Sessions SessionResolver
}

// Handler serves authenticated balance read routes.
type Handler struct {
	reader   *Reader
	sessions SessionResolver
}

// NewHandler builds a balances HTTP handler.
func NewHandler(cfg HandlerConfig) *Handler {
	reader := cfg.Reader
	if reader == nil {
		reader = NewReader(ReaderConfig{})
	}
	sessions := cfg.Sessions
	if sessions == nil {
		sessions = UnauthenticatedResolver{}
	}
	return &Handler{reader: reader, sessions: sessions}
}

// RegisterRoutes mounts balance read routes on the parent router.
func RegisterRoutes(r chi.Router, cfg HandlerConfig) {
	h := NewHandler(cfg)
	r.Get("/balances", h.ListMyBalances)
}

// ListMyBalances handles GET /api/v1/markets/me/balances (listMyBalances).
func (h *Handler) ListMyBalances(w http.ResponseWriter, r *http.Request) {
	session, err := h.sessions.ResolveSession(r)
	if err != nil {
		writeBalanceError(w, r, err)
		return
	}

	body, err := h.reader.ListBalances(r.Context(), session)
	if err != nil {
		writeBalanceError(w, r, err)
		return
	}

	w.Header().Set("Cache-Control", "private, no-store")
	httpx.JSON(w, http.StatusOK, body)
}

func writeBalanceError(w http.ResponseWriter, r *http.Request, err error) {
	status := http.StatusInternalServerError
	code := "internal_error"
	message := "request failed"

	switch {
	case errors.Is(err, ErrUnauthorized):
		status = http.StatusUnauthorized
		code = "unauthorized"
		message = "authentication required"
	case errors.Is(err, ErrAccountNotLinked):
		status = http.StatusNotFound
		code = "account_not_linked"
		message = "no linked account wallet"
	case errors.Is(err, ErrUpstreamUnavailable):
		status = http.StatusBadGateway
		code = "upstream_unavailable"
		message = "venue balance unavailable"
	}

	httpx.JSON(w, status, ErrorResponse{Error: APIError{
		Code:      code,
		Message:   message,
		RequestID: middleware.GetReqID(r.Context()),
	}})
}
