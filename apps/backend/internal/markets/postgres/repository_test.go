package postgres

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/db"
)

func TestNewRejectsNilDatabase(t *testing.T) {
	t.Parallel()

	if _, err := New(nil); err == nil {
		t.Fatal("New(nil) succeeded")
	}
}

func TestCheckpointRoundTrip(t *testing.T) {
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
	defer pool.Close()

	store, err := New(pool)
	if err != nil {
		t.Fatal(err)
	}
	checkpoint := Checkpoint{
		Source:        "polymarket_gamma",
		Stream:        "events",
		Cursor:        "100",
		HighWatermark: time.Date(2026, 7, 30, 1, 0, 0, 0, time.UTC),
		LastSuccessAt: time.Date(2026, 7, 30, 1, 1, 0, 0, time.UTC),
	}
	if err := store.UpsertCheckpoint(context.Background(), checkpoint); err != nil {
		t.Fatal(err)
	}
	got, err := store.GetCheckpoint(context.Background(), checkpoint.Source, checkpoint.Stream)
	if err != nil {
		t.Fatal(err)
	}
	if got.Cursor != checkpoint.Cursor || !got.HighWatermark.Equal(checkpoint.HighWatermark) {
		t.Fatalf("checkpoint %+v", got)
	}
}
