package positions_test

import (
	"context"
	"os"
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
	if written != 1 {
		t.Fatalf("idempotent written = %d, want 1", written)
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
	} {
		if _, err := store.ApplyVenueRebuild(ctx, user.id, user.wallet, []positions.VenuePosition{position}, observedAt); err != nil {
			t.Fatalf("ApplyVenueRebuild(%s): %v", user.id, err)
		}
		rows, err := store.List(ctx, user.id)
		if err != nil || len(rows) != 1 || rows[0].Size != position.Size {
			t.Fatalf("List(%s) = %+v, %v", user.id, rows, err)
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
