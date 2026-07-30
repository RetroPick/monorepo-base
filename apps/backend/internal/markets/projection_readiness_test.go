package markets

import (
	"testing"
	"time"
)

func TestEvaluateProjectionReadinessFresh(t *testing.T) {
	t.Parallel()
	now := time.Date(2026, 7, 30, 12, 0, 0, 0, time.UTC)
	observed := now.Add(-5 * time.Minute)
	readiness := EvaluateProjectionReadiness(observed, now, 15*time.Minute, true, false)
	if !readiness.Ready || readiness.Degraded {
		t.Fatalf("readiness %+v", readiness)
	}
}

func TestEvaluateProjectionReadinessReadyDegradedDuringSyncOutage(t *testing.T) {
	t.Parallel()
	now := time.Date(2026, 7, 30, 12, 0, 0, 0, time.UTC)
	observed := now.Add(-5 * time.Minute)
	readiness := EvaluateProjectionReadiness(observed, now, 15*time.Minute, true, true)
	if !readiness.Ready || !readiness.Degraded {
		t.Fatalf("readiness %+v", readiness)
	}
}

func TestEvaluateProjectionReadinessStaleButAllowable(t *testing.T) {
	t.Parallel()
	now := time.Date(2026, 7, 30, 12, 0, 0, 0, time.UTC)
	observed := now.Add(-20 * time.Minute)
	readiness := EvaluateProjectionReadiness(observed, now, 15*time.Minute, true, true)
	if !readiness.Ready || !readiness.Degraded {
		t.Fatalf("readiness %+v", readiness)
	}
}

func TestEvaluateProjectionReadinessOverAgeUnavailable(t *testing.T) {
	t.Parallel()
	now := time.Date(2026, 7, 30, 12, 0, 0, 0, time.UTC)
	observed := now.Add(-40 * time.Minute)
	readiness := EvaluateProjectionReadiness(observed, now, 15*time.Minute, true, false)
	if readiness.Ready || !readiness.HasProjection {
		t.Fatalf("readiness %+v", readiness)
	}
}

func TestEvaluateCatalogHealthDegradedPrecedence(t *testing.T) {
	t.Parallel()
	now := time.Date(2026, 7, 30, 12, 0, 0, 0, time.UTC)
	worker := CatalogWorkerSnapshotFrom(true, true, true)
	eval := evaluateCatalogHealth(worker, CatalogProjectionStatus{
		HasProjection:  true,
		LatestObserved: now.Add(-5 * time.Minute),
	}, now, 15*time.Minute)
	if eval.workerCheck != "degraded" || !eval.ok || !eval.degraded {
		t.Fatalf("eval %+v", eval)
	}
	if eval.projectionCheck != "ok" {
		t.Fatalf("fresh projection must remain ok while worker is degraded, got %q", eval.projectionCheck)
	}
}
