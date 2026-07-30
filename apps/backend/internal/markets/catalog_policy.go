package markets

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
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

func computeEventsETag(body EventsListResponse) string {
	hasher := sha256.New()
	hasher.Write([]byte(body.Provenance.ObservedAt.UTC().Format(time.RFC3339Nano)))
	hasher.Write([]byte(fmt.Sprintf("cursor:%v;limit:%d", body.Page.NextCursor, body.Page.Limit)))
	for _, event := range body.Events {
		hasher.Write([]byte(event.ID))
		hasher.Write([]byte(event.Provenance.ContentHash))
	}
	return `W/"` + hex.EncodeToString(hasher.Sum(nil)[:16]) + `"`
}

func etagMatches(ifNoneMatch, etag string) bool {
	if ifNoneMatch == "" || etag == "" {
		return false
	}
	for _, candidate := range strings.Split(ifNoneMatch, ",") {
		candidate = strings.TrimSpace(candidate)
		if candidate == "*" || candidate == etag {
			return true
		}
	}
	return false
}
