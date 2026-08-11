package orders

import (
	"context"
	"errors"
	"os"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/db"
	"retropick/apps/backend/internal/markets/clob"
	"retropick/apps/backend/internal/markets/wallet"
)

func TestSubmitOrderPostgresJournalConcurrentAcrossServicesOneVenueCall(t *testing.T) {
	pool := durableSubmitPool(t)
	cleanupDurableSubmitRows(t, pool)
	t.Cleanup(func() { cleanupDurableSubmitRows(t, pool) })

	fixed := time.Date(2026, 8, 11, 14, 0, 0, 0, time.UTC)
	previewID := uuid.NewString()
	rec := durableSubmitPreviewRecord(t, previewID, fixed)
	req := SubmitRequest{
		PreviewID:   previewID,
		ContentHash: rec.ContentHash,
		Signature:   "0x" + repeatByteHex("ab", 64),
	}
	session := wallet.SessionContext{UserID: "submit-durable-user", SignerAddress: rec.UnsignedPayload.Signer}
	venue := &durableCountingSubmitter{result: clob.SubmitResult{OrderID: "venue-durable-1", Status: "live", Success: true}}

	const instances = 4
	services := make([]*Service, 0, instances)
	for i := 0; i < instances; i++ {
		store := NewPreviewStore()
		store.Put(rec)
		services = append(services, NewService(ServiceConfig{
			Store: store,
			Now:   func() time.Time { return fixed },
			Submit: SubmitConfig{
				OrderSubmitEnabled: true,
				Venue:              venue,
				Journal:            NewPostgresMutationJournal(pool),
			},
		}))
	}

	const callers = 100
	var wg sync.WaitGroup
	start := make(chan struct{})
	errs := make(chan error, callers)
	statuses := make(chan int, callers)
	for i := 0; i < callers; i++ {
		wg.Add(1)
		svc := services[i%len(services)]
		go func() {
			defer wg.Done()
			<-start
			_, status, err := svc.SubmitOrder(context.Background(), session, "same-submit-key", req)
			statuses <- status
			errs <- err
		}()
	}
	close(start)
	wg.Wait()
	close(statuses)
	close(errs)

	for err := range errs {
		if err != nil {
			t.Fatalf("SubmitOrder error: %v", err)
		}
	}
	for status := range statuses {
		if status != httpStatusSubmitCreated {
			t.Fatalf("status = %d, want %d", status, httpStatusSubmitCreated)
		}
	}
	if calls := venue.calls.Load(); calls != 1 {
		t.Fatalf("venue calls = %d, want 1", calls)
	}

	var ordersCount, attempts int
	var orderStatus, attemptStatus string
	if err := pool.QueryRow(context.Background(), `
SELECT count(*), max(status)
FROM markets_user_orders
WHERE user_id = 'submit-durable-user' AND idempotency_key = 'same-submit-key'
`).Scan(&ordersCount, &orderStatus); err != nil {
		t.Fatal(err)
	}
	if err := pool.QueryRow(context.Background(), `
SELECT count(*), max(attempt_status)
FROM markets_order_attempts
WHERE user_id = 'submit-durable-user' AND idempotency_key = 'same-submit-key'
`).Scan(&attempts, &attemptStatus); err != nil {
		t.Fatal(err)
	}
	if ordersCount != 1 || attempts != 1 || orderStatus != orderStatusOpen || attemptStatus != MutationStateAccepted {
		t.Fatalf("db order/attempt/state = %d/%d/%s/%s", ordersCount, attempts, orderStatus, attemptStatus)
	}
}

func TestSubmitOrderPostgresJournalSameKeyDifferentBodyConflicts(t *testing.T) {
	pool := durableSubmitPool(t)
	cleanupDurableSubmitRows(t, pool)
	t.Cleanup(func() { cleanupDurableSubmitRows(t, pool) })

	fixed := time.Date(2026, 8, 11, 14, 15, 0, 0, time.UTC)
	previewID := uuid.NewString()
	rec := durableSubmitPreviewRecord(t, previewID, fixed)
	session := wallet.SessionContext{UserID: "submit-durable-user", SignerAddress: rec.UnsignedPayload.Signer}
	venue := &durableCountingSubmitter{result: clob.SubmitResult{OrderID: "venue-conflict", Status: "live", Success: true}}

	firstStore := NewPreviewStore()
	firstStore.Put(rec)
	firstSvc := NewService(ServiceConfig{
		Store: firstStore,
		Now:   func() time.Time { return fixed },
		Submit: SubmitConfig{
			OrderSubmitEnabled: true,
			Venue:              venue,
			Journal:            NewPostgresMutationJournal(pool),
		},
	})
	req := SubmitRequest{
		PreviewID:   previewID,
		ContentHash: rec.ContentHash,
		Signature:   "0x" + repeatByteHex("ab", 64),
	}
	if _, status, err := firstSvc.SubmitOrder(context.Background(), session, "semantic-conflict-key", req); err != nil || status != httpStatusSubmitCreated {
		t.Fatalf("first SubmitOrder status=%d err=%v", status, err)
	}

	secondStore := NewPreviewStore()
	secondStore.Put(rec)
	secondSvc := NewService(ServiceConfig{
		Store: secondStore,
		Now:   func() time.Time { return fixed },
		Submit: SubmitConfig{
			OrderSubmitEnabled: true,
			Venue:              venue,
			Journal:            NewPostgresMutationJournal(pool),
		},
	})
	conflicting := req
	conflicting.Signature = "0x" + repeatByteHex("cd", 64)
	if _, status, err := secondSvc.SubmitOrder(context.Background(), session, "semantic-conflict-key", conflicting); !errors.Is(err, ErrIdempotencyConflict) || status != httpStatusIdempotencyConflict {
		t.Fatalf("conflicting SubmitOrder status=%d err=%v", status, err)
	}
	if calls := venue.calls.Load(); calls != 1 {
		t.Fatalf("venue calls = %d, want 1", calls)
	}
}

func TestSubmitOrderPostgresJournalCrashAfterAttemptNeverResubmits(t *testing.T) {
	pool := durableSubmitPool(t)
	cleanupDurableSubmitRows(t, pool)
	t.Cleanup(func() { cleanupDurableSubmitRows(t, pool) })

	fixed := time.Date(2026, 8, 11, 14, 30, 0, 0, time.UTC)
	previewID := uuid.NewString()
	rec := durableSubmitPreviewRecord(t, previewID, fixed)
	req := SubmitRequest{
		PreviewID:   previewID,
		ContentHash: rec.ContentHash,
		Signature:   "0x" + repeatByteHex("ab", 64),
	}
	bodyHash := hashSubmitBody(req)
	journal := NewPostgresMutationJournal(pool)
	claim, err := journal.ClaimSubmit(context.Background(), SubmitMutationClaim{
		UserID:             "submit-durable-user",
		IdempotencyKey:     "crash-after-attempt-key",
		RequestFingerprint: bodyHash,
		Intent:             mutationIntentFromPreview(req, rec, bodyHash),
	})
	if err != nil {
		t.Fatalf("ClaimSubmit: %v", err)
	}
	if !claim.ShouldSubmit || claim.AttemptID == uuid.Nil {
		t.Fatalf("initial claim = %+v", claim)
	}

	store := NewPreviewStore()
	store.Put(rec)
	venue := &durableCountingSubmitter{result: clob.SubmitResult{OrderID: "must-not-post", Status: "live", Success: true}}
	restarted := NewService(ServiceConfig{
		Store: store,
		Now:   func() time.Time { return fixed },
		Submit: SubmitConfig{
			OrderSubmitEnabled: true,
			Venue:              venue,
			Journal:            NewPostgresMutationJournal(pool),
		},
	})
	resp, status, err := restarted.SubmitOrder(context.Background(), wallet.SessionContext{UserID: "submit-durable-user", SignerAddress: rec.UnsignedPayload.Signer}, "crash-after-attempt-key", req)
	if err != nil || status != httpStatusSubmitCreated {
		t.Fatalf("restarted SubmitOrder status=%d err=%v", status, err)
	}
	if resp.Status != orderStatusUnknown || len(resp.Warnings) != 1 || resp.Warnings[0] != "unknown_reconciling" {
		t.Fatalf("restarted response = %+v", resp)
	}
	if calls := venue.calls.Load(); calls != 0 {
		t.Fatalf("venue calls after restart = %d, want 0", calls)
	}
}

func TestSubmitOrderResponseLostPersistsDurableRecoveryState(t *testing.T) {
	pool := durableSubmitPool(t)
	cleanupDurableSubmitRows(t, pool)
	t.Cleanup(func() { cleanupDurableSubmitRows(t, pool) })

	fixed := time.Date(2026, 8, 11, 15, 0, 0, 0, time.UTC)
	previewID := uuid.NewString()
	rec := durableSubmitPreviewRecord(t, previewID, fixed)
	req := SubmitRequest{
		PreviewID:   previewID,
		ContentHash: rec.ContentHash,
		Signature:   "0x" + repeatByteHex("cd", 64),
	}
	session := wallet.SessionContext{UserID: "submit-durable-user", SignerAddress: rec.UnsignedPayload.Signer}
	venue := &durableCountingSubmitter{err: clob.ErrSubmitUnknown}
	store := NewPreviewStore()
	store.Put(rec)
	svc := NewService(ServiceConfig{
		Store: store,
		Now:   func() time.Time { return fixed },
		Submit: SubmitConfig{
			OrderSubmitEnabled: true,
			Venue:              venue,
			Journal:            NewPostgresMutationJournal(pool),
		},
	})

	resp, status, err := svc.SubmitOrder(context.Background(), session, "lost-response-key", req)
	if err != nil || status != httpStatusSubmitCreated || resp.Status != orderStatusUnknown {
		t.Fatalf("unknown submit resp/status/err = %+v/%d/%v", resp, status, err)
	}
	if calls := venue.calls.Load(); calls != 1 {
		t.Fatalf("venue calls after unknown submit = %d, want 1", calls)
	}

	var orderStatus, attemptStatus string
	if err := pool.QueryRow(context.Background(), `
SELECT o.status, a.attempt_status
FROM markets_user_orders o
JOIN markets_order_attempts a ON a.order_id = o.id
WHERE o.user_id = 'submit-durable-user' AND o.idempotency_key = 'lost-response-key'
`).Scan(&orderStatus, &attemptStatus); err != nil {
		t.Fatal(err)
	}
	if orderStatus != orderStatusUnknown || attemptStatus != MutationStateUnknownReconciling {
		t.Fatalf("durable recovery state = %s/%s", orderStatus, attemptStatus)
	}
}

type durableCountingSubmitter struct {
	result clob.SubmitResult
	err    error
	calls  atomic.Int32
}

func (s *durableCountingSubmitter) SubmitOrder(context.Context, clob.SubmitRequest) (clob.SubmitResult, error) {
	s.calls.Add(1)
	time.Sleep(20 * time.Millisecond)
	return s.result, s.err
}

func durableSubmitPreviewRecord(t *testing.T, previewID string, now time.Time) previewRecord {
	t.Helper()
	payload := UnsignedOrderPayload{
		Salt:          "42",
		Maker:         "0x1111111111111111111111111111111111111111",
		Signer:        "0x2222222222222222222222222222222222222222",
		TokenID:       "999001",
		MakerAmount:   "42000000",
		TakerAmount:   "100000000",
		Side:          0,
		SignatureType: 0,
		Timestamp:     "1786456800000",
	}
	meta := hashMetadata{ChainID: polygonChainID, MarketID: "polymarket:market:durable", TokenID: "999001"}
	contentHash, err := ComputeContentHash(payload, meta)
	if err != nil {
		t.Fatal(err)
	}
	return previewRecord{
		PreviewID:       previewID,
		UserID:          "submit-durable-user",
		ContentHash:     contentHash,
		ExpiresAt:       now.Add(5 * time.Minute),
		UnsignedPayload: payload,
		Metadata:        meta,
		Side:            SideBuy,
		Price:           "0.42",
		Size:            "100",
		ExchangeDomain:  ExchangeDomainStandard,
	}
}

func durableSubmitPool(t *testing.T) *pgxpool.Pool {
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

func cleanupDurableSubmitRows(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	ctx := context.Background()
	for _, query := range []string{
		`DELETE FROM markets_order_attempts WHERE user_id = 'submit-durable-user'`,
		`DELETE FROM markets_user_orders WHERE user_id = 'submit-durable-user'`,
		`DELETE FROM markets_order_previews WHERE user_id = 'submit-durable-user'`,
	} {
		if _, err := pool.Exec(ctx, query); err != nil {
			t.Fatalf("cleanup durable submit rows: %v", err)
		}
	}
}

func repeatByteHex(pair string, n int) string {
	out := ""
	for i := 0; i < n; i++ {
		out += pair
	}
	return out
}
