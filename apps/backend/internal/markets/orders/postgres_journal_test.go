package orders_test

import (
	"context"
	"errors"
	"fmt"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/db"
	"retropick/apps/backend/internal/markets/orders"
)

func TestMutationClaimRejectsInvalidFixedPointAndFingerprint(t *testing.T) {
	t.Parallel()

	claim := validMutationClaim("journal-validation-user", "journal-validation-key")
	claim.Intent.Price = "0.5e1"
	if err := claim.Validate(); !errors.Is(err, orders.ErrJournalInvalidInput) {
		t.Fatalf("Validate() error = %v, want ErrJournalInvalidInput", err)
	}

	claim = validMutationClaim("journal-validation-user", "journal-validation-key")
	claim.RequestFingerprint = "not-a-sha256"
	if err := claim.Validate(); !errors.Is(err, orders.ErrJournalInvalidInput) {
		t.Fatalf("Validate() error = %v, want ErrJournalInvalidInput", err)
	}
}

func TestPostgresMutationJournalClaimUsesExistingOrderTables(t *testing.T) {
	journal, pool := integrationMutationJournal(t)
	ctx := context.Background()

	first, err := journal.ClaimSubmit(ctx, validMutationClaim("journal-test-user-a", "same-key"))
	if err != nil {
		t.Fatalf("first ClaimSubmit: %v", err)
	}
	if first.Existing || !first.ShouldSubmit || first.AttemptNumber != 1 || first.State != orders.MutationStateSubmitting {
		t.Fatalf("first claim = %+v", first)
	}

	replay, err := journal.ClaimSubmit(ctx, validMutationClaim("journal-test-user-a", "same-key"))
	if err != nil {
		t.Fatalf("replay ClaimSubmit: %v", err)
	}
	if !replay.Existing || replay.ShouldSubmit || replay.OrderID != first.OrderID || replay.AttemptID != first.AttemptID {
		t.Fatalf("replay claim = %+v, first = %+v", replay, first)
	}

	otherUser, err := journal.ClaimSubmit(ctx, validMutationClaim("journal-test-user-b", "same-key"))
	if err != nil {
		t.Fatalf("other user ClaimSubmit: %v", err)
	}
	if otherUser.Existing || otherUser.OrderID == first.OrderID {
		t.Fatalf("other-user claim = %+v, first = %+v", otherUser, first)
	}

	conflict := validMutationClaim("journal-test-user-a", "same-key")
	conflict.RequestFingerprint = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
	_, err = journal.ClaimSubmit(ctx, conflict)
	if !errors.Is(err, orders.ErrJournalIdempotencyConflict) {
		t.Fatalf("conflicting claim error = %v, want ErrJournalIdempotencyConflict", err)
	}

	var ordersCount, attempts int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM markets_user_orders WHERE user_id LIKE 'journal-test-user-%'`).Scan(&ordersCount); err != nil {
		t.Fatal(err)
	}
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM markets_order_attempts a JOIN markets_user_orders o ON o.id = a.order_id WHERE o.user_id LIKE 'journal-test-user-%'`).Scan(&attempts); err != nil {
		t.Fatal(err)
	}
	if ordersCount != 2 || attempts != 2 {
		t.Fatalf("order/attempt counts = %d/%d, want 2/2", ordersCount, attempts)
	}
}

func TestPostgresMutationJournalConcurrentClaimCreatesOneAttempt(t *testing.T) {
	journal, pool := integrationMutationJournal(t)
	ctx := context.Background()
	const callers = 100

	claims := make(chan orders.MutationClaim, callers)
	errs := make(chan error, callers)
	var wg sync.WaitGroup
	for i := 0; i < callers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			claim, err := journal.ClaimSubmit(ctx, validMutationClaim("journal-test-race", "concurrent-key"))
			if err != nil {
				errs <- err
				return
			}
			claims <- claim
		}()
	}
	wg.Wait()
	close(claims)
	close(errs)
	for err := range errs {
		t.Fatalf("concurrent ClaimSubmit: %v", err)
	}

	created := 0
	var orderID uuid.UUID
	for claim := range claims {
		if claim.ShouldSubmit {
			created++
		}
		if orderID == uuid.Nil {
			orderID = claim.OrderID
		}
		if claim.OrderID != orderID {
			t.Fatalf("inconsistent concurrent claim: %+v", claim)
		}
	}
	if created != 1 {
		t.Fatalf("submit-capable claims = %d, want 1", created)
	}

	var attempts int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM markets_order_attempts WHERE order_id = $1`, orderID).Scan(&attempts); err != nil {
		t.Fatal(err)
	}
	if attempts != 1 {
		t.Fatalf("attempt count = %d, want 1", attempts)
	}
}

func TestPostgresMutationJournalMarksUnknownWithoutSecondAttempt(t *testing.T) {
	journal, pool := integrationMutationJournal(t)
	ctx := context.Background()

	claim, err := journal.ClaimSubmit(ctx, validMutationClaim("journal-test-unknown", "lost-response-key"))
	if err != nil {
		t.Fatalf("ClaimSubmit: %v", err)
	}
	if err := journal.MarkSubmitUnknown(ctx, orders.SubmitMutationResult{
		OrderID:    claim.OrderID,
		AttemptID:  claim.AttemptID,
		HTTPStatus: 201,
		ErrorCode:  "response_lost",
		Response:   map[string]string{"status": "unknown"},
		ObservedAt: time.Now().UTC(),
	}); err != nil {
		t.Fatalf("MarkSubmitUnknown: %v", err)
	}
	replay, err := journal.ClaimSubmit(ctx, validMutationClaim("journal-test-unknown", "lost-response-key"))
	if err != nil {
		t.Fatalf("replay ClaimSubmit: %v", err)
	}
	if replay.ShouldSubmit || !replay.Existing || replay.OrderID != claim.OrderID {
		t.Fatalf("unknown replay claim = %+v", replay)
	}
	var status, attemptStatus string
	var attempts int
	if err := pool.QueryRow(ctx, `
SELECT o.status, a.attempt_status, count(*) OVER ()
FROM markets_user_orders o
JOIN markets_order_attempts a ON a.order_id = o.id
WHERE o.id = $1
`, claim.OrderID).Scan(&status, &attemptStatus, &attempts); err != nil {
		t.Fatal(err)
	}
	if status != orders.OrderStatusUnknown || attemptStatus != orders.MutationStateUnknownReconciling || attempts != 1 {
		t.Fatalf("status/attempt/attempts = %s/%s/%d", status, attemptStatus, attempts)
	}
}

func TestPostgresMutationJournalIntentWithoutAttemptIsRecoverableNoSubmit(t *testing.T) {
	_, pool := integrationMutationJournal(t)
	journal := orders.NewPostgresMutationJournal(pool)
	ctx := context.Background()
	claim := validMutationClaim("journal-test-crash-intent", "intent-only-key")

	if _, err := pool.Exec(ctx, `
INSERT INTO markets_order_previews (
    id, user_id, market_id, token_id, side, price, size, order_type,
    maker_address, signer_address, exchange_domain, content_hash, expires_at,
    unsigned_payload_json, human_summary_json
) VALUES ($1,$2,$3,$4,$5,$6,$7,'LIMIT',$8,$9,$10,$11,$12,'{}','{}')
ON CONFLICT (id) DO NOTHING
`, claim.Intent.PreviewID, claim.UserID, claim.Intent.MarketID, claim.Intent.TokenID, claim.Intent.Side,
		claim.Intent.Price, claim.Intent.Size, claim.Intent.MakerAddress, claim.Intent.SignerAddress,
		claim.Intent.ExchangeDomain, claim.Intent.ContentHash, claim.Intent.ExpiresAt); err != nil {
		t.Fatal(err)
	}
	orderID := uuid.New()
	if _, err := pool.Exec(ctx, `
INSERT INTO markets_user_orders (
    id, user_id, market_id, token_id, side, order_type, price,
    original_size, remaining_size, matched_size, status, idempotency_key,
    preview_id, preview_ref, request_fingerprint, content_hash,
    signed_payload_hash, maker_address, signer_address, exchange_domain
) VALUES ($1,$2,$3,$4,$5,'LIMIT',$6,$7,$7,'0',$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
`, orderID, claim.UserID, claim.Intent.MarketID, claim.Intent.TokenID, claim.Intent.Side, claim.Intent.Price,
		claim.Intent.Size, orders.MutationStateIntentPersisted, claim.IdempotencyKey, claim.Intent.PreviewID,
		claim.Intent.PreviewID.String(), claim.RequestFingerprint, claim.Intent.ContentHash,
		claim.Intent.SignedPayloadHash, claim.Intent.MakerAddress, claim.Intent.SignerAddress,
		claim.Intent.ExchangeDomain); err != nil {
		t.Fatal(err)
	}

	replay, err := journal.ClaimSubmit(ctx, claim)
	if err != nil {
		t.Fatalf("ClaimSubmit replay: %v", err)
	}
	if !replay.Existing || replay.ShouldSubmit || replay.AttemptNumber != 0 || replay.AttemptID != uuid.Nil {
		t.Fatalf("intent-only replay = %+v", replay)
	}

	candidates, err := journal.ListSubmitReconciliationCandidates(ctx, 10)
	if err != nil {
		t.Fatalf("ListSubmitReconciliationCandidates: %v", err)
	}
	found := false
	for _, rec := range candidates {
		if rec.OrderID == orderID.String() {
			found = true
			if rec.AttemptID != "" || rec.Status != orders.MutationStateIntentPersisted {
				t.Fatalf("intent-only candidate = %+v", rec)
			}
		}
	}
	if !found {
		t.Fatalf("intent-only order %s not listed for recovery", orderID)
	}

	if err := journal.MarkSubmitNotSubmitted(ctx, orderID.String(), time.Now().UTC()); err != nil {
		t.Fatalf("MarkSubmitNotSubmitted: %v", err)
	}
	var status string
	if err := pool.QueryRow(ctx, `SELECT status FROM markets_user_orders WHERE id = $1`, orderID).Scan(&status); err != nil {
		t.Fatal(err)
	}
	if status != orders.OrderStatusNotSubmitted {
		t.Fatalf("status = %q, want not_submitted", status)
	}
}

func TestPostgresMutationJournalReconciliationMarksOpen(t *testing.T) {
	journal, pool := integrationMutationJournal(t)
	ctx := context.Background()

	claim, err := journal.ClaimSubmit(ctx, validMutationClaim("journal-test-reconcile", "accepted-lost-key"))
	if err != nil {
		t.Fatalf("ClaimSubmit: %v", err)
	}
	candidates, err := journal.ListSubmitReconciliationCandidates(ctx, 10)
	if err != nil {
		t.Fatalf("ListSubmitReconciliationCandidates: %v", err)
	}
	found := false
	for _, rec := range candidates {
		if rec.OrderID == claim.OrderID.String() {
			found = true
			if rec.AttemptID != claim.AttemptID.String() || rec.MakerAmount == "" || rec.TakerAmount == "" || rec.Salt == "" {
				t.Fatalf("candidate = %+v, claim = %+v", rec, claim)
			}
		}
	}
	if !found {
		t.Fatalf("order %s not listed for recovery", claim.OrderID)
	}

	if err := journal.MarkSubmitReconciledOpen(ctx, claim.OrderID.String(), claim.AttemptID.String(), "venue-recovered", time.Now().UTC()); err != nil {
		t.Fatalf("MarkSubmitReconciledOpen: %v", err)
	}
	var orderStatus, attemptStatus, venueID string
	if err := pool.QueryRow(ctx, `
SELECT o.status, a.attempt_status, COALESCE(o.upstream_id, '')
FROM markets_user_orders o
JOIN markets_order_attempts a ON a.order_id = o.id
WHERE o.id = $1
`, claim.OrderID).Scan(&orderStatus, &attemptStatus, &venueID); err != nil {
		t.Fatal(err)
	}
	if orderStatus != orders.OrderStatusOpen || attemptStatus != orders.MutationStateAccepted || venueID != "venue-recovered" {
		t.Fatalf("order/attempt/venue = %s/%s/%s", orderStatus, attemptStatus, venueID)
	}
}

func TestPostgresMutationJournalUnknownPreservesSignedOrderIdentity(t *testing.T) {
	journal, pool := integrationMutationJournal(t)
	ctx := context.Background()
	input := validMutationClaim("journal-test-identity-user", "identity-key")
	claim, err := journal.ClaimSubmit(ctx, input)
	if err != nil {
		t.Fatalf("ClaimSubmit: %v", err)
	}
	if err := journal.MarkSubmitUnknown(ctx, orders.SubmitMutationResult{
		OrderID:    claim.OrderID,
		AttemptID:  claim.AttemptID,
		ErrorCode:  "response_lost",
		Response:   map[string]string{"status": "unknown_reconciling"},
		ObservedAt: time.Now().UTC(),
	}); err != nil {
		t.Fatalf("MarkSubmitUnknown: %v", err)
	}

	var makerAmount, takerAmount, salt string
	if err := pool.QueryRow(ctx, `
SELECT payload_json #>> '{unsignedPayload,makerAmount}',
       payload_json #>> '{unsignedPayload,takerAmount}',
       payload_json #>> '{unsignedPayload,salt}'
FROM markets_user_orders WHERE id = $1
`, claim.OrderID).Scan(&makerAmount, &takerAmount, &salt); err != nil {
		t.Fatal(err)
	}
	if makerAmount != input.Intent.MakerAmount || takerAmount != input.Intent.TakerAmount || salt != input.Intent.UnsignedPayload.Salt {
		t.Fatalf("signed identity overwritten = %q/%q/%q", makerAmount, takerAmount, salt)
	}
}

func TestPostgresMutationJournalPersistsCanonicalFilledRecovery(t *testing.T) {
	journal, pool := integrationMutationJournal(t)
	ctx := context.Background()
	claim, err := journal.ClaimSubmit(ctx, validMutationClaim("journal-test-filled-user", "filled-key"))
	if err != nil {
		t.Fatalf("ClaimSubmit: %v", err)
	}
	if err := journal.MarkSubmitReconciled(ctx, claim.OrderID.String(), claim.AttemptID.String(), "venue-filled", orders.OrderStatusFilled, time.Now().UTC()); err != nil {
		t.Fatalf("MarkSubmitReconciled: %v", err)
	}
	var orderStatus, attemptStatus string
	if err := pool.QueryRow(ctx, `
SELECT o.status, a.attempt_status
FROM markets_user_orders o
JOIN markets_order_attempts a ON a.order_id = o.id
WHERE o.id = $1
`, claim.OrderID).Scan(&orderStatus, &attemptStatus); err != nil {
		t.Fatal(err)
	}
	if orderStatus != orders.OrderStatusFilled || attemptStatus != orders.MutationStateAccepted {
		t.Fatalf("canonical recovery state = %s/%s", orderStatus, attemptStatus)
	}
}

func TestPostgresMutationJournalClaimsRecoveryCandidateOncePerLease(t *testing.T) {
	journal, _ := integrationMutationJournal(t)
	ctx := context.Background()
	claim, err := journal.ClaimSubmit(ctx, validMutationClaim("journal-test-recovery-lease-user", "lease-key"))
	if err != nil {
		t.Fatalf("ClaimSubmit: %v", err)
	}

	start := make(chan struct{})
	counts := make(chan int, 2)
	errs := make(chan error, 2)
	for range 2 {
		go func() {
			<-start
			rows, claimErr := journal.ListSubmitReconciliationCandidates(ctx, 10)
			if claimErr != nil {
				errs <- claimErr
				return
			}
			count := 0
			for _, row := range rows {
				if row.OrderID == claim.OrderID.String() {
					count++
				}
			}
			counts <- count
		}()
	}
	close(start)

	total := 0
	for range 2 {
		select {
		case err := <-errs:
			t.Fatal(err)
		case count := <-counts:
			total += count
		}
	}
	if total != 1 {
		t.Fatalf("candidate claims = %d, want exactly 1", total)
	}
}

func validMutationClaim(userID, key string) orders.SubmitMutationClaim {
	previewID := uuid.New()
	return orders.SubmitMutationClaim{
		UserID:             userID,
		IdempotencyKey:     key,
		RequestFingerprint: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
		Intent: orders.OrderMutationIntent{
			PreviewID:         previewID,
			ContentHash:       "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
			SignedPayloadHash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
			MarketID:          "polymarket:market:123",
			TokenID:           "polymarket:token:456",
			Side:              orders.SideBuy,
			Price:             "0.500000",
			Size:              "10.000000",
			MakerAmount:       "5000000",
			TakerAmount:       "10000000",
			ExchangeDomain:    orders.ExchangeDomainStandard,
			MakerAddress:      "0x1111111111111111111111111111111111111111",
			SignerAddress:     "0x2222222222222222222222222222222222222222",
			UnsignedPayload: orders.UnsignedOrderPayload{
				Salt:          "42",
				Maker:         "0x1111111111111111111111111111111111111111",
				Signer:        "0x2222222222222222222222222222222222222222",
				TokenID:       "polymarket:token:456",
				MakerAmount:   "5000000",
				TakerAmount:   "10000000",
				Side:          0,
				SignatureType: 0,
				Timestamp:     "1780000000000",
			},
			ExpiresAt: time.Now().UTC().Add(5 * time.Minute),
		},
	}
}

func integrationMutationJournal(t *testing.T) (*orders.PostgresMutationJournal, *pgxpool.Pool) {
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
	cleanupJournalRows(t, pool)
	t.Cleanup(func() { cleanupJournalRows(t, pool) })
	return orders.NewPostgresMutationJournal(pool), pool
}

func cleanupJournalRows(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	ctx := context.Background()
	for _, query := range []string{
		`DELETE FROM markets_order_attempts WHERE user_id LIKE 'journal-test-%' OR user_id LIKE 'journal-validation-%'`,
		`DELETE FROM markets_user_orders WHERE user_id LIKE 'journal-test-%' OR user_id LIKE 'journal-validation-%'`,
		`DELETE FROM markets_order_previews WHERE user_id LIKE 'journal-test-%' OR user_id LIKE 'journal-validation-%'`,
	} {
		if _, err := pool.Exec(ctx, query); err != nil {
			t.Fatalf("cleanup %q: %v", query, err)
		}
	}
}

func TestPostgresMutationJournalHelpersUseUniqueKeys(t *testing.T) {
	t.Parallel()
	for i := 0; i < 3; i++ {
		claim := validMutationClaim("journal-validation-user", fmt.Sprintf("k-%d", i))
		if err := claim.Validate(); err != nil {
			t.Fatalf("claim %d invalid: %v", i, err)
		}
	}
}
