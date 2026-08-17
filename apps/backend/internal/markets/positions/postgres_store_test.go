package positions_test

import (
	"context"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/db"
	"retropick/apps/backend/internal/markets/positions"
)

func TestPostgresStorePersistsVenueRebuildAcrossRestart(t *testing.T) {
	pool := positionProjectionPool(t)
	ctx := context.Background()
	store := positions.NewPostgresStore(pool)
	observedAt := time.Date(2026, 8, 12, 10, 0, 0, 0, time.UTC)

	written, err := store.ApplyVenueRebuild(ctx, "projection-user-a", "0x1111111111111111111111111111111111111111", []positions.VenuePosition{{
		TokenID: "token-1", MarketID: "polymarket:market:1", ConditionID: "condition-1", OutcomeLabel: "Yes", Size: "12.500000", AvgPrice: "0.420000", UpstreamID: "venue-position-1",
	}}, observedAt)
	if err != nil {
		t.Fatalf("ApplyVenueRebuild: %v", err)
	}
	if written != 1 {
		t.Fatalf("written = %d, want 1", written)
	}

	// A fresh repository models process restart; rows must remain durable and exact.
	restarted := positions.NewPostgresStore(pool)
	rows, err := restarted.List(ctx, "projection-user-a")
	if err != nil {
		t.Fatalf("List after restart: %v", err)
	}
	if len(rows) != 1 || rows[0].Size != "12.500000" || rows[0].AvgPrice != "0.420000" {
		t.Fatalf("rows after restart = %+v", rows)
	}

	written, err = restarted.ApplyVenueRebuild(ctx, "projection-user-a", "0x1111111111111111111111111111111111111111", []positions.VenuePosition{{
		TokenID: "token-1", MarketID: "polymarket:market:1", ConditionID: "condition-1", OutcomeLabel: "Yes", Size: "12.500000", AvgPrice: "0.420000", UpstreamID: "venue-position-1",
	}}, observedAt)
	if err != nil {
		t.Fatalf("idempotent ApplyVenueRebuild: %v", err)
	}
	if written != 0 {
		t.Fatalf("idempotent written = %d, want 0", written)
	}

	var count int
	if err := pool.QueryRow(ctx, `SELECT COUNT(*) FROM markets_position_projections WHERE user_id = $1`, "projection-user-a").Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("position count = %d, want 1", count)
	}
}

func TestPostgresStoreReconciliationDoesNotCrossUserBoundary(t *testing.T) {
	pool := positionProjectionPool(t)
	ctx := context.Background()
	store := positions.NewPostgresStore(pool)
	observedAt := time.Date(2026, 8, 12, 10, 0, 0, 0, time.UTC)

	for _, input := range []struct{ userID, wallet, token, upstreamID string }{
		{"projection-user-a", "0x1111111111111111111111111111111111111111", "token-a", "venue-a"},
		{"projection-user-b", "0x2222222222222222222222222222222222222222", "token-b", "venue-b"},
	} {
		if _, err := store.ApplyVenueRebuild(ctx, input.userID, input.wallet, []positions.VenuePosition{{TokenID: input.token, MarketID: "polymarket:market:1", ConditionID: "condition-1", Size: "1", UpstreamID: input.upstreamID}}, observedAt); err != nil {
			t.Fatal(err)
		}
	}

	rows, err := store.List(ctx, "projection-user-a")
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 1 || rows[0].TokenID != "token-a" {
		t.Fatalf("user-a rows = %+v", rows)
	}
}

func TestPostgresStoreIsolatesSameVenueTokenAndUpstreamIDPerUser(t *testing.T) {
	pool := positionProjectionPool(t)
	ctx := context.Background()
	store := positions.NewPostgresStore(pool)
	observedAt := time.Date(2026, 8, 12, 11, 0, 0, 0, time.UTC)
	position := positions.VenuePosition{
		TokenID: "shared-token", MarketID: "polymarket:market:shared", ConditionID: "condition-shared",
		Size: "12.500000", AvgPrice: "0.420000", UpstreamID: "shared-venue-position",
	}
	for _, user := range []struct{ id, wallet string }{
		{"projection-user-shared-a", "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},
		{"projection-user-shared-b", "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"},
		{"projection-user-shared-a", "0xcccccccccccccccccccccccccccccccccccccccc"},
	} {
		if _, err := store.ApplyVenueRebuild(ctx, user.id, user.wallet, []positions.VenuePosition{position}, observedAt); err != nil {
			t.Fatalf("ApplyVenueRebuild(%s): %v", user.id, err)
		}
		var count int
		if err := pool.QueryRow(ctx, `SELECT COUNT(*) FROM markets_position_projections WHERE user_id = $1 AND account_wallet = $2 AND token_id = $3`, user.id, user.wallet, position.TokenID).Scan(&count); err != nil || count != 1 {
			t.Fatalf("isolated row (%s, %s) count = %d, %v", user.id, user.wallet, count, err)
		}
	}
}

func TestPostgresStoreRejectsNonCanonicalFixedPointBeforePersistence(t *testing.T) {
	pool := positionProjectionPool(t)
	ctx := context.Background()
	store := positions.NewPostgresStore(pool)
	observedAt := time.Date(2026, 8, 12, 12, 0, 0, 0, time.UTC)

	for _, row := range []positions.VenuePosition{
		{TokenID: "invalid-size", MarketID: "polymarket:market:fixed", ConditionID: "condition-fixed", Size: "NaN", AvgPrice: "0.5"},
		{TokenID: "invalid-price", MarketID: "polymarket:market:fixed", ConditionID: "condition-fixed", Size: "1", AvgPrice: "Infinity"},
		{TokenID: "non-canonical", MarketID: "polymarket:market:fixed", ConditionID: "condition-fixed", Size: "01.0", AvgPrice: "0.5"},
	} {
		_, err := store.ApplyVenueRebuild(ctx, "projection-user-fixed", "0xcccccccccccccccccccccccccccccccccccccccc", []positions.VenuePosition{row}, observedAt)
		if err == nil {
			t.Fatalf("ApplyVenueRebuild accepted %+v", row)
		}
	}

	valid := positions.VenuePosition{TokenID: "exact-fixed", MarketID: "polymarket:market:fixed", ConditionID: "condition-fixed", Size: "12345678901234567890.123456", AvgPrice: "0.420000"}
	if _, err := store.ApplyVenueRebuild(ctx, "projection-user-fixed", "0xcccccccccccccccccccccccccccccccccccccccc", []positions.VenuePosition{valid}, observedAt); err != nil {
		t.Fatalf("ApplyVenueRebuild valid fixed point: %v", err)
	}
	var size, price string
	if err := pool.QueryRow(ctx, `SELECT size, avg_entry_price FROM markets_position_projections WHERE user_id = $1 AND token_id = $2`, "projection-user-fixed", valid.TokenID).Scan(&size, &price); err != nil {
		t.Fatal(err)
	}
	if size != valid.Size || price != valid.AvgPrice {
		t.Fatalf("stored fixed point = %q, %q", size, price)
	}
	_, err := pool.Exec(ctx, `
INSERT INTO markets_position_projections (
    id, user_id, account_wallet, market_id, token_id, condition_id, size,
    resolution_status, freshness_state, upstream_source, upstream_id, observed_at
) VALUES ('00000000-0000-0000-0000-000000000024', 'projection-user-fixed', '0xcccccccccccccccccccccccccccccccccccccccc',
    'polymarket:market:fixed', 'db-invalid-fixed', 'condition-fixed', 'NaN',
    'active', 'fresh', 'polymarket_data_api', 'db-invalid-fixed', $1)
`, observedAt)
	if err == nil {
		t.Fatal("database accepted non-finite position size")
	}
}

func TestPostgresStoreReplayIsNoOpAndStaleSnapshotCannotRegressState(t *testing.T) {
	pool := positionProjectionPool(t)
	ctx := context.Background()
	store := positions.NewPostgresStore(pool)
	userID := "projection-user-monotonic"
	wallet := "0xdddddddddddddddddddddddddddddddddddddddd"
	newer := time.Date(2026, 8, 12, 13, 0, 0, 0, time.UTC)
	position := positions.VenuePosition{TokenID: "monotonic-token", MarketID: "polymarket:market:monotonic", ConditionID: "condition-monotonic", Size: "10.0", AvgPrice: "0.4", UpstreamID: "monotonic-upstream"}
	if _, err := store.ApplyVenueRebuild(ctx, userID, wallet, []positions.VenuePosition{position}, newer); err != nil {
		t.Fatal(err)
	}
	var initialVersion int
	if err := pool.QueryRow(ctx, `SELECT version FROM markets_position_projections WHERE user_id = $1 AND token_id = $2`, userID, position.TokenID).Scan(&initialVersion); err != nil {
		t.Fatal(err)
	}
	if _, err := store.ApplyVenueRebuild(ctx, userID, wallet, []positions.VenuePosition{position}, newer); err != nil {
		t.Fatal(err)
	}
	var replayVersion int
	if err := pool.QueryRow(ctx, `SELECT version FROM markets_position_projections WHERE user_id = $1 AND token_id = $2`, userID, position.TokenID).Scan(&replayVersion); err != nil {
		t.Fatal(err)
	}
	if replayVersion != initialVersion {
		t.Fatalf("replay version = %d, want %d", replayVersion, initialVersion)
	}

	stale := position
	stale.Size = "1.0"
	if _, err := store.ApplyVenueRebuild(ctx, userID, wallet, []positions.VenuePosition{stale}, newer.Add(-time.Minute)); err != nil {
		t.Fatal(err)
	}
	if _, err := store.ApplyVenueRebuild(ctx, userID, wallet, nil, newer.Add(-time.Minute)); err != nil {
		t.Fatal(err)
	}
	var size, freshness string
	var observedAt time.Time
	if err := pool.QueryRow(ctx, `SELECT size, freshness_state, observed_at FROM markets_position_projections WHERE user_id = $1 AND token_id = $2`, userID, position.TokenID).Scan(&size, &freshness, &observedAt); err != nil {
		t.Fatal(err)
	}
	if size != position.Size || freshness != "fresh" || !observedAt.Equal(newer) {
		t.Fatalf("stale snapshot regressed state: size=%q freshness=%q observed=%s", size, freshness, observedAt)
	}
}

func TestPostgresStoreNewerMissingSnapshotPreventsStaleResurrection(t *testing.T) {
	pool := positionProjectionPool(t)
	ctx := context.Background()
	store := positions.NewPostgresStore(pool)
	userID := "projection-user-missing-watermark"
	wallet := "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
	t1 := time.Date(2026, 8, 12, 14, 0, 0, 0, time.UTC)
	present := positions.VenuePosition{TokenID: "missing-watermark-token", MarketID: "polymarket:market:missing-watermark", ConditionID: "condition-missing-watermark", Size: "10", AvgPrice: "0.4", UpstreamID: "missing-watermark-upstream"}
	if _, err := store.ApplyVenueRebuild(ctx, userID, wallet, []positions.VenuePosition{present}, t1); err != nil {
		t.Fatal(err)
	}
	if written, err := store.ApplyVenueRebuild(ctx, userID, wallet, nil, t1.Add(2*time.Hour)); err != nil {
		t.Fatal(err)
	} else if written != 1 {
		t.Fatalf("missing rebuild wrote %d rows, want 1", written)
	}

	stale := present
	stale.Size = "1"
	if written, err := store.ApplyVenueRebuild(ctx, userID, wallet, []positions.VenuePosition{stale}, t1.Add(time.Hour)); err != nil {
		t.Fatal(err)
	} else if written != 0 {
		t.Fatalf("stale rebuild wrote %d rows, want 0", written)
	}

	var size, freshness string
	var observedAt time.Time
	var version int
	if err := pool.QueryRow(ctx, `SELECT size, freshness_state, observed_at, version FROM markets_position_projections WHERE user_id = $1 AND account_wallet = $2 AND token_id = $3`, userID, wallet, present.TokenID).Scan(&size, &freshness, &observedAt, &version); err != nil {
		t.Fatal(err)
	}
	if size != present.Size || freshness != "reconciling" || !observedAt.Equal(t1.Add(2*time.Hour)) || version != 2 {
		t.Fatalf("stale resurrection: size=%q freshness=%q observed=%s version=%d", size, freshness, observedAt, version)
	}

	if written, err := store.ApplyVenueRebuild(ctx, userID, wallet, nil, t1.Add(2*time.Hour)); err != nil {
		t.Fatal(err)
	} else if written != 0 {
		t.Fatalf("missing replay wrote %d rows, want 0", written)
	}
	if err := pool.QueryRow(ctx, `SELECT version FROM markets_position_projections WHERE user_id = $1 AND account_wallet = $2 AND token_id = $3`, userID, wallet, present.TokenID).Scan(&version); err != nil {
		t.Fatal(err)
	}
	if version != 2 {
		t.Fatalf("missing replay version = %d, want 2", version)
	}
}

func TestPostgresStoreConcurrentMissingAndStaleSnapshotsRetainNewestBoundary(t *testing.T) {
	pool := positionProjectionPool(t)
	ctx := context.Background()
	store := positions.NewPostgresStore(pool)
	userID := "projection-user-missing-concurrent"
	wallet := "0xffffffffffffffffffffffffffffffffffffffff"
	t1 := time.Date(2026, 8, 12, 15, 0, 0, 0, time.UTC)
	present := positions.VenuePosition{TokenID: "missing-concurrent-token", MarketID: "polymarket:market:missing-concurrent", ConditionID: "condition-missing-concurrent", Size: "10", AvgPrice: "0.4", UpstreamID: "missing-concurrent-upstream"}
	if _, err := store.ApplyVenueRebuild(ctx, userID, wallet, []positions.VenuePosition{present}, t1); err != nil {
		t.Fatal(err)
	}

	stale := present
	stale.Size = "1"
	start := make(chan struct{})
	errs := make(chan error, 2)
	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		<-start
		_, err := store.ApplyVenueRebuild(ctx, userID, wallet, nil, t1.Add(2*time.Hour))
		errs <- err
	}()
	go func() {
		defer wg.Done()
		<-start
		_, err := store.ApplyVenueRebuild(ctx, userID, wallet, []positions.VenuePosition{stale}, t1.Add(time.Hour))
		errs <- err
	}()
	close(start)
	wg.Wait()
	close(errs)
	for err := range errs {
		if err != nil {
			t.Fatal(err)
		}
	}

	var freshness string
	var observedAt time.Time
	var markObserved, realizedObserved bool
	if err := pool.QueryRow(ctx, `SELECT freshness_state, observed_at, mark_price_observed, realized_pnl_observed FROM markets_position_projections WHERE user_id = $1 AND account_wallet = $2 AND token_id = $3`, userID, wallet, present.TokenID).Scan(&freshness, &observedAt, &markObserved, &realizedObserved); err != nil {
		t.Fatal(err)
	}
	if freshness != "reconciling" || !observedAt.Equal(t1.Add(2*time.Hour)) || markObserved || realizedObserved {
		t.Fatalf("concurrent state = freshness=%q observed=%s markObserved=%t realizedObserved=%t", freshness, observedAt, markObserved, realizedObserved)
	}
}

func positionProjectionPool(t *testing.T) *pgxpool.Pool {
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
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM markets_position_projections WHERE user_id LIKE 'projection-user-%'`)
	})
	return pool
}

func TestPostgresStorePersistsCompleteAndPartialVenueEconomicsMonotonically(t *testing.T) {
	pool := positionProjectionPool(t)
	ctx := context.Background()
	store := positions.NewPostgresStore(pool)
	userID := "projection-user-economics"
	wallet := "0x1212121212121212121212121212121212121212"
	t1 := time.Date(2026, 8, 12, 16, 0, 0, 0, time.UTC)
	complete := positions.VenuePosition{
		TokenID: "economics-token", MarketID: "polymarket:market:economics", ConditionID: "condition-economics", Size: "12.5", AvgPrice: "0.55", UpstreamID: "economics-upstream",
		MarkPrice: "0.64", MarkPriceAvailable: true, CostBasisAmount: "6875000", CostBasisAvailable: true,
		UnrealizedPnL: "1.125", UnrealizedPnLAvailable: true, RealizedPnL: "-0.25", RealizedPnLAvailable: true,
		Redeemable: true, RedeemableAvailable: true, ClaimableAmount: "8", ClaimableAmountAvailable: true,
	}
	if written, err := store.ApplyVenueRebuild(ctx, userID, wallet, []positions.VenuePosition{complete}, t1); err != nil || written != 1 {
		t.Fatalf("complete rebuild = %d, %v", written, err)
	}

	var mark, basis, unrealized, realized, claimable *string
	var redeemable bool
	if err := pool.QueryRow(ctx, `SELECT mark_price, cost_basis_amount::text, unrealized_pnl, realized_pnl, redeemable, claimable_amount
FROM markets_position_projections WHERE user_id = $1 AND account_wallet = $2 AND token_id = $3`, userID, wallet, complete.TokenID).Scan(&mark, &basis, &unrealized, &realized, &redeemable, &claimable); err != nil {
		t.Fatal(err)
	}
	if mark == nil || *mark != complete.MarkPrice || basis == nil || *basis != complete.CostBasisAmount || unrealized == nil || *unrealized != complete.UnrealizedPnL || realized == nil || *realized != complete.RealizedPnL || !redeemable || claimable == nil || *claimable != complete.ClaimableAmount {
		t.Fatalf("stored economics = mark=%v basis=%v unrealized=%v realized=%v redeemable=%t claimable=%v", mark, basis, unrealized, realized, redeemable, claimable)
	}

	partial := complete
	partial.MarkPrice, partial.CostBasisAmount, partial.UnrealizedPnL, partial.RealizedPnL, partial.ClaimableAmount = "", "", "", "", ""
	partial.MarkPriceAvailable, partial.CostBasisAvailable, partial.UnrealizedPnLAvailable, partial.RealizedPnLAvailable, partial.ClaimableAmountAvailable = false, false, false, false, false
	partial.Redeemable = false
	partial.RedeemableAvailable = false
	if written, err := store.ApplyVenueRebuild(ctx, userID, wallet, []positions.VenuePosition{partial}, t1.Add(time.Minute)); err != nil || written != 1 {
		t.Fatalf("partial rebuild = %d, %v", written, err)
	}
	if err := pool.QueryRow(ctx, `SELECT mark_price, cost_basis_amount::text, unrealized_pnl, realized_pnl, redeemable, claimable_amount
FROM markets_position_projections WHERE user_id = $1 AND account_wallet = $2 AND token_id = $3`, userID, wallet, complete.TokenID).Scan(&mark, &basis, &unrealized, &realized, &redeemable, &claimable); err != nil {
		t.Fatal(err)
	}
	if mark == nil || *mark != complete.MarkPrice || basis == nil || *basis != complete.CostBasisAmount || unrealized == nil || *unrealized != complete.UnrealizedPnL || realized == nil || *realized != complete.RealizedPnL || !redeemable || claimable == nil || *claimable != complete.ClaimableAmount {
		t.Fatalf("partial snapshot erased last known economics = mark=%v basis=%v unrealized=%v realized=%v redeemable=%t claimable=%v", mark, basis, unrealized, realized, redeemable, claimable)
	}

	stale := complete
	stale.MarkPrice = "0.99"
	if written, err := store.ApplyVenueRebuild(ctx, userID, wallet, []positions.VenuePosition{stale}, t1); err != nil || written != 0 {
		t.Fatalf("stale rebuild = %d, %v", written, err)
	}
	if err := pool.QueryRow(ctx, `SELECT mark_price FROM markets_position_projections WHERE user_id = $1 AND account_wallet = $2 AND token_id = $3`, userID, wallet, complete.TokenID).Scan(&mark); err != nil {
		t.Fatal(err)
	}
	if mark == nil || *mark != complete.MarkPrice {
		t.Fatalf("stale snapshot regressed partial economics: mark=%v", mark)
	}
}
