package markets

import "time"

// ProjectionReadiness summarizes whether a durable catalog projection can serve traffic.
type ProjectionReadiness struct {
	HasProjection bool
	Ready         bool
	Degraded      bool
}

// EvaluateProjectionReadiness decides service readiness from durable observation time.
// syncUnhealthy is true when the catalog worker is in backoff after a failed sync.
func EvaluateProjectionReadiness(
	observedAt time.Time,
	now time.Time,
	maxStale time.Duration,
	hasProjection bool,
	syncUnhealthy bool,
) ProjectionReadiness {
	if !hasProjection || observedAt.IsZero() {
		return ProjectionReadiness{}
	}
	if maxStale <= 0 {
		maxStale = 15 * time.Minute
	}
	age := now.Sub(observedAt)
	if age > maxStale*2 {
		return ProjectionReadiness{HasProjection: true}
	}
	degraded := syncUnhealthy || age > maxStale
	return ProjectionReadiness{
		HasProjection: true,
		Ready:         true,
		Degraded:      degraded,
	}
}

func projectionReadinessLabel(observedAt, now time.Time, maxStale time.Duration) string {
	if observedAt.IsZero() {
		return "missing"
	}
	if maxStale <= 0 {
		maxStale = 15 * time.Minute
	}
	age := now.Sub(observedAt)
	switch {
	case age <= maxStale:
		return "ok"
	case age <= maxStale*2:
		return "stale"
	default:
		return "missing"
	}
}
