package reconcile

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/activity"
	"retropick/apps/backend/internal/markets/clob"
	"retropick/apps/backend/internal/markets/orders"
)

const (
	defaultReconcileInterval = 10 * time.Second
	defaultUnknownGrace      = 90 * time.Second
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
	Store        *orders.ProjectionStore
	Journal      orders.SubmitRecoveryJournal
	Activity     ActivityAppender
	Venue        VenueReader
	Metrics      Metrics
	Interval     time.Duration
	UnknownGrace time.Duration
	Now          func() time.Time
}

// Worker repairs unknown and cancel_pending order projections against CLOB truth.
type Worker struct {
	store        *orders.ProjectionStore
	journal      orders.SubmitRecoveryJournal
	activity     ActivityAppender
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
		journal:      cfg.Journal,
		activity:     cfg.Activity,
		venue:        cfg.Venue,
		metrics:      metrics,
		interval:     interval,
		unknownGrace: grace,
		now:          now,
	}
}

// Run executes the reconcile loop until ctx is cancelled.
func (w *Worker) Run(ctx context.Context) error {
	w.runOnce(ctx)
	if err := ctx.Err(); err != nil {
		return err
	}
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
	now := w.now().UTC()
	candidates := w.store.ListOrdersNeedingReconcile()
	if w.journal != nil {
		localCandidates := make([]orders.UserOrderRecord, 0, len(candidates))
		for _, rec := range candidates {
			if rec.Status == orders.OrderStatusCancelPending || (rec.AttemptID == "" && rec.RequestFingerprint == "") {
				localCandidates = append(localCandidates, rec)
			}
		}
		candidates = localCandidates
		lease := 3 * w.interval
		if lease < 30*time.Second {
			lease = 30 * time.Second
		}
		journalCandidates, err := w.journal.ClaimSubmitReconciliationCandidates(ctx, 100, lease)
		if err != nil {
			w.metrics.RecordReconcileError("journal")
		} else {
			for _, rec := range journalCandidates {
				w.store.PutOrder(rec)
				candidates = append(candidates, rec)
			}
		}
	}
	w.metrics.RecordReconcileScanned(len(candidates))
	oldestAge := time.Duration(0)
	for _, candidate := range candidates {
		if candidate.CreatedAt.IsZero() {
			continue
		}
		if age := now.Sub(candidate.CreatedAt); age > oldestAge {
			oldestAge = age
		}
	}
	repaired := 0

	if len(candidates) > 0 {
		openOrders, err := w.venue.ListOpenOrders(ctx)
		if err != nil {
			w.metrics.RecordReconcileError(classifyVenueError(err))
		} else {
			openByID := indexOpenOrders(openOrders)
			openByMaker := indexOpenOrdersByMaker(openOrders)
			for _, local := range candidates {
				if w.repairOrder(ctx, local, openByID, openByMaker) {
					repaired++
				}
			}
		}
	}

	w.ingestFills(ctx)
	w.metrics.RecordReconcileRun(repaired, oldestAge)
}

func (w *Worker) repairOrder(
	ctx context.Context,
	local orders.UserOrderRecord,
	openByID map[string]clob.VenueOpenOrder,
	openByMaker map[string][]clob.VenueOpenOrder,
) bool {
	now := w.now().UTC()
	switch local.Status {
	case orders.MutationStateIntentPersisted, orders.OrderStatusUnknown, orders.MutationStateUnknownReconciling, orders.MutationStateSubmitting:
		if local.Status == orders.MutationStateIntentPersisted && local.AttemptID == "" {
			if w.journal != nil {
				if err := w.journal.MarkSubmitNotSubmitted(ctx, local.OrderID, now); err != nil {
					w.metrics.RecordReconcileError("journal")
					return false
				}
			}
			if w.store.ApplyReconcile(local.OrderID, orders.ReconcilePatch{Status: orders.OrderStatusNotSubmitted}, now) {
				w.metrics.RecordReconcileRepair("not_submitted")
				return true
			}
			return false
		}
		lag := now.Sub(local.CreatedAt)
		if venue, ok := openByID[local.VenueOrderID]; ok && local.VenueOrderID != "" {
			if w.applyVenueOpen(ctx, local, venue, now) {
				w.metrics.RecordReconcileRepair("open")
				return true
			}
			return false
		}
		if match, ok := MatchUnknownOrder(local, openByMaker[strings.ToLower(local.Maker)]); ok {
			if w.applyVenueOpen(ctx, local, match.Order, now) {
				w.metrics.RecordReconcileRepair("open")
				return true
			}
			return false
		}
		if lag >= w.unknownGrace {
			if w.journal != nil && local.AttemptID != "" {
				if err := w.journal.MarkSubmitStillReconciling(ctx, local.OrderID, local.AttemptID, "venue_evidence_absent", map[string]string{
					"source":     "polymarket_clob_open_orders",
					"observedAt": now.Format(time.RFC3339Nano),
					"result":     "absent_or_ambiguous",
					"retryable":  "true",
					"terminal":   "false",
				}, now); err != nil {
					w.metrics.RecordReconcileError("journal")
					return false
				}
			}
			w.metrics.RecordReconcileRepair("unknown")
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

func (w *Worker) applyVenueOpen(ctx context.Context, local orders.UserOrderRecord, venue clob.VenueOpenOrder, now time.Time) bool {
	canonicalStatus := mapVenueStatus(venue.Status)
	if w.journal != nil {
		if err := w.journal.MarkSubmitReconciled(ctx, local.OrderID, local.AttemptID, venue.OrderID, canonicalStatus, now); err != nil {
			w.metrics.RecordReconcileError("journal")
			return false
		}
	}
	return w.store.ApplyReconcile(local.OrderID, orders.ReconcilePatch{
		VenueOrderID: venue.OrderID,
		Status:       canonicalStatus,
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
		fillID := uuid.NewString()
		fill := orders.UserFillRecord{
			FillID:       fillID,
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
		}
		if w.activity != nil {
			if err := w.activity.Append(ctx, activity.Event{
				ID:             fillID,
				UserID:         order.UserID,
				Kind:           activity.KindFill,
				MarketID:       order.MarketID,
				TokenID:        order.TokenID,
				ReferenceID:    trade.OrderID,
				Amount:         trade.Size,
				UpstreamSource: "polymarket_clob",
				UpstreamID:     trade.TradeID,
				ObservedAt:     now,
			}); err != nil {
				w.metrics.RecordReconcileError("activity_projection")
				// Do not acknowledge the in-memory fill before its durable activity
				// projection commits; the next reconcile pass can safely retry the
				// immutable upstream trade identity.
				continue
			}
		}
		w.store.AddFill(fill)
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
