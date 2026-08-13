// Package portfolio serves truthful reads from durable portfolio projections.
package portfolio

import (
	"context"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/activity"
	"retropick/apps/backend/internal/markets/positions"
	"retropick/apps/backend/internal/markets/wallet"
	"retropick/apps/backend/internal/platform/httpx"
)

const pnlDisclaimer = "Descriptive projection based on venue fills and mark prices; not custodial P&L authority."

type SessionResolver interface {
	ResolveSession(*http.Request) (wallet.SessionContext, error)
}
type ActivityReader interface {
	List(context.Context, string, activity.PageRequest) (activity.Page, error)
}
type PositionReader interface {
	List(context.Context, string, string) ([]positions.PositionRecord, error)
}

type HandlerConfig struct {
	Sessions   SessionResolver
	Discoverer *wallet.Discoverer
	Activity   ActivityReader
	Positions  PositionReader
	Now        func() time.Time
}

type Handler struct {
	sessions   SessionResolver
	discoverer *wallet.Discoverer
	activity   ActivityReader
	positions  PositionReader
	now        func() time.Time
}

func NewHandler(cfg HandlerConfig) *Handler {
	if cfg.Sessions == nil {
		cfg.Sessions = wallet.ContextSessionResolver{}
	}
	if cfg.Discoverer == nil {
		cfg.Discoverer = wallet.DefaultDiscoverer()
	}
	if cfg.Now == nil {
		cfg.Now = time.Now
	}
	return &Handler{sessions: cfg.Sessions, discoverer: cfg.Discoverer, activity: cfg.Activity, positions: cfg.Positions, now: cfg.Now}
}

func RegisterMeRoutes(r chi.Router, h *Handler) {
	r.Get("/activity", h.ListMyActivity)
	r.Route("/portfolio", func(r chi.Router) { r.Get("/summary", h.GetMyPortfolioSummary) })
}

type moneyAmount struct {
	Amount   string `json:"amount"`
	Currency string `json:"currency"`
	Decimals int    `json:"decimals"`
}
type activityEvent struct {
	EventID        string                     `json:"eventId"`
	EventType      string                     `json:"eventType"`
	OccurredAt     time.Time                  `json:"occurredAt"`
	Summary        string                     `json:"summary"`
	MarketID       string                     `json:"marketId,omitempty"`
	TokenID        string                     `json:"tokenId,omitempty"`
	Size           markets.DecimalString      `json:"size,omitempty"`
	RelatedOrderID string                     `json:"relatedOrderId,omitempty"`
	RelatedFillID  string                     `json:"relatedFillId,omitempty"`
	Provenance     markets.UpstreamProvenance `json:"provenance"`
}
type activityResponse struct {
	SchemaVersion string           `json:"schemaVersion"`
	Events        []activityEvent  `json:"events"`
	Page          markets.PageInfo `json:"page"`
	CheckedAt     time.Time        `json:"checkedAt"`
}

func (h *Handler) ListMyActivity(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "private, no-store")
	session, account, ok := h.resolve(w, r)
	if !ok {
		return
	}
	if h.activity == nil {
		writeError(w, r, http.StatusServiceUnavailable, "projection_unavailable", "activity projection unavailable")
		return
	}
	limit, err := queryLimit(r)
	if err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	req := activity.PageRequest{Limit: limit, Cursor: r.URL.Query().Get("cursor"), AccountWallet: account}
	if raw := r.URL.Query().Get("since"); raw != "" {
		at, parseErr := time.Parse(time.RFC3339, raw)
		if parseErr != nil {
			writeError(w, r, http.StatusBadRequest, "invalid_request", "invalid since")
			return
		}
		req.Since = &at
	}
	if raw := r.URL.Query().Get("eventType"); raw != "" {
		kind, kindOK := storageKind(raw)
		if !kindOK {
			writeError(w, r, http.StatusBadRequest, "invalid_request", "invalid eventType")
			return
		}
		req.Kind = kind
	}
	page, err := h.activity.List(r.Context(), session.UserID, req)
	if err != nil {
		writeError(w, r, http.StatusServiceUnavailable, "projection_unavailable", "activity projection unavailable")
		return
	}
	events := make([]activityEvent, 0, len(page.Events))
	for _, event := range page.Events {
		mapped, mapOK := mapActivity(event)
		if mapOK {
			events = append(events, mapped)
		}
	}
	var cursor *string
	if page.NextCursor != "" {
		cursor = &page.NextCursor
	}
	httpx.JSON(w, http.StatusOK, activityResponse{SchemaVersion: markets.SchemaVersion, Events: events, Page: markets.PageInfo{NextCursor: cursor, Limit: limit}, CheckedAt: h.now().UTC()})
}

func mapActivity(event activity.Event) (activityEvent, bool) {
	mapped := activityEvent{EventID: event.ID, OccurredAt: event.ObservedAt.UTC(), MarketID: event.MarketID, TokenID: event.TokenID, RelatedOrderID: event.OrderID, RelatedFillID: event.FillID, Provenance: markets.UpstreamProvenance{Source: event.UpstreamSource, UpstreamID: event.UpstreamID, ObservedAt: event.ObservedAt.UTC()}}
	switch event.Kind {
	case activity.KindFill:
		mapped.EventType = "order_filled"
		mapped.Summary = "Order fill observed"
		mapped.Size = markets.DecimalString(event.Amount)
		if mapped.RelatedFillID == "" {
			mapped.RelatedFillID = event.ID
		}
	case activity.KindOrder:
		mapped.EventType = "order_submitted"
		mapped.Summary = "Order submitted"
	default:
		return activityEvent{}, false
	}
	return mapped, true
}

func storageKind(wire string) (string, bool) {
	switch wire {
	case "order_filled":
		return activity.KindFill, true
	case "order_submitted":
		return activity.KindOrder, true
	default:
		return "", false
	}
}

func queryLimit(r *http.Request) (int, error) {
	raw := r.URL.Query().Get("limit")
	if raw == "" {
		return 50, nil
	}
	limit, err := strconv.Atoi(raw)
	if err != nil || limit < 1 || limit > 100 {
		return 0, fmt.Errorf("limit must be between 1 and 100")
	}
	return limit, nil
}

type markAvailability struct {
	State                        string `json:"state"`
	AvailableOpenPositionCount   int    `json:"availableOpenPositionCount"`
	UnavailableOpenPositionCount int    `json:"unavailableOpenPositionCount"`
}
type sourceAvailability struct {
	State string `json:"state"`
}
type pnlAvailability struct {
	MarkValue   markAvailability   `json:"markValue"`
	RealizedPnL sourceAvailability `json:"realizedPnl"`
}
type aggregate struct {
	TotalMarkValue    *moneyAmount    `json:"totalMarkValue"`
	TotalCostBasis    moneyAmount     `json:"totalCostBasis"`
	UnrealizedPnL     *moneyAmount    `json:"unrealizedPnl"`
	RealizedPnL       *moneyAmount    `json:"realizedPnl"`
	ClaimableValue    moneyAmount     `json:"claimableValue"`
	OpenPositionCount int             `json:"openPositionCount"`
	Availability      pnlAvailability `json:"availability"`
}
type summaryResponse struct {
	SchemaVersion string                     `json:"schemaVersion"`
	AccountWallet string                     `json:"accountWallet"`
	Aggregate     aggregate                  `json:"aggregate"`
	PnLDisclaimer string                     `json:"pnlDisclaimer"`
	CheckedAt     time.Time                  `json:"checkedAt"`
	Provenance    markets.UpstreamProvenance `json:"provenance"`
	Freshness     markets.MarketFreshness    `json:"freshness"`
}

func (h *Handler) GetMyPortfolioSummary(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "private, no-store")
	session, account, ok := h.resolve(w, r)
	if !ok {
		return
	}
	if h.positions == nil {
		writeError(w, r, http.StatusServiceUnavailable, "projection_unavailable", "position projection unavailable")
		return
	}
	rows, err := h.positions.List(r.Context(), session.UserID, account)
	if err != nil {
		writeError(w, r, http.StatusServiceUnavailable, "projection_unavailable", "position projection unavailable")
		return
	}
	checked := h.now().UTC()
	agg, observedAt, freshness, err := summarize(rows, checked)
	if err != nil {
		writeError(w, r, http.StatusServiceUnavailable, "projection_invalid", "position projection invalid")
		return
	}
	httpx.JSON(w, http.StatusOK, summaryResponse{SchemaVersion: markets.SchemaVersion, AccountWallet: account, Aggregate: agg, PnLDisclaimer: pnlDisclaimer, CheckedAt: checked, Provenance: markets.UpstreamProvenance{Source: "retropick_projection", ObservedAt: observedAt}, Freshness: freshness})
}

func summarize(rows []positions.PositionRecord, checked time.Time) (aggregate, time.Time, markets.MarketFreshness, error) {
	zero := money(big.NewInt(0))
	result := aggregate{TotalCostBasis: zero, ClaimableValue: zero, Availability: pnlAvailability{MarkValue: markAvailability{State: "available"}, RealizedPnL: sourceAvailability{State: "unavailable"}}}
	openRows := make([]positions.PositionRecord, 0, len(rows))
	for _, row := range rows {
		size, ok := new(big.Rat).SetString(strings.TrimSpace(row.Size))
		if !ok || size.Sign() < 0 {
			return aggregate{}, time.Time{}, markets.MarketFreshness{}, errors.New("invalid position size")
		}
		if size.Sign() > 0 {
			openRows = append(openRows, row)
		}
	}
	result.OpenPositionCount = len(openRows)
	markTotal, costTotal, unrealizedTotal, realizedTotal, claimableTotal := new(big.Int), new(big.Int), new(big.Int), new(big.Int), new(big.Int)
	observed := checked
	freshness := markets.MarketFreshness{State: markets.FreshnessFresh, ObservedAt: checked}
	if len(openRows) == 0 {
		result.TotalMarkValue = ptrMoney(markTotal)
		result.UnrealizedPnL = ptrMoney(unrealizedTotal)
		return result, observed, freshness, nil
	}
	realizedAvailable := true
	for i, row := range openRows {
		if i == 0 || row.ObservedAt.Before(observed) {
			observed = row.ObservedAt.UTC()
		}
		if row.SyncStatus != positions.SyncStatusSynced {
			freshness.State = markets.FreshnessResyncing
			freshness.Reason = "position_sync_pending"
		}
		cost, ok := integer(row.CostBasisAmount, row.CostBasisObserved)
		if !ok {
			return aggregate{}, time.Time{}, markets.MarketFreshness{}, errors.New("cost basis unavailable")
		}
		costTotal.Add(costTotal, cost)
		claimable, ok := decimalBaseUnits(row.ClaimableAmount, row.ClaimableAmountObserved)
		if !ok {
			return aggregate{}, time.Time{}, markets.MarketFreshness{}, errors.New("claimable unavailable")
		}
		claimableTotal.Add(claimableTotal, claimable)
		mark, markOK := productBaseUnits(row.Size, row.MarkPrice, row.MarkPriceObserved)
		unrealized, unrealizedOK := decimalBaseUnits(row.UnrealizedPnL, row.UnrealizedPnLObserved)
		if markOK && unrealizedOK {
			result.Availability.MarkValue.AvailableOpenPositionCount++
			markTotal.Add(markTotal, mark)
			unrealizedTotal.Add(unrealizedTotal, unrealized)
		} else {
			result.Availability.MarkValue.UnavailableOpenPositionCount++
		}
		realized, ok := decimalBaseUnits(row.RealizedPnL, row.RealizedPnLObserved)
		if !ok {
			realizedAvailable = false
		} else {
			realizedTotal.Add(realizedTotal, realized)
		}
	}
	result.TotalCostBasis = money(costTotal)
	result.ClaimableValue = money(claimableTotal)
	if result.Availability.MarkValue.UnavailableOpenPositionCount == 0 {
		result.TotalMarkValue = ptrMoney(markTotal)
		result.UnrealizedPnL = ptrMoney(unrealizedTotal)
	} else {
		result.Availability.MarkValue.State = "unavailable"
	}
	if realizedAvailable {
		result.RealizedPnL = ptrMoney(realizedTotal)
		result.Availability.RealizedPnL.State = "available"
	}
	freshness.ObservedAt = observed
	freshness.AgeMillis = max(0, checked.Sub(observed).Milliseconds())
	return result, observed, freshness, nil
}

func integer(raw string, observed bool) (*big.Int, bool) {
	if !observed {
		return nil, false
	}
	out, ok := new(big.Int).SetString(strings.TrimSpace(raw), 10)
	return out, ok && out.Sign() >= 0
}
func decimalBaseUnits(raw string, observed bool) (*big.Int, bool) {
	if !observed {
		return nil, false
	}
	return scaledRat(raw)
}
func productBaseUnits(left, right string, observed bool) (*big.Int, bool) {
	if !observed {
		return nil, false
	}
	l, ok := new(big.Rat).SetString(left)
	if !ok {
		return nil, false
	}
	r, ok := new(big.Rat).SetString(right)
	if !ok {
		return nil, false
	}
	return scaled(new(big.Rat).Mul(l, r))
}
func scaledRat(raw string) (*big.Int, bool) {
	rat, ok := new(big.Rat).SetString(strings.TrimSpace(raw))
	if !ok {
		return nil, false
	}
	return scaled(rat)
}
func scaled(rat *big.Rat) (*big.Int, bool) {
	numerator := new(big.Int).Mul(rat.Num(), big.NewInt(1_000_000))
	value, remainder := new(big.Int).QuoRem(numerator, rat.Denom(), new(big.Int))
	return value, remainder.Sign() == 0
}
func money(value *big.Int) moneyAmount {
	return moneyAmount{Amount: value.String(), Currency: "pUSD", Decimals: 6}
}
func ptrMoney(value *big.Int) *moneyAmount { out := money(value); return &out }

func (h *Handler) resolve(w http.ResponseWriter, r *http.Request) (wallet.SessionContext, string, bool) {
	session, err := h.sessions.ResolveSession(r)
	if err != nil || strings.TrimSpace(session.UserID) == "" {
		writeError(w, r, http.StatusUnauthorized, "unauthorized", "authentication required")
		return wallet.SessionContext{}, "", false
	}
	wallets, err := h.discoverer.ListWallets(r.Context(), session)
	if err != nil {
		writeError(w, r, http.StatusUnauthorized, "unauthorized", "authentication required")
		return wallet.SessionContext{}, "", false
	}
	for _, linked := range wallets.Wallets {
		if linked.LinkStatus == wallet.LinkStatusLinked && linked.IsPrimary {
			return session, linked.AccountWallet, true
		}
	}
	for _, linked := range wallets.Wallets {
		if linked.LinkStatus == wallet.LinkStatusLinked {
			return session, linked.AccountWallet, true
		}
	}
	writeError(w, r, http.StatusNotFound, "account_not_linked", "no linked account wallet")
	return wallet.SessionContext{}, "", false
}

func writeError(w http.ResponseWriter, r *http.Request, status int, code, message string) {
	w.Header().Set("Cache-Control", "private, no-store")
	httpx.JSON(w, status, markets.ErrorResponse{Error: markets.APIError{Code: code, Message: message, RequestID: middleware.GetReqID(r.Context())}})
}
