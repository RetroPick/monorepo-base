package positions

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"retropick/apps/backend/internal/platform/httpx"
)

// HandlerConfig wires position HTTP endpoints.
type HandlerConfig struct {
	Reader   *Reader
	Sessions SessionResolver
}

// Handler serves position read routes.
type Handler struct {
	reader   *Reader
	sessions SessionResolver
}

// NewHandler builds a positions HTTP handler.
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

// RegisterMeRoutes mounts authenticated position list routes under /me.
func RegisterMeRoutes(r chi.Router, cfg HandlerConfig) {
	h := NewHandler(cfg)
	r.Get("/positions", h.ListMyPositions)
}

// ListMyPositions handles GET /api/v1/markets/me/positions.
func (h *Handler) ListMyPositions(w http.ResponseWriter, r *http.Request) {
	session, err := h.sessions.ResolveSession(r)
	if err != nil {
		writePositionError(w, r, err)
		return
	}

	body, err := h.reader.ListPositions(r.Context(), session)
	if err != nil {
		writePositionError(w, r, err)
		return
	}

	w.Header().Set("Cache-Control", "private, no-store")
	httpx.JSON(w, http.StatusOK, body)
}

func writePositionError(w http.ResponseWriter, r *http.Request, err error) {
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
		message = "venue positions unavailable"
	}

	httpx.JSON(w, status, ErrorResponse{Error: APIError{
		Code:      code,
		Message:   message,
		RequestID: middleware.GetReqID(r.Context()),
	}})
}
