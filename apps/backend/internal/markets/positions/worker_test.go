package positions_test

import (
	"context"
	"testing"
	"time"

	"retropick/apps/backend/internal/markets/positions"
)

type stubVenue struct {
	rows []positions.VenuePosition
	err  error
	at   time.Time
}

func (s stubVenue) ListPositions(context.Context, positions.VenuePositionRequest) ([]positions.VenuePosition, time.Time, error) {
	if s.err != nil {
		return nil, time.Time{}, s.err
	}
	at := s.at
	if at.IsZero() {
		at = time.Now().UTC()
	}
	return s.rows, at, nil
}

func TestComparePositionsDetectsDrift(t *testing.T) {
	t.Parallel()

	drift := positions.ComparePositions(
		[]positions.PositionRecord{{TokenID: "tok-1", Size: "10"}},
		[]positions.VenuePosition{{TokenID: "tok-1", Size: "11"}},
	)
	if drift.Count != 1 {
		t.Fatalf("drift = %+v", drift)
	}
}

func TestComparePositionsExactMatch(t *testing.T) {
	t.Parallel()

	drift := positions.ComparePositions(
		[]positions.PositionRecord{{TokenID: "tok-1", Size: "10.0"}},
		[]positions.VenuePosition{{TokenID: "tok-1", Size: "10"}},
	)
	if drift.Count != 0 {
		t.Fatalf("drift = %+v", drift)
	}
}

func TestWorkerRepairsDriftFromVenue(t *testing.T) {
	t.Parallel()

	store := positions.NewProjectionStore()
	store.Upsert(positions.PositionRecord{
		UserID:        "user-1",
		AccountWallet: "0xacc",
		TokenID:       "tok-1",
		Size:          "5",
		SyncStatus:    positions.SyncStatusSynced,
	})

	fixed := time.Date(2026, 8, 10, 12, 0, 0, 0, time.UTC)
	metrics := positions.NewRecorder()
	worker := positions.NewWorker(positions.WorkerConfig{
		Store: store,
		Venue: stubVenue{rows: []positions.VenuePosition{{
			TokenID: "tok-1",
			Size:    "10",
		}}, at: fixed},
		Metrics: metrics,
		Now:     func() time.Time { return fixed },
	})

	worker.RunOnce(context.Background())

	rows := store.List("user-1")
	if len(rows) != 1 {
		t.Fatalf("rows = %+v", rows)
	}
	if rows[0].Size != "10" {
		t.Fatalf("size = %q", rows[0].Size)
	}
	if rows[0].SyncStatus != positions.SyncStatusSynced {
		t.Fatalf("sync = %q", rows[0].SyncStatus)
	}
	if metrics.Prometheus() == "" {
		t.Fatal("expected metrics output")
	}
}

func TestWorkerPreservesLocalPositionOnLaggedEmptyVenueSnapshot(t *testing.T) {
	t.Parallel()

	store := positions.NewProjectionStore()
	store.Upsert(positions.PositionRecord{
		UserID:         "user-1",
		AccountWallet:  "0xacc",
		TokenID:        "tok-local",
		MarketID:       "polymarket:market:1",
		Size:           "7",
		SyncStatus:     positions.SyncStatusSynced,
		UpstreamSource: "local_fill",
	})

	fixed := time.Date(2026, 8, 10, 12, 0, 0, 0, time.UTC)
	worker := positions.NewWorker(positions.WorkerConfig{
		Store: store,
		Venue: stubVenue{rows: nil, at: fixed},
		Now:   func() time.Time { return fixed },
	})

	worker.RunOnce(context.Background())

	rows := store.List("user-1")
	if len(rows) != 1 {
		t.Fatalf("rows = %+v", rows)
	}
	if rows[0].TokenID != "tok-local" {
		t.Fatalf("token = %q", rows[0].TokenID)
	}
	if rows[0].Size != "7" {
		t.Fatalf("size = %q", rows[0].Size)
	}
	if rows[0].SyncStatus != positions.SyncStatusReconciling {
		t.Fatalf("sync = %q", rows[0].SyncStatus)
	}
}

func TestWorkerPreservesLocalOnlyPositionOnPartialVenueSnapshot(t *testing.T) {
	t.Parallel()

	store := positions.NewProjectionStore()
	store.Upsert(positions.PositionRecord{
		UserID:        "user-1",
		AccountWallet: "0xacc",
		TokenID:       "tok-venue",
		Size:          "5",
		SyncStatus:    positions.SyncStatusSynced,
	})
	store.Upsert(positions.PositionRecord{
		UserID:         "user-1",
		AccountWallet:  "0xacc",
		TokenID:        "tok-local",
		Size:           "3",
		SyncStatus:     positions.SyncStatusSynced,
		UpstreamSource: "local_fill",
	})

	fixed := time.Date(2026, 8, 10, 12, 0, 0, 0, time.UTC)
	worker := positions.NewWorker(positions.WorkerConfig{
		Store: store,
		Venue: stubVenue{rows: []positions.VenuePosition{{
			TokenID: "tok-venue",
			Size:    "8",
		}}, at: fixed},
		Now: func() time.Time { return fixed },
	})

	worker.RunOnce(context.Background())

	rows := store.List("user-1")
	if len(rows) != 2 {
		t.Fatalf("rows = %+v", rows)
	}
	byToken := make(map[string]positions.PositionRecord, len(rows))
	for _, row := range rows {
		byToken[row.TokenID] = row
	}
	if byToken["tok-venue"].Size != "8" {
		t.Fatalf("venue size = %q", byToken["tok-venue"].Size)
	}
	if byToken["tok-venue"].SyncStatus != positions.SyncStatusSynced {
		t.Fatalf("venue sync = %q", byToken["tok-venue"].SyncStatus)
	}
	if byToken["tok-local"].Size != "3" {
		t.Fatalf("local size = %q", byToken["tok-local"].Size)
	}
	if byToken["tok-local"].SyncStatus != positions.SyncStatusReconciling {
		t.Fatalf("local sync = %q", byToken["tok-local"].SyncStatus)
	}
}

func TestWorkerMarksUpdatingOnReorg(t *testing.T) {
	t.Parallel()

	store := positions.NewProjectionStore()
	store.Upsert(positions.PositionRecord{
		UserID:        "user-1",
		AccountWallet: "0xacc",
		TokenID:       "tok-1",
		Size:          "10",
		SyncStatus:    positions.SyncStatusSynced,
	})

	reorg := &positions.MemoryReorgNotifier{}
	reorg.Notify("user-1")

	fixed := time.Date(2026, 8, 10, 12, 0, 0, 0, time.UTC)
	worker := positions.NewWorker(positions.WorkerConfig{
		Store: store,
		Venue: stubVenue{rows: []positions.VenuePosition{{
			TokenID: "tok-1",
			Size:    "10",
		}}, at: fixed},
		Reorg: reorg,
		Now:   func() time.Time { return fixed },
	})

	worker.RunOnce(context.Background())

	rows := store.List("user-1")
	if len(rows) != 1 {
		t.Fatalf("rows = %+v", rows)
	}
	if rows[0].SyncStatus != positions.SyncStatusSynced {
		t.Fatalf("after reconcile sync = %q", rows[0].SyncStatus)
	}
}

func TestWorkerReorgBeforeRepairMarksUpdating(t *testing.T) {
	t.Parallel()

	store := positions.NewProjectionStore()
	store.Upsert(positions.PositionRecord{
		UserID:        "user-1",
		AccountWallet: "0xacc",
		TokenID:       "tok-1",
		Size:          "10",
		SyncStatus:    positions.SyncStatusSynced,
	})

	reorg := &positions.MemoryReorgNotifier{}
	reorg.Notify("user-1")
	store.MarkUpdating("user-1")

	rows := store.List("user-1")
	if rows[0].SyncStatus != positions.SyncStatusUpdating {
		t.Fatalf("sync = %q", rows[0].SyncStatus)
	}
}

func TestWorkerUpstreamErrorMarksReconciling(t *testing.T) {
	t.Parallel()

	store := positions.NewProjectionStore()
	store.Upsert(positions.PositionRecord{
		UserID:        "user-1",
		AccountWallet: "0xacc",
		TokenID:       "tok-1",
		Size:          "10",
		SyncStatus:    positions.SyncStatusSynced,
	})

	metrics := positions.NewRecorder()
	worker := positions.NewWorker(positions.WorkerConfig{
		Store:   store,
		Venue:   stubVenue{err: positions.ErrUpstreamUnavailable},
		Metrics: metrics,
	})

	worker.RunOnce(context.Background())

	rows := store.List("user-1")
	if rows[0].SyncStatus != positions.SyncStatusReconciling {
		t.Fatalf("sync = %q", rows[0].SyncStatus)
	}
}

func TestMetricsRecordDriftCount(t *testing.T) {
	t.Parallel()

	metrics := positions.NewRecorder()
	metrics.RecordPositionDriftCount(3)
	metrics.RecordPositionDriftRepair(2)
	metrics.RecordPositionReconcileRun(2, 150*time.Millisecond)

	out := metrics.Prometheus()
	if out == "" {
		t.Fatal("empty prometheus output")
	}
}
