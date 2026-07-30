package postgres

import (
	"context"
	"encoding/json"
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
	store := integrationStore(t)
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

func TestCatalogEventRoundTripIsIdempotent(t *testing.T) {
	store := integrationStore(t)
	observed := time.Date(2026, 7, 30, 2, 0, 0, 0, time.UTC)
	record := EventRecord{
		ID:          "event-test-1",
		Slug:        "event-test",
		Title:       "Initial title",
		Description: "Rules",
		Status:      "open",
		Source:      "polymarket_gamma",
		ContentHash: "hash-1",
		Payload:     json.RawMessage(`{"id":"event-test-1"}`),
		ObservedAt:  observed,
	}
	if err := store.UpsertEvent(context.Background(), record); err != nil {
		t.Fatal(err)
	}
	record.Title = "Updated title"
	record.ContentHash = "hash-2"
	if err := store.UpsertEvent(context.Background(), record); err != nil {
		t.Fatal(err)
	}
	got, err := store.GetEvent(context.Background(), record.ID)
	if err != nil {
		t.Fatal(err)
	}
	if got.Title != record.Title || got.ContentHash != "hash-2" {
		t.Fatalf("event %+v", got)
	}
}

func TestRawEventDeduplicatesBySourceAndUpstreamID(t *testing.T) {
	store := integrationStore(t)
	record := RawEvent{
		Source:          "polymarket_gamma",
		UpstreamEventID: "raw-test-1",
		EntityType:      "event",
		EntityID:        "event-test-1",
		SchemaVersion:   "1",
		Payload:         json.RawMessage(`{"id":"event-test-1"}`),
		ObservedAt:      time.Date(2026, 7, 30, 2, 0, 0, 0, time.UTC),
		ExpiresAt:       time.Date(2026, 8, 6, 2, 0, 0, 0, time.UTC),
	}
	if err := store.SaveRawEvent(context.Background(), record); err != nil {
		t.Fatal(err)
	}
	if err := store.SaveRawEvent(context.Background(), record); err != nil {
		t.Fatal(err)
	}
}

func integrationStore(t *testing.T) *Store {
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
	store, err := New(pool)
	if err != nil {
		t.Fatal(err)
	}
	return store
}
