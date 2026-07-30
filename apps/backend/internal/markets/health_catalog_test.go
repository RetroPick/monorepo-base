package markets

import (
	"testing"
	"time"
)

func TestEvaluateCatalogHealthStateMatrix(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 7, 30, 12, 0, 0, 0, time.UTC)
	maxStale := 15 * time.Minute

	cases := []struct {
		name            string
		worker          CatalogWorkerState
		projection      CatalogProjectionStatus
		wantWorker      string
		wantProjection  string
		wantOK          bool
		wantDegraded    bool
	}{
		{
			name:           "no projection syncing",
			worker:         CatalogWorkerSnapshotFrom(false, false, false),
			projection:     CatalogProjectionStatus{},
			wantWorker:     "syncing",
			wantProjection: "missing",
		},
		{
			name:           "fresh projection healthy worker",
			worker:         CatalogWorkerSnapshotFrom(true, false, true),
			projection:     CatalogProjectionStatus{HasProjection: true, LatestObserved: now.Add(-5 * time.Minute)},
			wantWorker:     "ok",
			wantProjection: "ok",
			wantOK:         true,
		},
		{
			name:           "fresh projection degraded worker",
			worker:         CatalogWorkerSnapshotFrom(true, true, true),
			projection:     CatalogProjectionStatus{HasProjection: true, LatestObserved: now.Add(-5 * time.Minute)},
			wantWorker:     "degraded",
			wantProjection: "ok",
			wantOK:         true,
			wantDegraded:   true,
		},
		{
			name:           "stale projection healthy worker",
			worker:         CatalogWorkerSnapshotFrom(true, false, true),
			projection:     CatalogProjectionStatus{HasProjection: true, LatestObserved: now.Add(-20 * time.Minute)},
			wantWorker:     "ok",
			wantProjection: "stale",
			wantOK:         true,
			wantDegraded:   true,
		},
		{
			name:           "stale projection degraded worker",
			worker:         CatalogWorkerSnapshotFrom(true, true, true),
			projection:     CatalogProjectionStatus{HasProjection: true, LatestObserved: now.Add(-20 * time.Minute)},
			wantWorker:     "degraded",
			wantProjection: "stale",
			wantOK:         true,
			wantDegraded:   true,
		},
		{
			name:           "over age projection unavailable",
			worker:         CatalogWorkerSnapshotFrom(true, false, true),
			projection:     CatalogProjectionStatus{HasProjection: true, LatestObserved: now.Add(-40 * time.Minute)},
			wantWorker:     "syncing",
			wantProjection: "missing",
		},
		{
			name:           "no projection degraded worker",
			worker:         CatalogWorkerSnapshotFrom(false, true, false),
			projection:     CatalogProjectionStatus{},
			wantWorker:     "degraded",
			wantProjection: "missing",
		},
	}

	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			eval := evaluateCatalogHealth(tc.worker, tc.projection, now, maxStale)
			if eval.workerCheck != tc.wantWorker {
				t.Fatalf("workerCheck=%q want %q", eval.workerCheck, tc.wantWorker)
			}
			if eval.projectionCheck != tc.wantProjection {
				t.Fatalf("projectionCheck=%q want %q", eval.projectionCheck, tc.wantProjection)
			}
			if eval.ok != tc.wantOK {
				t.Fatalf("ok=%v want %v", eval.ok, tc.wantOK)
			}
			if eval.degraded != tc.wantDegraded {
				t.Fatalf("degraded=%v want %v", eval.degraded, tc.wantDegraded)
			}
		})
	}
}
