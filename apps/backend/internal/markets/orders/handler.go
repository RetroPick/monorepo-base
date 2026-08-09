package orders

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"retropick/apps/backend/internal/markets/wallet"
	"retropick/apps/backend/internal/platform/httpx"
)

const idempotencyHeader = "Idempotency-Key"

// HandlerConfig wires order HTTP endpoints.
type HandlerConfig struct {
	Service  *Service
	Sessions wallet.SessionResolver
}

// Handler serves order preview and submit routes.
type Handler struct {
	service  *Service
	sessions wallet.SessionResolver
}

// NewHandler builds an orders HTTP handler.
func NewHandler(cfg HandlerConfig) *Handler {
	svc := cfg.Service
	if svc == nil {
		svc = NewService(ServiceConfig{})
	}
	sessions := cfg.Sessions
	if sessions == nil {
		sessions = wallet.UnauthenticatedResolver{}
	}
	return &Handler{service: svc, sessions: sessions}
}

// RegisterRoutes mounts order write routes on the parent router.
func RegisterRoutes(r chi.Router, cfg HandlerConfig) {
	h := NewHandler(cfg)
	r.Post("/orders/preview", h.PreviewOrder)
	r.Post("/orders/submit", h.SubmitOrder)
	r.Post("/orders/{orderID}/cancel-preview", h.PreviewCancelOrder)
	r.Post("/orders/{orderID}/cancel", h.CancelOrder)
}

// RegisterMeRoutes mounts authenticated order list routes under /me.
func RegisterMeRoutes(r chi.Router, cfg HandlerConfig) {
	h := NewHandler(cfg)
	r.Get("/orders", h.ListMyOrders)
	r.Get("/fills", h.ListMyFills)
}

// PreviewOrder handles POST /api/v1/markets/orders/preview.
func (h *Handler) PreviewOrder(w http.ResponseWriter, r *http.Request) {
	session, err := h.sessions.ResolveSession(r)
	if err != nil {
		writeOrderError(w, r, err, 0)
		return
	}

	var req PreviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeOrderError(w, r, ErrInvalidRequest, 0)
		return
	}

	body, err := h.service.Preview(r.Context(), session, req)
	if err != nil {
		writeOrderError(w, r, err, 0)
		return
	}

	w.Header().Set("Cache-Control", "private, no-store")
	httpx.JSON(w, http.StatusOK, body)
}

// SubmitOrder handles POST /api/v1/markets/orders/submit.
func (h *Handler) SubmitOrder(w http.ResponseWriter, r *http.Request) {
	session, err := h.sessions.ResolveSession(r)
	if err != nil {
		writeOrderError(w, r, err, 0)
		return
	}

	var req SubmitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeOrderError(w, r, ErrInvalidRequest, 0)
		return
	}

	idempotencyKey := strings.TrimSpace(r.Header.Get(idempotencyHeader))
	body, status, err := h.service.SubmitOrder(r.Context(), session, idempotencyKey, req)
	if err != nil {
		writeOrderError(w, r, err, status)
		return
	}

	w.Header().Set("Cache-Control", "private, no-store")
	httpx.JSON(w, status, body)
}

// PreviewCancelOrder handles POST /api/v1/markets/orders/{orderId}/cancel-preview.
func (h *Handler) PreviewCancelOrder(w http.ResponseWriter, r *http.Request) {
	session, err := h.sessions.ResolveSession(r)
	if err != nil {
		writeOrderError(w, r, err, 0)
		return
	}
	orderID := chi.URLParam(r, "orderID")
	body, err := h.service.PreviewCancel(r.Context(), session, orderID)
	if err != nil {
		writeOrderError(w, r, err, 0)
		return
	}
	w.Header().Set("Cache-Control", "private, no-store")
	httpx.JSON(w, http.StatusOK, body)
}

// CancelOrder handles POST /api/v1/markets/orders/{orderId}/cancel.
func (h *Handler) CancelOrder(w http.ResponseWriter, r *http.Request) {
	session, err := h.sessions.ResolveSession(r)
	if err != nil {
		writeOrderError(w, r, err, 0)
		return
	}
	orderID := chi.URLParam(r, "orderID")
	var req CancelRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeOrderError(w, r, ErrInvalidRequest, 0)
		return
	}
	idempotencyKey := strings.TrimSpace(r.Header.Get(idempotencyHeader))
	body, status, err := h.service.CancelOrder(r.Context(), session, orderID, idempotencyKey, req)
	if err != nil {
		writeOrderError(w, r, err, status)
		return
	}
	w.Header().Set("Cache-Control", "private, no-store")
	httpx.JSON(w, status, body)
}

// ListMyOrders handles GET /api/v1/markets/me/orders.
func (h *Handler) ListMyOrders(w http.ResponseWriter, r *http.Request) {
	session, err := h.sessions.ResolveSession(r)
	if err != nil {
		writeOrderError(w, r, err, 0)
		return
	}
	filter := ListOrdersFilter{
		Status:   strings.TrimSpace(r.URL.Query().Get("status")),
		MarketID: strings.TrimSpace(r.URL.Query().Get("marketId")),
		TokenID:  strings.TrimSpace(r.URL.Query().Get("tokenId")),
	}
	body, err := h.service.ListMyOrders(r.Context(), session, filter)
	if err != nil {
		writeOrderError(w, r, err, 0)
		return
	}
	w.Header().Set("Cache-Control", "private, no-store")
	httpx.JSON(w, http.StatusOK, body)
}

// ListMyFills handles GET /api/v1/markets/me/fills.
func (h *Handler) ListMyFills(w http.ResponseWriter, r *http.Request) {
	session, err := h.sessions.ResolveSession(r)
	if err != nil {
		writeOrderError(w, r, err, 0)
		return
	}
	filter := ListFillsFilter{
		OrderID:  strings.TrimSpace(r.URL.Query().Get("orderId")),
		MarketID: strings.TrimSpace(r.URL.Query().Get("marketId")),
		TokenID:  strings.TrimSpace(r.URL.Query().Get("tokenId")),
	}
	body, err := h.service.ListMyFills(r.Context(), session, filter)
	if err != nil {
		writeOrderError(w, r, err, 0)
		return
	}
	w.Header().Set("Cache-Control", "private, no-store")
	httpx.JSON(w, http.StatusOK, body)
}

func writeOrderError(w http.ResponseWriter, r *http.Request, err error, statusOverride int) {
	status := statusOverride
	code := "internal_error"
	message := "request failed"

	switch {
	case errors.Is(err, ErrUnauthorized):
		status = http.StatusUnauthorized
		code = "unauthorized"
		message = "authentication required"
	case errors.Is(err, ErrInvalidRequest):
		status = http.StatusBadRequest
		code = "invalid_argument"
		message = "invalid order request"
	case errors.Is(err, ErrMarketNotFound), errors.Is(err, ErrTokenNotInCatalog):
		status = http.StatusNotFound
		code = "not_found"
		message = "market or token not found"
	case errors.Is(err, ErrPreviewNotFound):
		status = http.StatusNotFound
		code = "preview_not_found"
		message = "preview session not found"
	case errors.Is(err, ErrMakerNotLinked):
		status = http.StatusConflict
		code = "maker_not_linked"
		message = "maker address is not linked to session"
	case errors.Is(err, ErrIntegrityMismatch):
		status = http.StatusConflict
		code = "integrity_mismatch"
		message = "preview content hash does not match stored payload"
	case errors.Is(err, ErrPreviewExpired):
		status = http.StatusGone
		code = "preview_expired"
		message = "preview TTL exceeded"
	case errors.Is(err, ErrIdempotencyConflict):
		status = http.StatusUnprocessableEntity
		code = "idempotency_conflict"
		message = "idempotency key replay with different body"
	case errors.Is(err, ErrMissingIdempotencyKey):
		status = http.StatusBadRequest
		code = "missing_idempotency_key"
		message = "Idempotency-Key header is required"
	case errors.Is(err, ErrCapabilityDisabled):
		status = http.StatusServiceUnavailable
		code = "capability_disabled"
		message = "order_submit is disabled"
	case errors.Is(err, ErrTickSizeViolation), errors.Is(err, ErrMinSizeViolation):
		status = http.StatusBadRequest
		code = "invalid_argument"
		message = err.Error()
	case errors.Is(err, ErrExchangeRoutingConflict):
		status = http.StatusBadGateway
		code = "upstream_unavailable"
		message = "exchange routing conflict"
	case errors.Is(err, ErrUpstreamUnavailable):
		status = http.StatusBadGateway
		code = "upstream_unavailable"
		message = "venue unavailable"
	case errors.Is(err, ErrOrderNotFound):
		status = http.StatusNotFound
		code = "not_found"
		message = "order not found"
	case errors.Is(err, ErrOrderNotOwned):
		status = http.StatusConflict
		code = "order_not_owned"
		message = "order is not owned by session"
	case errors.Is(err, ErrOrderNotCancelable):
		status = http.StatusNotFound
		code = "not_found"
		message = "order not found or not cancelable"
	case errors.Is(err, ErrAccountNotLinked):
		status = http.StatusNotFound
		code = "account_not_linked"
		message = "no linked primary account wallet"
	}

	if status == 0 {
		status = http.StatusInternalServerError
	}

	httpx.JSON(w, status, ErrorResponse{Error: APIError{
		Code:      code,
		Message:   message,
		RequestID: middleware.GetReqID(r.Context()),
	}})
}

// Backward-compatible alias for preview-only call sites.
func writePreviewError(w http.ResponseWriter, r *http.Request, err error) {
	writeOrderError(w, r, err, 0)
}
