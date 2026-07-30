package markets

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

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
	setReadCacheHeaders(w)
	httpx.JSON(w, http.StatusOK, h.svc.Eligibility(r.Context()))
}

func (h *Handler) Capabilities(w http.ResponseWriter, r *http.Request) {
	setReadCacheHeaders(w)
	httpx.JSON(w, http.StatusOK, h.svc.Capabilities(r.Context()))
}

func (h *Handler) ListEvents(w http.ResponseWriter, r *http.Request) {
	cursor := r.URL.Query().Get("cursor")
	limit, err := requestLimit(r)
	if err != nil {
		writeServiceError(w, r, err)
		return
	}

	body, err := h.svc.ListEvents(r.Context(), cursor, limit)
	if err != nil {
		writeServiceError(w, r, err)
		return
	}
	etag := computeEventsETag(body)
	w.Header().Set("ETag", etag)
	if etagMatches(r.Header.Get("If-None-Match"), etag) {
		setReadCacheHeaders(w)
		w.WriteHeader(http.StatusNotModified)
		return
	}
	setReadCacheHeaders(w)
	httpx.JSON(w, http.StatusOK, body)
}

func (h *Handler) GetEvent(w http.ResponseWriter, r *http.Request) {
	body, err := h.svc.GetEvent(r.Context(), chi.URLParam(r, "eventID"))
	if err != nil {
		writeServiceError(w, r, err)
		return
	}
	setReadCacheHeaders(w)
	httpx.JSON(w, http.StatusOK, body)
}

func (h *Handler) GetMarket(w http.ResponseWriter, r *http.Request) {
	body, err := h.svc.GetMarket(r.Context(), chi.URLParam(r, "marketID"))
	if err != nil {
		writeServiceError(w, r, err)
		return
	}
	setReadCacheHeaders(w)
	httpx.JSON(w, http.StatusOK, body)
}

func (h *Handler) GetOrderBook(w http.ResponseWriter, r *http.Request) {
	body, err := h.svc.GetOrderBook(
		r.Context(),
		chi.URLParam(r, "marketID"),
		strings.TrimSpace(r.URL.Query().Get("tokenId")),
	)
	if err != nil {
		writeServiceError(w, r, err)
		return
	}
	setReadCacheHeaders(w)
	httpx.JSON(w, http.StatusOK, body)
}

func (h *Handler) GetHistory(w http.ResponseWriter, r *http.Request) {
	interval := strings.TrimSpace(r.URL.Query().Get("interval"))
	if interval == "" {
		interval = "1d"
	}
	fidelity := 60
	if raw := strings.TrimSpace(r.URL.Query().Get("fidelity")); raw != "" {
		value, err := strconv.Atoi(raw)
		if err != nil {
			writeServiceError(w, r, ErrInvalidArgument)
			return
		}
		fidelity = value
	}
	body, err := h.svc.GetHistory(
		r.Context(),
		chi.URLParam(r, "marketID"),
		strings.TrimSpace(r.URL.Query().Get("tokenId")),
		interval,
		fidelity,
	)
	if err != nil {
		writeServiceError(w, r, err)
		return
	}
	setReadCacheHeaders(w)
	httpx.JSON(w, http.StatusOK, body)
}

func (h *Handler) GetHealth(w http.ResponseWriter, r *http.Request) {
	body, err := h.svc.GetHealth(
		r.Context(),
		chi.URLParam(r, "marketID"),
		strings.TrimSpace(r.URL.Query().Get("tokenId")),
	)
	if err != nil {
		writeServiceError(w, r, err)
		return
	}
	setReadCacheHeaders(w)
	httpx.JSON(w, http.StatusOK, body)
}

func (h *Handler) ListSignals(w http.ResponseWriter, r *http.Request) {
	limit, err := requestLimit(r)
	if err != nil {
		writeServiceError(w, r, err)
		return
	}
	body, err := h.svc.ListSignals(
		r.Context(),
		strings.TrimSpace(r.URL.Query().Get("marketId")),
		strings.TrimSpace(r.URL.Query().Get("cursor")),
		limit,
	)
	if err != nil {
		writeServiceError(w, r, err)
		return
	}
	setReadCacheHeaders(w)
	httpx.JSON(w, http.StatusOK, body)
}

func requestLimit(r *http.Request) (int, error) {
	raw := strings.TrimSpace(r.URL.Query().Get("limit"))
	if raw == "" {
		return defaultPageSize, nil
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value < 1 || value > maxPageSize {
		return 0, ErrInvalidArgument
	}
	return value, nil
}

func setReadCacheHeaders(w http.ResponseWriter) {
	w.Header().Set("Cache-Control", "public, max-age=5, stale-if-error=60")
	w.Header().Set("Vary", "Accept-Encoding")
}

func writeServiceError(w http.ResponseWriter, r *http.Request, err error) {
	status := http.StatusInternalServerError
	code := "internal_error"
	message := "request failed"
	switch {
	case errors.Is(err, ErrInvalidArgument):
		status = http.StatusBadRequest
		code = "invalid_request"
		message = "request parameters are invalid"
	case errors.Is(err, ErrNotFound):
		status = http.StatusNotFound
		code = "not_found"
		message = "resource not found"
	case errors.Is(err, ErrUpstreamUnavailable):
		status = http.StatusBadGateway
		code = "upstream_unavailable"
		message = "upstream market data is unavailable"
	case errors.Is(err, ErrDataUnavailable):
		status = http.StatusServiceUnavailable
		code = "data_unavailable"
		message = "market data is unavailable or resynchronizing"
	}
	httpx.JSON(w, status, ErrorResponse{Error: APIError{
		Code:      code,
		Message:   message,
		RequestID: middleware.GetReqID(r.Context()),
	}})
}
