package markets

import (
	"net/http"
	"strconv"

	"retropick/apps/backend/internal/platform/httpx"
)

// Handler serves Markets BFF HTTP endpoints.
type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) Eligibility(w http.ResponseWriter, r *http.Request) {
	httpx.JSON(w, http.StatusOK, h.svc.Eligibility(r.Context()))
}

func (h *Handler) Capabilities(w http.ResponseWriter, r *http.Request) {
	httpx.JSON(w, http.StatusOK, h.svc.Capabilities(r.Context()))
}

func (h *Handler) ListEvents(w http.ResponseWriter, r *http.Request) {
	cursor := r.URL.Query().Get("cursor")
	limit := defaultPageSize
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if v, err := strconv.Atoi(raw); err == nil {
			limit = v
		}
	}

	body, err := h.svc.ListEvents(r.Context(), cursor, limit)
	if err != nil {
		http.Error(w, `{"error":"catalog_unavailable"}`, http.StatusBadGateway)
		return
	}
	httpx.JSON(w, http.StatusOK, body)
}
