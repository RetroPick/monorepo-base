package http

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/intelligence/feed"
	"retropick/apps/backend/internal/platform/httpx"
)

const (
	defaultPageSize = 50
	maxPageSize     = 100
)

// WhaleLister lists whale feed pages.
type WhaleLister interface {
	ListWhales(q feed.Query, now time.Time) feed.ListResponse
	Enabled() bool
}

// Handler exposes PUBLIC whale feed routes.
type Handler struct {
	lister WhaleLister
}

func NewHandler(lister WhaleLister) *Handler {
	return &Handler{lister: lister}
}

// RegisterRoutes mounts intelligence HTTP routes on the markets router group.
func RegisterRoutes(r chi.Router, lister WhaleLister) {
	h := NewHandler(lister)
	r.Get("/intelligence/whales", h.ListWhales)
}

func (h *Handler) ListWhales(w http.ResponseWriter, r *http.Request) {
	setReadCacheHeaders(w)
	if !h.lister.Enabled() {
		now := time.Now().UTC()
		httpx.JSON(w, http.StatusOK, feed.DisabledResponse(defaultPageSize, now))
		return
	}
	q, err := ParseQuery(r)
	if err != nil {
		writeError(w, err)
		return
	}
	body := h.lister.ListWhales(q, time.Now().UTC())
	httpx.JSON(w, http.StatusOK, body)
}

func setReadCacheHeaders(w http.ResponseWriter) {
	w.Header().Set("Cache-Control", "public, max-age=5, stale-if-error=60")
	w.Header().Set("Vary", "Accept-Encoding")
}

func writeError(w http.ResponseWriter, err error) {
	switch err {
	case markets.ErrInvalidArgument:
		httpx.JSON(w, http.StatusBadRequest, markets.ErrorResponse{
			Error: markets.APIError{Code: "invalid_argument", Message: err.Error()},
		})
	default:
		httpx.JSON(w, http.StatusServiceUnavailable, markets.ErrorResponse{
			Error: markets.APIError{Code: "data_unavailable", Message: "whale feed unavailable"},
		})
	}
}

// ParseQuery extracts whale list filters from the request.
func ParseQuery(r *http.Request) (feed.Query, error) {
	limit, err := requestLimit(r)
	if err != nil {
		return feed.Query{}, err
	}
	q := feed.Query{
		MarketID:   strings.TrimSpace(r.URL.Query().Get("marketId")),
		Wallet:     strings.TrimSpace(r.URL.Query().Get("wallet")),
		ReasonCode: strings.TrimSpace(r.URL.Query().Get("reasonCode")),
		Cursor:     strings.TrimSpace(r.URL.Query().Get("cursor")),
		Limit:      limit,
	}
	if raw := strings.TrimSpace(r.URL.Query().Get("minScore")); raw != "" {
		value, err := strconv.ParseFloat(raw, 64)
		if err != nil {
			return feed.Query{}, markets.ErrInvalidArgument
		}
		q.MinScore = value
	}
	if raw := strings.TrimSpace(r.URL.Query().Get("minNotional")); raw != "" {
		value, err := strconv.ParseInt(raw, 10, 64)
		if err != nil {
			return feed.Query{}, markets.ErrInvalidArgument
		}
		q.MinNotional = value
	}
	return q, nil
}

func requestLimit(r *http.Request) (int, error) {
	raw := strings.TrimSpace(r.URL.Query().Get("limit"))
	if raw == "" {
		return defaultPageSize, nil
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value < 1 || value > maxPageSize {
		return 0, markets.ErrInvalidArgument
	}
	return value, nil
}
