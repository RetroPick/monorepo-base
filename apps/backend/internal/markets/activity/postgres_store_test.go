package activity_test

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/db"
	"retropick/apps/backend/internal/markets/activity"
)

func TestPostgresStoreAppendIsImmutableIdempotentAndPaginatesPerUser(t *testing.T) {
	pool := activityPool(t)
	ctx := context.Background()
	store := activity.NewPostgresStore(pool)
	observedAt := time.Date(2026, 8, 12, 10, 0, 0, 0, time.UTC)

	event := activity.Event{UserID: "activity-user-a", AccountWallet: "0x1111111111111111111111111111111111111111", Kind: activity.KindFill, MarketID: "polymarket:market:1", TokenID: "token-1", Amount: "12.500000", UpstreamSource: "polymarket_clob", UpstreamID: "trade-1", ObservedAt: observedAt}
	if err := store.Append(ctx, event); err != nil {
		t.Fatalf("Append: %v", err)
	}
	// A replay with changed mutable-looking fields must not modify the original immutable event.
	event.Amount = "999.000000"
	if err := store.Append(ctx, event); err != nil {
		t.Fatalf("replay Append: %v", err)
	}
	if err := store.Append(ctx, activity.Event{UserID: "activity-user-a", AccountWallet: event.AccountWallet, Kind: activity.KindOrder, Amount: "1.000000", UpstreamSource: "polymarket_clob", UpstreamID: "order-2", ObservedAt: observedAt.Add(time.Second)}); err != nil {
		t.Fatal(err)
	}
	if err := store.Append(ctx, activity.Event{UserID: "activity-user-b", AccountWallet: "0x2222222222222222222222222222222222222222", Kind: activity.KindFill, Amount: "3.000000", UpstreamSource: "polymarket_clob", UpstreamID: "trade-user-b", ObservedAt: observedAt.Add(2 * time.Second)}); err != nil {
		t.Fatal(err)
	}

	first, err := store.List(ctx, "activity-user-a", activity.PageRequest{Limit: 1})
	if err != nil {
		t.Fatalf("List first page: %v", err)
	}
	if len(first.Events) != 1 || first.Events[0].Amount != "1.000000" || first.NextCursor == "" {
		t.Fatalf("first page = %+v", first)
	}
	second, err := store.List(ctx, "activity-user-a", activity.PageRequest{Limit: 1, Cursor: first.NextCursor})
	if err != nil {
		t.Fatalf("List second page: %v", err)
	}
	if len(second.Events) != 1 || second.Events[0].Amount != "12.500000" || second.NextCursor != "" {
		t.Fatalf("second page = %+v", second)
	}
}

func TestPostgresStoreRejectsInvalidFixedPointEvent(t *testing.T) {
	store := activity.NewPostgresStore(activityPool(t))
	err := store.Append(context.Background(), activity.Event{UserID: "activity-user-a", Kind: activity.KindFill, Amount: "NaN", UpstreamSource: "polymarket_clob", UpstreamID: uuid.NewString(), ObservedAt: time.Now()})
	if err == nil {
		t.Fatal("Append accepted invalid fixed-point amount")
	}
}

func activityPool(t *testing.T) *pgxpool.Pool {
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
		_, _ = pool.Exec(context.Background(), `DELETE FROM markets_activity_events WHERE user_id LIKE 'activity-user-%'`)
	})
	return pool
}
