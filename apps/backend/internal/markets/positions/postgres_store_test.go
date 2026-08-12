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
