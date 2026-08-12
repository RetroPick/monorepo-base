package positions_test

import (
	"context"
	"testing"
	"time"

	"retropick/apps/backend/internal/markets/positions"
)

func TestPostgresWorkerCorrectsDurableProjection(t *testing.T) {
	pool := positionProjectionPool(t)
	ctx := context.Background()
	store := positions.NewPostgresStore(pool)
	observedAt := time.Date(2026, 8, 12, 10, 0, 0, 0, time.UTC)
	wallet := "0x3333333333333333333333333333333333333333"
	if _, err := store.ApplyVenueRebuild(ctx, "projection-user-worker", wallet, []positions.VenuePosition{{TokenID: "token-worker", MarketID: "polymarket:market:1", ConditionID: "condition-1", Size: "5", UpstreamID: "worker-before"}}, observedAt); err != nil {
		t.Fatal(err)
	}

	worker := positions.NewPostgresWorker(positions.PostgresWorkerConfig{
		Store: store,
		Venue: postgresWorkerVenue{rows: []positions.VenuePosition{{TokenID: "token-worker", MarketID: "polymarket:market:1", ConditionID: "condition-1", Size: "9", UpstreamID: "worker-after"}}, at: observedAt.Add(time.Minute)},
	})
	if err := worker.RunOnce(ctx); err != nil {
		t.Fatalf("RunOnce: %v", err)
	}
	rows, err := store.List(ctx, "projection-user-worker")
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 1 || rows[0].Size != "9" || rows[0].UpstreamID != "worker-after" {
		t.Fatalf("durable corrected rows = %+v", rows)
	}
}

type postgresWorkerVenue struct {
	rows []positions.VenuePosition
	at   time.Time
}

func (v postgresWorkerVenue) ListPositions(context.Context, positions.VenuePositionRequest) ([]positions.VenuePosition, time.Time, error) {
	return v.rows, v.at, nil
}
