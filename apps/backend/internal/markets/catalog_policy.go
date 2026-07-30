package markets

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"
)

func evaluateCatalogFreshness(observedAt time.Time, now time.Time, maxStale time.Duration, worker CatalogWorkerState) (MarketFreshness, error) {
	if observedAt.IsZero() || worker == nil || !worker.ProjectionAvailable() {
		return MarketFreshness{
			State:      FreshnessUnavailable,
			ObservedAt: now,
			Reason:     "catalog_projection_missing",
		}, ErrDataUnavailable
	}
	age := now.Sub(observedAt)
	freshness := MarketFreshness{
		State:      FreshnessFresh,
		ObservedAt: observedAt,
		AgeMillis:  age.Milliseconds(),
	}
	if age <= maxStale {
		return freshness, nil
	}
	if worker.WorkerDegraded() && age <= maxStale*2 {
		freshness.State = FreshnessStale
		freshness.Reason = "catalog_projection_stale"
		return freshness, nil
	}
	freshness.State = FreshnessUnavailable
	freshness.Reason = "catalog_projection_too_old"
	return freshness, fmt.Errorf("%w: catalog projection exceeded max stale age", ErrDataUnavailable)
}

func computeEventsETag(events []EventSummary, observedAt time.Time) string {
	hasher := sha256.New()
	hasher.Write([]byte(observedAt.UTC().Format(time.RFC3339Nano)))
	for _, event := range events {
		hasher.Write([]byte(event.ID))
		hasher.Write([]byte(event.Provenance.ContentHash))
	}
	return `"` + hex.EncodeToString(hasher.Sum(nil)[:16]) + `"`
}
