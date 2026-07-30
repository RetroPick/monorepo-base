package markets

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestReadinessReportsDisabledMarketDataAndSignals(t *testing.T) {
	t.Parallel()
	r := httptest.NewRecorder()
	checker := HealthChecker{
		Service:               NewService(ServiceConfig{}),
		Worker:                CatalogWorkerSnapshotFrom(true, false, true),
		SignalsOperational:    false,
		MarketDataOperational: false,
		ServiceName:           "retropick-markets-api",
		Now:                   func() time.Time { return time.Date(2026, 7, 30, 0, 0, 0, 0, time.UTC) },
	}
	checker.Ready(r, httptest.NewRequest(http.MethodGet, "/health/ready", nil))
	if r.Code != http.StatusServiceUnavailable {
		t.Fatalf("status %d body %s", r.Code, r.Body.String())
	}
	var body HealthResponse
	if err := json.Unmarshal(r.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Checks["signals"] != "disabled" || body.Checks["marketData"] != "disabled" {
		t.Fatalf("checks %+v", body.Checks)
	}
}

func TestReadinessUsesLiveWorkerState(t *testing.T) {
	t.Parallel()
	ready := false
	hasProjection := false
	now := time.Date(2026, 7, 30, 12, 0, 0, 0, time.UTC)
	observed := now.Add(-5 * time.Minute)
	bridge := NewCatalogWorkerBridge(
		func() bool { return ready },
		func() bool { return false },
		func() bool { return hasProjection },
	)
	projection := liveProjectionStub{
		now:           now,
		hasProjection: func() bool { return hasProjection },
		observed:      observed,
	}
	checker := HealthChecker{
		Service: NewService(ServiceConfig{
			CatalogEnabled:    true,
			CatalogProjection: projection,
			CatalogWorker:     bridge,
			CatalogMaxStale:   15 * time.Minute,
		}),
		Worker: bridge,
		Now:    func() time.Time { return now },
	}
	rec := httptest.NewRecorder()
	checker.Ready(rec, httptest.NewRequest(http.MethodGet, "/health/ready", nil))
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected unavailable before sync, got %d", rec.Code)
	}
	ready = true
	hasProjection = true
	rec2 := httptest.NewRecorder()
	checker.Ready(rec2, httptest.NewRequest(http.MethodGet, "/health/ready", nil))
	var before, after HealthResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &before); err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(rec2.Body.Bytes(), &after); err != nil {
		t.Fatal(err)
	}
	if before.Checks["catalogWorker"] != "syncing" {
		t.Fatalf("before worker check %q", before.Checks["catalogWorker"])
	}
	if after.Checks["catalogWorker"] != "ok" || after.Checks["catalogProjection"] != "ok" {
		t.Fatalf("after checks %+v", after.Checks)
	}
}

type liveProjectionStub struct {
	now           time.Time
	observed      time.Time
	hasProjection func() bool
}

func (s liveProjectionStub) ListEvents(context.Context, string, int, int) ([]EventSummary, error) {
	return nil, nil
}

func (s liveProjectionStub) GetEvent(context.Context, string) (EventDetail, error) {
	return EventDetail{}, ErrNotFound
}

func (s liveProjectionStub) GetMarket(context.Context, string) (MarketDetail, error) {
	return MarketDetail{}, ErrNotFound
}

func (s liveProjectionStub) ProjectionStatus(context.Context) (CatalogProjectionStatus, error) {
	if s.hasProjection != nil && s.hasProjection() {
		return CatalogProjectionStatus{
			EventCount:     1,
			LatestObserved: s.observed,
			HasProjection:  true,
		}, nil
	}
	return CatalogProjectionStatus{}, nil
}
