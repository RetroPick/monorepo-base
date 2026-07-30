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

	readiness := EvaluateProjectionReadiness(
		projection.LatestObserved,
		now,
		maxStale,
		projection.HasProjection,
		worker.WorkerDegraded(),
	)
	projectionCheck := projectionReadinessLabel(projection.LatestObserved, now, maxStale)

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
			workerCheck:     "syncing",
			projectionCheck: projectionCheck,
		}
	}

	// Degraded takes precedence over a fully healthy worker label.
	if worker.WorkerDegraded() || readiness.Degraded {
		if projectionCheck == "ok" && worker.WorkerDegraded() {
			projectionCheck = "stale"
		}
		return catalogHealthEvaluation{
			workerCheck:     "degraded",
			projectionCheck: projectionCheck,
			ok:              true,
			degraded:        true,
		}
	}

	return catalogHealthEvaluation{
		workerCheck:     "ok",
		projectionCheck: projectionCheck,
		ok:              true,
	}
}
