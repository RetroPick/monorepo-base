package reconcile_test

import (
	"context"
	"os"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/db"
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

type countingVenue struct {
	open       []clob.VenueOpenOrder
	openCalls  atomic.Int32
	tradeCalls atomic.Int32
}

func (s *countingVenue) ListOpenOrders(context.Context) ([]clob.VenueOpenOrder, error) {
	s.openCalls.Add(1)
	return s.open, nil
}

func (s *countingVenue) ListTrades(context.Context) ([]clob.VenueTrade, error) {
	s.tradeCalls.Add(1)
	return nil, nil
}

type stubMetrics struct {
	runs     int
	repaired int
	outcomes map[string]int
	scanned  int
	errors   map[string]int
	lastLag  time.Duration
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
			OrderID:       "venue-fp",
			ClientOrderID: "479249096354",
			Salt:          "479249096354",
			MakerAmount:   "5200000",
			TakerAmount:   "10000000",
			TokenID:       "tok-a",
			Side:          "BUY",
			Status:        "live",
			Maker:         "0xmaker",
		}}},
		Metrics: newStubMetrics(),
	})
	worker.RunOnce(context.Background())

	rec, _ := store.GetOrder("ord-fp")
	if rec.Status != orders.OrderStatusOpen || rec.VenueOrderID != "venue-fp" {
		t.Fatalf("rec = %+v", rec)
	}
}

func TestWorkerKeepsUnknownAfterGraceWhenVenueHasNoEvidence(t *testing.T) {
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
	if rec.Status != orders.OrderStatusUnknown {
		t.Fatalf("status = %q, want unknown", rec.Status)
	}
	if rec.RejectionReason != "" {
		t.Fatalf("reason = %q, want empty", rec.RejectionReason)
	}
	if metrics.outcomes["unknown"] != 1 || metrics.outcomes["rejected"] != 0 {
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

func TestWorkerRunsRecoveryImmediatelyOnStartup(t *testing.T) {
	store := orders.NewProjectionStore()
	store.PutOrder(orders.UserOrderRecord{
		OrderID:   "ord-startup",
		UserID:    "user-startup",
		Status:    orders.OrderStatusUnknown,
		Maker:     "0xmaker",
		CreatedAt: time.Now().UTC(),
	})
	venue := &countingVenue{}
	worker := reconcile.NewWorker(reconcile.WorkerConfig{
		Store:    store,
		Venue:    venue,
		Interval: time.Hour,
	})
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() { done <- worker.Run(ctx) }()
	deadline := time.NewTimer(time.Second)
	defer deadline.Stop()
	for venue.openCalls.Load() == 0 {
		select {
		case <-deadline.C:
			cancel()
			t.Fatal("startup recovery did not run before the first ticker interval")
		case <-time.After(time.Millisecond):
		}
	}
	cancel()
	if err := <-done; err != context.Canceled {
		t.Fatalf("Run error = %v, want context.Canceled", err)
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
		Store:   store,
		Venue:   stubVenue{err: context.DeadlineExceeded},
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

func TestWorkerRecoversPostgresJournalSubmittingAfterRestart(t *testing.T) {
	pool := reconcileJournalPool(t)
	cleanupReconcileJournalRows(t, pool)
	t.Cleanup(func() { cleanupReconcileJournalRows(t, pool) })

	journal := orders.NewPostgresMutationJournal(pool)
	claimInput := validReconcileMutationClaim("crash-inflight-key")
	claim, err := journal.ClaimSubmit(context.Background(), claimInput)
	if err != nil {
		t.Fatalf("ClaimSubmit: %v", err)
	}
	if !claim.ShouldSubmit {
		t.Fatalf("claim = %+v", claim)
	}

	store := orders.NewProjectionStore()
	worker := reconcile.NewWorker(reconcile.WorkerConfig{
		Store:   store,
		Journal: journal,
		Venue: stubVenue{open: []clob.VenueOpenOrder{{
			OrderID:       "venue-restart-open",
			ClientOrderID: claimInput.Intent.UnsignedPayload.Salt,
			Salt:          claimInput.Intent.UnsignedPayload.Salt,
			MakerAmount:   claimInput.Intent.UnsignedPayload.MakerAmount,
			TakerAmount:   claimInput.Intent.UnsignedPayload.TakerAmount,
			TokenID:       claimInput.Intent.TokenID,
			Side:          claimInput.Intent.Side,
			Status:        "live",
			Maker:         claimInput.Intent.MakerAddress,
		}}},
		Metrics: newStubMetrics(),
	})

	worker.RunOnce(context.Background())

	rec, ok := store.GetOrder(claim.OrderID.String())
	if !ok {
		t.Fatal("recovered order missing from projection store")
	}
	if rec.Status != orders.OrderStatusOpen || rec.VenueOrderID != "venue-restart-open" {
		t.Fatalf("recovered rec = %+v", rec)
	}
	var orderStatus, attemptStatus, venueID string
	if err := pool.QueryRow(context.Background(), `
SELECT o.status, a.attempt_status, COALESCE(o.upstream_id, '')
FROM markets_user_orders o
JOIN markets_order_attempts a ON a.order_id = o.id
WHERE o.id = $1
`, claim.OrderID).Scan(&orderStatus, &attemptStatus, &venueID); err != nil {
		t.Fatal(err)
	}
	if orderStatus != orders.OrderStatusOpen || attemptStatus != orders.MutationStateAccepted || venueID != "venue-restart-open" {
		t.Fatalf("journal order/attempt/venue = %s/%s/%s", orderStatus, attemptStatus, venueID)
	}
}

func TestWorkerRecoversPostgresJournalUnknownResponseLostAfterRestart(t *testing.T) {
	pool := reconcileJournalPool(t)
	cleanupReconcileJournalRows(t, pool)
	t.Cleanup(func() { cleanupReconcileJournalRows(t, pool) })

	journal := orders.NewPostgresMutationJournal(pool)
	claimInput := validReconcileMutationClaim("response-lost-key")
	claim, err := journal.ClaimSubmit(context.Background(), claimInput)
	if err != nil {
		t.Fatalf("ClaimSubmit: %v", err)
	}
	if err := journal.MarkSubmitUnknown(context.Background(), orders.SubmitMutationResult{
		OrderID:    claim.OrderID,
		AttemptID:  claim.AttemptID,
		HTTPStatus: 201,
		ErrorCode:  "response_lost",
		ObservedAt: time.Now().UTC(),
	}); err != nil {
		t.Fatalf("MarkSubmitUnknown: %v", err)
	}

	worker := reconcile.NewWorker(reconcile.WorkerConfig{
		Store:   orders.NewProjectionStore(),
		Journal: journal,
		Venue: stubVenue{open: []clob.VenueOpenOrder{{
			OrderID:       "venue-response-lost",
			ClientOrderID: claimInput.Intent.UnsignedPayload.Salt,
			Salt:          claimInput.Intent.UnsignedPayload.Salt,
			MakerAmount:   claimInput.Intent.UnsignedPayload.MakerAmount,
			TakerAmount:   claimInput.Intent.UnsignedPayload.TakerAmount,
			TokenID:       claimInput.Intent.TokenID,
			Side:          claimInput.Intent.Side,
			Status:        "live",
			Maker:         claimInput.Intent.MakerAddress,
		}}},
		Metrics: newStubMetrics(),
	})
	worker.RunOnce(context.Background())

	var orderStatus, attemptStatus, venueID string
	if err := pool.QueryRow(context.Background(), `
SELECT o.status, a.attempt_status, COALESCE(o.upstream_id, '')
FROM markets_user_orders o
JOIN markets_order_attempts a ON a.order_id = o.id
WHERE o.id = $1
`, claim.OrderID).Scan(&orderStatus, &attemptStatus, &venueID); err != nil {
		t.Fatal(err)
	}
	if orderStatus != orders.OrderStatusOpen || attemptStatus != orders.MutationStateAccepted || venueID != "venue-response-lost" {
		t.Fatalf("journal order/attempt/venue = %s/%s/%s", orderStatus, attemptStatus, venueID)
	}
}

func TestWorkerKeepsPostgresJournalUnknownWhenVenueEvidenceAbsent(t *testing.T) {
	pool := reconcileJournalPool(t)
	cleanupReconcileJournalRows(t, pool)
	t.Cleanup(func() { cleanupReconcileJournalRows(t, pool) })

	journal := orders.NewPostgresMutationJournal(pool)
	claimInput := validReconcileMutationClaim("response-lost-absent-key")
	claim, err := journal.ClaimSubmit(context.Background(), claimInput)
	if err != nil {
		t.Fatalf("ClaimSubmit: %v", err)
	}
	if err := journal.MarkSubmitUnknown(context.Background(), orders.SubmitMutationResult{
		OrderID:    claim.OrderID,
		AttemptID:  claim.AttemptID,
		HTTPStatus: 201,
		ErrorCode:  "response_lost",
		ObservedAt: time.Now().UTC().Add(-2 * time.Minute),
	}); err != nil {
		t.Fatalf("MarkSubmitUnknown: %v", err)
	}

	metrics := newStubMetrics()
	now := time.Now().UTC().Add(2 * time.Minute)
	worker := reconcile.NewWorker(reconcile.WorkerConfig{
		Store:        orders.NewProjectionStore(),
		Journal:      journal,
		Venue:        stubVenue{},
		Metrics:      metrics,
		UnknownGrace: time.Second,
		Now:          func() time.Time { return now },
	})
	worker.RunOnce(context.Background())

	var orderStatus, attemptStatus, errorCode string
	if err := pool.QueryRow(context.Background(), `
SELECT o.status, a.attempt_status, COALESCE(a.error_code, '')
FROM markets_user_orders o
JOIN markets_order_attempts a ON a.order_id = o.id
WHERE o.id = $1
`, claim.OrderID).Scan(&orderStatus, &attemptStatus, &errorCode); err != nil {
		t.Fatal(err)
	}
	if orderStatus != orders.OrderStatusUnknown || attemptStatus != orders.MutationStateUnknownReconciling || errorCode != "venue_evidence_absent" {
		t.Fatalf("journal unresolved state = %s/%s/%s", orderStatus, attemptStatus, errorCode)
	}
	if metrics.outcomes["unknown"] != 1 {
		t.Fatalf("metrics = %+v", metrics.outcomes)
	}
}

func TestWorkerHonorsPostgresLeaseAfterAmbiguousLookup(t *testing.T) {
	pool := reconcileJournalPool(t)
	cleanupReconcileJournalRows(t, pool)
	t.Cleanup(func() { cleanupReconcileJournalRows(t, pool) })

	journal := orders.NewPostgresMutationJournal(pool)
	claimInput := validReconcileMutationClaim("ambiguous-backoff-key")
	claim, err := journal.ClaimSubmit(context.Background(), claimInput)
	if err != nil {
		t.Fatalf("ClaimSubmit: %v", err)
	}
	if err := journal.MarkSubmitUnknown(context.Background(), orders.SubmitMutationResult{
		OrderID:    claim.OrderID,
		AttemptID:  claim.AttemptID,
		ErrorCode:  "response_lost",
		ObservedAt: time.Now().UTC().Add(-2 * time.Minute),
	}); err != nil {
		t.Fatalf("MarkSubmitUnknown: %v", err)
	}

	venue := &countingVenue{}
	worker := reconcile.NewWorker(reconcile.WorkerConfig{
		Store:        orders.NewProjectionStore(),
		Journal:      journal,
		Venue:        venue,
		UnknownGrace: time.Second,
	})
	worker.RunOnce(context.Background())
	worker.RunOnce(context.Background())

	if calls := venue.openCalls.Load(); calls != 1 {
		t.Fatalf("venue open-order lookups = %d, want one within lease window", calls)
	}
}

func TestWorkerConcurrentPostgresJournalRecoveryClaimsOneOwner(t *testing.T) {
	pool := reconcileJournalPool(t)
	cleanupReconcileJournalRows(t, pool)
	t.Cleanup(func() { cleanupReconcileJournalRows(t, pool) })

	journal := orders.NewPostgresMutationJournal(pool)
	claimInput := validReconcileMutationClaim("concurrent-worker-key")
	claim, err := journal.ClaimSubmit(context.Background(), claimInput)
	if err != nil {
		t.Fatalf("ClaimSubmit: %v", err)
	}
	if err := journal.MarkSubmitUnknown(context.Background(), orders.SubmitMutationResult{
		OrderID:    claim.OrderID,
		AttemptID:  claim.AttemptID,
		HTTPStatus: 201,
		ErrorCode:  "response_lost",
		ObservedAt: time.Now().UTC(),
	}); err != nil {
		t.Fatalf("MarkSubmitUnknown: %v", err)
	}

	venue := &countingVenue{open: []clob.VenueOpenOrder{{
		OrderID:       "venue-concurrent-recovered",
		ClientOrderID: claimInput.Intent.UnsignedPayload.Salt,
		Salt:          claimInput.Intent.UnsignedPayload.Salt,
		MakerAmount:   claimInput.Intent.UnsignedPayload.MakerAmount,
		TakerAmount:   claimInput.Intent.UnsignedPayload.TakerAmount,
		TokenID:       claimInput.Intent.TokenID,
		Side:          claimInput.Intent.Side,
		Status:        "live",
		Maker:         claimInput.Intent.MakerAddress,
	}}}
	workers := []*reconcile.Worker{
		reconcile.NewWorker(reconcile.WorkerConfig{Store: orders.NewProjectionStore(), Journal: journal, Venue: venue, Metrics: newStubMetrics()}),
		reconcile.NewWorker(reconcile.WorkerConfig{Store: orders.NewProjectionStore(), Journal: journal, Venue: venue, Metrics: newStubMetrics()}),
	}

	var wg sync.WaitGroup
	start := make(chan struct{})
	for _, worker := range workers {
		wg.Add(1)
		go func(worker *reconcile.Worker) {
			defer wg.Done()
			<-start
			worker.RunOnce(context.Background())
		}(worker)
	}
	close(start)
	wg.Wait()

	var orderStatus, attemptStatus, venueID string
	if err := pool.QueryRow(context.Background(), `
SELECT o.status, a.attempt_status, COALESCE(o.upstream_id, '')
FROM markets_user_orders o
JOIN markets_order_attempts a ON a.order_id = o.id
WHERE o.id = $1
`, claim.OrderID).Scan(&orderStatus, &attemptStatus, &venueID); err != nil {
		t.Fatal(err)
	}
	if orderStatus != orders.OrderStatusOpen || attemptStatus != orders.MutationStateAccepted || venueID != "venue-concurrent-recovered" {
		t.Fatalf("journal order/attempt/venue = %s/%s/%s", orderStatus, attemptStatus, venueID)
	}
	if calls := venue.openCalls.Load(); calls < 1 || calls > 2 {
		t.Fatalf("venue open-order lookups = %d, want bounded harmless lookups", calls)
	}
}

func reconcileJournalPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DATABASE_URL not set")
	}
	if err := db.RunMigrations(databaseURL); err != nil {
		t.Fatalf("RunMigrations: %v", err)
	}
	pool, err := pgxpool.New(context.Background(), databaseURL)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	return pool
}

func cleanupReconcileJournalRows(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	for _, query := range []string{
		`DELETE FROM markets_order_attempts WHERE user_id = 'reconcile-journal-user'`,
		`DELETE FROM markets_user_orders WHERE user_id = 'reconcile-journal-user'`,
		`DELETE FROM markets_order_previews WHERE user_id = 'reconcile-journal-user'`,
	} {
		if _, err := pool.Exec(context.Background(), query); err != nil {
			t.Fatalf("cleanup reconcile journal rows: %v", err)
		}
	}
}

func validReconcileMutationClaim(key string) orders.SubmitMutationClaim {
	previewID := "11111111-1111-1111-1111-111111111111"
	return orders.SubmitMutationClaim{
		UserID:             "reconcile-journal-user",
		IdempotencyKey:     key,
		RequestFingerprint: "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
		Intent: orders.OrderMutationIntent{
			PreviewID:         mustParseUUID(previewID),
			ContentHash:       "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
			SignedPayloadHash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
			MarketID:          "polymarket:market:reconcile",
			TokenID:           "999001",
			Side:              orders.SideBuy,
			Price:             "0.420000",
			Size:              "100.000000",
			MakerAmount:       "42000000",
			TakerAmount:       "100000000",
			ExchangeDomain:    orders.ExchangeDomainStandard,
			MakerAddress:      "0x1111111111111111111111111111111111111111",
			SignerAddress:     "0x2222222222222222222222222222222222222222",
			UnsignedPayload: orders.UnsignedOrderPayload{
				Salt:          "479249096354",
				Maker:         "0x1111111111111111111111111111111111111111",
				Signer:        "0x2222222222222222222222222222222222222222",
				TokenID:       "999001",
				MakerAmount:   "42000000",
				TakerAmount:   "100000000",
				Side:          0,
				SignatureType: 0,
				Timestamp:     "1786456800000",
			},
			ExpiresAt: time.Now().UTC().Add(5 * time.Minute),
		},
	}
}

func mustParseUUID(raw string) uuid.UUID {
	parsed, err := uuid.Parse(raw)
	if err != nil {
		panic(err)
	}
	return parsed
}
