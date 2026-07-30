package markets

import (
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
	bridge := NewCatalogWorkerBridge(
		func() bool { return ready },
		func() bool { return false },
		func() bool { return hasProjection },
	)
	checker := HealthChecker{
		Worker: bridge,
		Now:    func() time.Time { return time.Date(2026, 7, 30, 0, 0, 0, 0, time.UTC) },
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
