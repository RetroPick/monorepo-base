package markets

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// HealthChecker aggregates Markets runtime dependencies for probes.
type HealthChecker struct {
	Pool          *pgxpool.Pool
	Service       *Service
	Worker                CatalogWorkerState
	SignalsOperational    bool
	MarketDataOperational bool
	RealtimeState         string
	ServiceName   string
	Now           func() time.Time
}

type HealthResponse struct {
	OK        bool              `json:"ok"`
	Degraded  bool              `json:"degraded,omitempty"`
	Service   string            `json:"service"`
	CheckedAt time.Time         `json:"checkedAt"`
	Checks    map[string]string `json:"checks"`
}

// RegisterHealthRoutes mounts Markets-specific liveness and readiness probes.
func RegisterHealthRoutes(r chi.Router, checker HealthChecker) {
	r.Get("/health/live", checker.Live)
	r.Get("/health/ready", checker.Ready)
	r.Get("/api/v1/health/live", checker.Live)
	r.Get("/api/v1/health/ready", checker.Ready)
}

func (h HealthChecker) Live(w http.ResponseWriter, r *http.Request) {
	now := h.now()
	writeHealth(w, HealthResponse{
		OK:        true,
		Service:   h.serviceName(),
		CheckedAt: now,
		Checks: map[string]string{
			"process": "ok",
		},
	})
}

func (h HealthChecker) Ready(w http.ResponseWriter, r *http.Request) {
	now := h.now()
	checks := map[string]string{
		"database": "unavailable",
	}
	ok := true
	degraded := false

	if h.Pool != nil {
		if err := h.Pool.Ping(r.Context()); err == nil {
			checks["database"] = "ok"
		} else {
			ok = false
		}
	} else {
		ok = false
	}

	if h.Worker != nil {
		switch {
		case h.Worker.WorkerReady():
			checks["catalogWorker"] = "ok"
		case h.Worker.WorkerDegraded():
			checks["catalogWorker"] = "degraded"
			checks["catalogProjection"] = "stale"
			degraded = true
		default:
			checks["catalogWorker"] = "syncing"
			checks["catalogProjection"] = "missing"
			ok = false
		}
		if h.Worker.ProjectionAvailable() {
			if checks["catalogProjection"] == "" {
				checks["catalogProjection"] = "ok"
			}
		} else if checks["catalogProjection"] == "" {
			checks["catalogProjection"] = "missing"
			ok = false
		}
	} else {
		checks["catalogWorker"] = "disabled"
		checks["catalogProjection"] = "missing"
		ok = false
	}

	if h.Service != nil {
		if status, err := h.Service.ProjectionStatus(r.Context()); err == nil {
			if status.HasProjection {
				checks["catalogProjection"] = projectionFreshnessLabel(status.LatestObserved, now, h.Service.catalogMaxStale())
				if checks["catalogProjection"] == "stale" {
					degraded = true
				}
			}
		}
	}

	if h.SignalsOperational {
		checks["signals"] = "ok"
	} else {
		checks["signals"] = "disabled"
	}
	checks["realtime"] = h.realtimeState()
	if checks["realtime"] == "disabled" {
		// Phase 1.1: internal bridge deferred; not a readiness failure.
	} else if checks["realtime"] != "ok" {
		degraded = true
	}
	if h.MarketDataOperational {
		checks["marketData"] = "ok"
	} else {
		checks["marketData"] = "disabled"
	}

	statusCode := http.StatusOK
	if !ok {
		statusCode = http.StatusServiceUnavailable
	}
	writeHealthStatus(w, statusCode, HealthResponse{
		OK:        ok,
		Degraded:  degraded,
		Service:   h.serviceName(),
		CheckedAt: now,
		Checks:    checks,
	})
}

func projectionFreshnessLabel(observedAt, now time.Time, maxStale time.Duration) string {
	if observedAt.IsZero() {
		return "missing"
	}
	if now.Sub(observedAt) <= maxStale {
		return "ok"
	}
	return "stale"
}

func (h HealthChecker) serviceName() string {
	if h.ServiceName != "" {
		return h.ServiceName
	}
	return "retropick-markets-api"
}

func (h HealthChecker) realtimeState() string {
	if h.RealtimeState != "" {
		return h.RealtimeState
	}
	return "disabled"
}

func (h HealthChecker) now() time.Time {
	if h.Now != nil {
		return h.Now().UTC()
	}
	return time.Now().UTC()
}

func writeHealth(w http.ResponseWriter, body HealthResponse) {
	writeHealthStatus(w, http.StatusOK, body)
}

func writeHealthStatus(w http.ResponseWriter, status int, body HealthResponse) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

// WorkerStateFromCatalog adapts catalog worker status.
type WorkerStateFromCatalog interface {
	Status() interface {
		Ready() bool
		Degraded() bool
		HasProjection() bool
	}
}

// CatalogWorkerBridge adapts catalog.Worker status to CatalogWorkerState.
type CatalogWorkerBridge struct {
	ready         func() bool
	degraded      func() bool
	hasProjection func() bool
}

func NewCatalogWorkerBridge(ready, degraded, hasProjection func() bool) CatalogWorkerState {
	return CatalogWorkerBridge{
		ready:         ready,
		degraded:      degraded,
		hasProjection: hasProjection,
	}
}

func (b CatalogWorkerBridge) WorkerReady() bool {
	if b.ready != nil {
		return b.ready()
	}
	return false
}

func (b CatalogWorkerBridge) WorkerDegraded() bool {
	if b.degraded != nil {
		return b.degraded()
	}
	return false
}

func (b CatalogWorkerBridge) ProjectionAvailable() bool {
	if b.hasProjection != nil {
		return b.hasProjection()
	}
	return false
}
