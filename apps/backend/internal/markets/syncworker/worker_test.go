package syncworker

import (
	"errors"
	"testing"
	"time"
)

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
