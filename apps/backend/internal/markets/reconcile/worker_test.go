package reconcile_test

import (
	"context"
	"testing"
	"time"

	"retropick/apps/backend/internal/markets/clob"
	"retropick/apps/backend/internal/markets/orders"
	"retropick/apps/backend/internal/markets/reconcile"
)

type stubVenue struct {
	open  []clob.VenueOpenOrder
	trade []clob.VenueTrade
	err   error
}

func (s stubVenue) ListOpenOrders(context.Context) ([]clob.VenueOpenOrder, error) {
	if s.err != nil {
		return nil, s.err
	}
	return s.open, nil
}

func (s stubVenue) ListTrades(context.Context) ([]clob.VenueTrade, error) {
	if s.err != nil {
		return nil, s.err
	}
	return s.trade, nil
}

type stubMetrics struct {
	runs      int
	repaired  int
	outcomes  map[string]int
	scanned   int
	errors    map[string]int
	lastLag   time.Duration
}

func newStubMetrics() *stubMetrics {
	return &stubMetrics{outcomes: make(map[string]int), errors: make(map[string]int)}
}

func (m *stubMetrics) RecordReconcileRun(repaired int, lag time.Duration) {
	m.runs++
	m.repaired += repaired
	m.lastLag = lag
}

func (m *stubMetrics) RecordReconcileRepair(outcome string) {
	m.outcomes[outcome]++
}

func (m *stubMetrics) RecordReconcileScanned(count int) {
	m.scanned += count
}

func (m *stubMetrics) RecordReconcileError(kind string) {
	m.errors[kind]++
}

func TestWorkerRepairsUnknownByVenueOrderID(t *testing.T) {
	t.Parallel()

	store := orders.NewProjectionStore()
	store.PutOrder(orders.UserOrderRecord{
		OrderID:      "ord-1",
		UserID:       "user-1",
		VenueOrderID: "venue-1",
		TokenID:      "tok-a",
		Side:         "BUY",
		Price:        "0.55",
		OriginalSize: "10",
		Status:       orders.OrderStatusUnknown,
		Maker:        "0xmaker",
		CreatedAt:    time.Now().UTC(),
	})

	worker := reconcile.NewWorker(reconcile.WorkerConfig{
		Store: store,
		Venue: stubVenue{open: []clob.VenueOpenOrder{{
			OrderID: "venue-1",
			TokenID: "tok-a",
			Side:    "BUY",
			Price:   "0.55",
			Size:    "10",
			Status:  "live",
			Maker:   "0xmaker",
		}}},
		Metrics: newStubMetrics(),
	})

	worker.RunOnce(context.Background())

	rec, ok := store.GetOrder("ord-1")
	if !ok {
		t.Fatal("order missing")
	}
	if rec.Status != orders.OrderStatusOpen {
		t.Fatalf("status = %q, want open", rec.Status)
	}
}

func TestWorkerRepairsUnknownByFingerprint(t *testing.T) {
	t.Parallel()

	store := orders.NewProjectionStore()
	store.PutOrder(orders.UserOrderRecord{
		OrderID:       "ord-fp",
		UserID:        "user-1",
		ClientOrderID: "479249096354",
		Salt:          "479249096354",
		MakerAmount:   "5200000",
		TakerAmount:   "10000000",
		TokenID:       "tok-a",
		Side:          "BUY",
		Status:        orders.OrderStatusUnknown,
		Maker:         "0xmaker",
		CreatedAt:     time.Now().UTC(),
	})

	worker := reconcile.NewWorker(reconcile.WorkerConfig{
		Store: store,
		Venue: stubVenue{open: []clob.VenueOpenOrder{{
			OrderID:     "venue-fp",
			ClientOrderID: "479249096354",
			Salt:        "479249096354",
			MakerAmount: "5200000",
			TakerAmount: "10000000",
			TokenID:     "tok-a",
			Side:        "BUY",
			Status:      "live",
			Maker:       "0xmaker",
		}}},
		Metrics: newStubMetrics(),
	})
	worker.RunOnce(context.Background())

	rec, _ := store.GetOrder("ord-fp")
	if rec.Status != orders.OrderStatusOpen || rec.VenueOrderID != "venue-fp" {
		t.Fatalf("rec = %+v", rec)
	}
}

func TestWorkerRejectsUnknownAfterGrace(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 8, 9, 12, 0, 0, 0, time.UTC)
	store := orders.NewProjectionStore()
	store.PutOrder(orders.UserOrderRecord{
		OrderID:   "ord-grace",
		UserID:    "user-1",
		Status:    orders.OrderStatusUnknown,
		Maker:     "0xmaker",
		TokenID:   "tok-x",
		Side:      "BUY",
		CreatedAt: now.Add(-2 * time.Minute),
	})

	metrics := newStubMetrics()
	worker := reconcile.NewWorker(reconcile.WorkerConfig{
		Store:        store,
		Venue:        stubVenue{},
		Metrics:      metrics,
		UnknownGrace: 90 * time.Second,
		Now:          func() time.Time { return now },
	})
	worker.RunOnce(context.Background())

	rec, _ := store.GetOrder("ord-grace")
	if rec.Status != orders.OrderStatusRejected {
		t.Fatalf("status = %q, want rejected", rec.Status)
	}
	if rec.RejectionReason != "reconcile_not_found" {
		t.Fatalf("reason = %q", rec.RejectionReason)
	}
	if metrics.outcomes["rejected"] != 1 {
		t.Fatalf("metrics = %+v", metrics.outcomes)
	}
}

func TestWorkerRepairsCancelPendingWhenAbsentOnVenue(t *testing.T) {
	t.Parallel()

	store := orders.NewProjectionStore()
	store.PutOrder(orders.UserOrderRecord{
		OrderID:      "ord-2",
		UserID:       "user-1",
		VenueOrderID: "venue-gone",
		Status:       orders.OrderStatusCancelPending,
		CreatedAt:    time.Now().UTC(),
	})

	worker := reconcile.NewWorker(reconcile.WorkerConfig{
		Store:   store,
		Venue:   stubVenue{},
		Metrics: newStubMetrics(),
	})
	worker.RunOnce(context.Background())

	rec, _ := store.GetOrder("ord-2")
	if rec.Status != orders.OrderStatusCanceled {
		t.Fatalf("status = %q, want canceled", rec.Status)
	}
}

func TestWorkerIngestsFillOnce(t *testing.T) {
	t.Parallel()

	store := orders.NewProjectionStore()
	store.PutOrder(orders.UserOrderRecord{
		OrderID:      "ord-3",
		UserID:       "user-1",
		VenueOrderID: "venue-3",
		MarketID:     "polymarket:market:1",
		TokenID:      "tok-b",
		Status:       orders.OrderStatusOpen,
		CreatedAt:    time.Now().UTC(),
	})

	venue := stubVenue{trade: []clob.VenueTrade{{
		TradeID: "trade-1",
		OrderID: "venue-3",
		Side:    "BUY",
		Price:   "0.40",
		Size:    "5",
	}}}
	worker := reconcile.NewWorker(reconcile.WorkerConfig{Store: store, Venue: venue, Metrics: newStubMetrics()})

	worker.RunOnce(context.Background())
	worker.RunOnce(context.Background())

	fills := store.ListFills("user-1", orders.ListFillsFilter{})
	if len(fills) != 1 {
		t.Fatalf("fills = %d, want 1", len(fills))
	}
	if fills[0].VenueTradeID != "trade-1" {
		t.Fatalf("venue trade id = %q", fills[0].VenueTradeID)
	}
}

func TestWorkerNeverAutoResubmitsUnknownWithoutVenueMatch(t *testing.T) {
	t.Parallel()

	now := time.Now().UTC()
	store := orders.NewProjectionStore()
	store.PutOrder(orders.UserOrderRecord{
		OrderID:   "ord-4",
		UserID:    "user-1",
		Status:    orders.OrderStatusUnknown,
		Maker:     "0xmaker",
		TokenID:   "tok-x",
		Side:      "BUY",
		Price:     "0.50",
		CreatedAt: now,
	})

	worker := reconcile.NewWorker(reconcile.WorkerConfig{
		Store:        store,
		Venue:        stubVenue{},
		Metrics:      newStubMetrics(),
		UnknownGrace: 90 * time.Second,
		Now:          func() time.Time { return now },
	})
	worker.RunOnce(context.Background())

	rec, _ := store.GetOrder("ord-4")
	if rec.Status != orders.OrderStatusUnknown {
		t.Fatalf("status = %q, want unknown (no auto-resubmit)", rec.Status)
	}
}

func TestWorkerStaysUnknownOnUpstreamError(t *testing.T) {
	t.Parallel()

	store := orders.NewProjectionStore()
	store.PutOrder(orders.UserOrderRecord{
		OrderID:   "ord-5",
		UserID:    "user-1",
		Status:    orders.OrderStatusUnknown,
		Maker:     "0xmaker",
		CreatedAt: time.Now().UTC().Add(-2 * time.Minute),
	})

	metrics := newStubMetrics()
	worker := reconcile.NewWorker(reconcile.WorkerConfig{
		Store: store,
		Venue: stubVenue{err: context.DeadlineExceeded},
		Metrics: metrics,
	})
	worker.RunOnce(context.Background())

	rec, _ := store.GetOrder("ord-5")
	if rec.Status != orders.OrderStatusUnknown {
		t.Fatalf("status = %q, want unknown on upstream error", rec.Status)
	}
	if metrics.errors["upstream"] < 1 {
		t.Fatalf("errors = %+v", metrics.errors)
	}
}
