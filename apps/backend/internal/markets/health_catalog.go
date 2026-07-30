package markets

import "time"

type catalogHealthEvaluation struct {
	workerCheck     string
	projectionCheck string
	ok              bool
	degraded        bool
}

func evaluateCatalogHealth(
	worker CatalogWorkerState,
	projection CatalogProjectionStatus,
	now time.Time,
	maxStale time.Duration,
) catalogHealthEvaluation {
	if worker == nil {
		return catalogHealthEvaluation{
			workerCheck:     "disabled",
			projectionCheck: "missing",
		}
	}

	projectionCheck := projectionReadinessLabel(projection.LatestObserved, now, maxStale)
	readiness := EvaluateProjectionReadiness(
		projection.LatestObserved,
		now,
		maxStale,
		projection.HasProjection,
		worker.WorkerDegraded(),
	)

	if !projection.HasProjection {
		if worker.WorkerDegraded() {
			return catalogHealthEvaluation{
				workerCheck:     "degraded",
				projectionCheck: "missing",
			}
		}
		return catalogHealthEvaluation{
			workerCheck:     "syncing",
			projectionCheck: "missing",
		}
	}

	if !readiness.Ready {
		return catalogHealthEvaluation{
			workerCheck:     workerSyncLabel(worker),
			projectionCheck: projectionCheck,
		}
	}

	workerCheck := "ok"
	if worker.WorkerDegraded() {
		workerCheck = "degraded"
	}

	// Service degraded when sync is unhealthy or projection age exceeds the fresh window.
	degraded := worker.WorkerDegraded() || projectionCheck == "stale"

	return catalogHealthEvaluation{
		workerCheck:     workerCheck,
		projectionCheck: projectionCheck,
		ok:              true,
		degraded:        degraded,
	}
}

func workerSyncLabel(worker CatalogWorkerState) string {
	if worker.WorkerDegraded() {
		return "degraded"
	}
	return "syncing"
}
