package reconcile

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/clob"
	"retropick/apps/backend/internal/markets/orders"
)

const (
	defaultReconcileInterval = 10 * time.Second
	defaultUnknownGrace      = 90 * time.Second
	rejectReasonNotFound     = "reconcile_not_found"
)

// VenueReader loads authenticated CLOB order/trade snapshots.
type VenueReader interface {
	ListOpenOrders(ctx context.Context) ([]clob.VenueOpenOrder, error)
	ListTrades(ctx context.Context) ([]clob.VenueTrade, error)
}

type clobVenueReader struct {
	client *clob.TradingClient
}

func (c clobVenueReader) ListOpenOrders(ctx context.Context) ([]clob.VenueOpenOrder, error) {
	return c.client.ListOpenOrders(ctx)
}

func (c clobVenueReader) ListTrades(ctx context.Context) ([]clob.VenueTrade, error) {
	return c.client.ListTrades(ctx)
}

// Metrics counts reconciliation outcomes.
type Metrics interface {
	RecordReconcileRun(repaired int, lag time.Duration)
	RecordReconcileRepair(outcome string)
	RecordReconcileScanned(count int)
	RecordReconcileError(kind string)
}

type nopMetrics struct{}

func (nopMetrics) RecordReconcileRun(int, time.Duration) {}
func (nopMetrics) RecordReconcileRepair(string)          {}
func (nopMetrics) RecordReconcileScanned(int)            {}
func (nopMetrics) RecordReconcileError(string)           {}

// WorkerConfig wires the order reconciliation loop.
type WorkerConfig struct {
	Store         *orders.ProjectionStore
	Venue         VenueReader
	Metrics       Metrics
	Interval      time.Duration
	UnknownGrace  time.Duration
	Now           func() time.Time
}

// Worker repairs unknown and cancel_pending order projections against CLOB truth.
type Worker struct {
	store        *orders.ProjectionStore
	venue        VenueReader
	metrics      Metrics
	interval     time.Duration
	unknownGrace time.Duration
	now          func() time.Time
}

// NewWorker builds a reconciliation worker.
func NewWorker(cfg WorkerConfig) *Worker {
	store := cfg.Store
	if store == nil {
		store = orders.NewProjectionStore()
	}
	metrics := cfg.Metrics
	if metrics == nil {
		metrics = nopMetrics{}
	}
	interval := cfg.Interval
	if interval <= 0 {
		interval = defaultReconcileInterval
	}
	grace := cfg.UnknownGrace
	if grace <= 0 {
		grace = defaultUnknownGrace
	}
	now := cfg.Now
	if now == nil {
		now = time.Now
	}
	return &Worker{
		store:        store,
		venue:        cfg.Venue,
		metrics:      metrics,
		interval:     interval,
		unknownGrace: grace,
		now:          now,
	}
}

// Run executes the reconcile loop until ctx is cancelled.
func (w *Worker) Run(ctx context.Context) error {
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			w.runOnce(ctx)
		}
	}
}

// RunOnce performs a single reconciliation pass (exported for tests).
func (w *Worker) RunOnce(ctx context.Context) {
	w.runOnce(ctx)
}

func (w *Worker) runOnce(ctx context.Context) {
	if w.venue == nil {
		return
	}
	start := w.now()
	candidates := w.store.ListOrdersNeedingReconcile()
	w.metrics.RecordReconcileScanned(len(candidates))
	repaired := 0

	if len(candidates) > 0 {
		openOrders, err := w.venue.ListOpenOrders(ctx)
		if err != nil {
			w.metrics.RecordReconcileError(classifyVenueError(err))
		} else {
			openByID := indexOpenOrders(openOrders)
			openByMaker := indexOpenOrdersByMaker(openOrders)
			for _, local := range candidates {
				if w.repairOrder(local, openByID, openByMaker) {
					repaired++
				}
			}
		}
	}

	w.ingestFills(ctx)
	w.metrics.RecordReconcileRun(repaired, w.now().Sub(start))
}

func (w *Worker) repairOrder(
	local orders.UserOrderRecord,
	openByID map[string]clob.VenueOpenOrder,
	openByMaker map[string][]clob.VenueOpenOrder,
) bool {
	now := w.now().UTC()
	switch local.Status {
	case orders.OrderStatusUnknown:
		lag := now.Sub(local.CreatedAt)
		if venue, ok := openByID[local.VenueOrderID]; ok && local.VenueOrderID != "" {
			if w.applyVenueOpen(local.OrderID, venue, now) {
				w.metrics.RecordReconcileRepair("open")
				return true
			}
			return false
		}
		if match, ok := MatchUnknownOrder(local, openByMaker[strings.ToLower(local.Maker)]); ok {
			if w.applyVenueOpen(local.OrderID, match.Order, now) {
				w.metrics.RecordReconcileRepair("open")
				return true
			}
			return false
		}
		if lag >= w.unknownGrace {
			if w.store.ApplyReconcile(local.OrderID, orders.ReconcilePatch{
				Status:          orders.OrderStatusRejected,
				RejectionReason: rejectReasonNotFound,
			}, now) {
				w.metrics.RecordReconcileRepair("rejected")
				return true
			}
		}
		return false
	case orders.OrderStatusCancelPending:
		if local.VenueOrderID == "" {
			return false
		}
		if _, stillOpen := openByID[local.VenueOrderID]; stillOpen {
			return false
		}
		if w.store.ApplyReconcile(local.OrderID, orders.ReconcilePatch{Status: orders.OrderStatusCanceled}, now) {
			w.metrics.RecordReconcileRepair("canceled")
			return true
		}
		return false
	default:
		return false
	}
}

func (w *Worker) applyVenueOpen(orderID string, venue clob.VenueOpenOrder, now time.Time) bool {
	return w.store.ApplyReconcile(orderID, orders.ReconcilePatch{
		VenueOrderID: venue.OrderID,
		Status:       mapVenueStatus(venue.Status),
	}, now)
}

func (w *Worker) ingestFills(ctx context.Context) {
	trades, err := w.venue.ListTrades(ctx)
	if err != nil {
		w.metrics.RecordReconcileError(classifyVenueError(err))
		return
	}
	now := w.now().UTC()
	for _, trade := range trades {
		if trade.TradeID == "" {
			continue
		}
		orderID := findOrderIDForTrade(w.store, trade.OrderID)
		if orderID == "" {
			continue
		}
		order, ok := w.store.GetOrder(orderID)
		if !ok {
			continue
		}
		if w.store.HasFillByVenueTradeID(order.UserID, trade.TradeID) {
			continue
		}
		w.store.AddFill(orders.UserFillRecord{
			FillID:       uuid.NewString(),
			OrderID:      orderID,
			UserID:       order.UserID,
			VenueTradeID: trade.TradeID,
			MarketID:     order.MarketID,
			TokenID:      order.TokenID,
			Side:         trade.Side,
			Price:        trade.Price,
			Size:         trade.Size,
			FeeAmount:    trade.FeeAmount,
			FeeCurrency:  "pUSD",
			FeeDecimals:  6,
			FilledAt:     now,
			Provenance: markets.UpstreamProvenance{
				Source:     "polymarket_clob",
				UpstreamID: trade.TradeID,
				ObservedAt: now,
			},
		})
		w.metrics.RecordReconcileRepair("fill")
	}
}

func findOrderIDForTrade(store *orders.ProjectionStore, venueOrderID string) string {
	if venueOrderID == "" {
		return ""
	}
	if rec, ok := store.FindOrderByVenueOrderID(venueOrderID); ok {
		return rec.OrderID
	}
	return ""
}

func indexOpenOrders(rows []clob.VenueOpenOrder) map[string]clob.VenueOpenOrder {
	out := make(map[string]clob.VenueOpenOrder, len(rows))
	for _, row := range rows {
		if row.OrderID != "" {
			out[row.OrderID] = row
		}
	}
	return out
}

func indexOpenOrdersByMaker(rows []clob.VenueOpenOrder) map[string][]clob.VenueOpenOrder {
	out := make(map[string][]clob.VenueOpenOrder)
	for _, row := range rows {
		maker := strings.ToLower(strings.TrimSpace(row.Maker))
		if maker == "" {
			continue
		}
		out[maker] = append(out[maker], row)
	}
	return out
}

func mapVenueStatus(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "live", "open", "accepted", "":
		return "open"
	case "matched", "filled":
		return "filled"
	case "cancelled", "canceled":
		return "canceled"
	default:
		return strings.ToLower(raw)
	}
}

func classifyVenueError(err error) string {
	if err == nil {
		return ""
	}
	switch {
	case strings.Contains(err.Error(), "credentials"):
		return "credentials_unwired"
	default:
		return "upstream"
	}
}

// NewCLOBVenueReader wraps a trading client for reconciliation.
func NewCLOBVenueReader(client *clob.TradingClient) VenueReader {
	if client == nil {
		return nil
	}
	return clobVenueReader{client: client}
}
