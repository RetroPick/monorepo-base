package syncworker

import (
	"errors"
	"fmt"
	"strings"
	"testing"
	"time"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/catalog"
	"retropick/apps/backend/internal/markets/gamma"
)

func TestClassifyGammaErrorKind(t *testing.T) {
	t.Parallel()

	cases := []struct {
		err  error
		want string
	}{
		{err: gamma.ErrRateLimited, want: "rate_limited"},
		{err: gamma.ErrNotFound, want: "not_found"},
		{err: gamma.ErrInvalidPayload, want: "invalid_payload"},
		{err: gamma.ErrUpstream, want: "upstream"},
		{err: errors.New("other"), want: "upstream"},
		{err: nil, want: ""},
	}
	for _, tc := range cases {
		if got := classifyGammaErrorKind(tc.err); got != tc.want {
			t.Fatalf("classifyGammaErrorKind(%v) = %q want %q", tc.err, got, tc.want)
		}
	}
}

func TestObserveSyncRunRecordsMetrics(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 7, 30, 8, 0, 0, 0, time.UTC)
	metrics := markets.NewMetrics()
	worker := &CatalogWorker{cfg: Config{Metrics: metrics}}

	worker.observeSyncRun(catalog.Result{Events: 2, Markets: 3}, nil, 25*time.Millisecond, now)
	output := metrics.Prometheus()
	for _, line := range []string{
		`retropick_markets_upstream_requests_total{upstream="gamma",result="ok"} 1`,
		`retropick_markets_catalog_records_processed_total 5`,
		fmt.Sprintf("retropick_markets_catalog_last_success_timestamp_seconds %d", now.Unix()),
	} {
		if !strings.Contains(output, line) {
			t.Fatalf("success metrics missing %q:\n%s", line, output)
		}
	}

	metrics = markets.NewMetrics()
	worker = &CatalogWorker{cfg: Config{Metrics: metrics}}
	worker.observeSyncRun(catalog.Result{}, gamma.ErrRateLimited, 10*time.Millisecond, now)
	output = metrics.Prometheus()
	for _, line := range []string{
		`retropick_markets_upstream_requests_total{upstream="gamma",result="error"} 1`,
		`retropick_markets_gamma_errors_total{kind="rate_limited"} 1`,
	} {
		if !strings.Contains(output, line) {
			t.Fatalf("failure metrics missing %q:\n%s", line, output)
		}
	}
}

func TestCatalogWorkerStateReadsLiveMutexProtectedFields(t *testing.T) {
	t.Parallel()
	worker := &CatalogWorker{}
	if worker.WorkerReady() || worker.WorkerDegraded() || worker.ProjectionAvailable() {
		t.Fatal("expected initial unavailable state")
	}
	now := time.Date(2026, 7, 30, 8, 0, 0, 0, time.UTC)
	worker.status.setSuccess(now, 2, true)
	if !worker.WorkerReady() || !worker.ProjectionAvailable() || worker.WorkerDegraded() {
		t.Fatalf("ready=%v degraded=%v projection=%v",
			worker.WorkerReady(), worker.WorkerDegraded(), worker.ProjectionAvailable())
	}
	worker.status.setBackoff(now.Add(time.Minute), errors.New("gamma unavailable"))
	if !worker.WorkerDegraded() || !worker.WorkerReady() {
		t.Fatalf("degraded=%v ready=%v", worker.WorkerDegraded(), worker.WorkerReady())
	}
	if !worker.ProjectionAvailable() {
		t.Fatal("projection should remain available while degraded")
	}
}
