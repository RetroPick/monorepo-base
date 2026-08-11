package positions

import (
	"fmt"
	"strings"
	"sync/atomic"
	"time"
)

// Metrics counts position reconciliation outcomes.
type Metrics interface {
	RecordPositionReconcileRun(repaired int, lag time.Duration)
	RecordPositionDriftCount(count int)
	RecordPositionDriftRepair(count int)
	RecordPositionReconcileError(kind string)
}

type nopMetrics struct{}

func (nopMetrics) RecordPositionReconcileRun(int, time.Duration) {}
func (nopMetrics) RecordPositionDriftCount(int)                 {}
func (nopMetrics) RecordPositionDriftRepair(int)                {}
func (nopMetrics) RecordPositionReconcileError(string)          {}

// Recorder is a test-friendly metrics implementation with Prometheus export.
type Recorder struct {
	runs         atomic.Uint64
	repaired     atomic.Uint64
	lagNS        atomic.Uint64
	driftCount   atomic.Int64
	driftRepairs atomic.Uint64
	errUpstream  atomic.Uint64
	errCreds     atomic.Uint64
}

// NewRecorder builds a metrics recorder for tests and glue wiring.
func NewRecorder() *Recorder {
	return &Recorder{}
}

func (m *Recorder) RecordPositionReconcileRun(repaired int, lag time.Duration) {
	if m == nil {
		return
	}
	m.runs.Add(1)
	if repaired > 0 {
		m.repaired.Add(uint64(repaired))
	}
	if lag > 0 {
		m.lagNS.Add(uint64(lag))
	}
}

func (m *Recorder) RecordPositionDriftCount(count int) {
	if m == nil {
		return
	}
	m.driftCount.Store(int64(count))
}

func (m *Recorder) RecordPositionDriftRepair(count int) {
	if m == nil || count <= 0 {
		return
	}
	m.driftRepairs.Add(uint64(count))
}

func (m *Recorder) RecordPositionReconcileError(kind string) {
	if m == nil {
		return
	}
	switch kind {
	case "credentials_unwired":
		m.errCreds.Add(1)
	default:
		m.errUpstream.Add(1)
	}
}

// Prometheus renders position reconcile metrics for glue append to /metrics.
func (m *Recorder) Prometheus() string {
	if m == nil {
		return ""
	}
	var out strings.Builder
	runs := m.runs.Load()
	if runs > 0 {
		_, _ = fmt.Fprintf(&out, "retropick_markets_position_reconcile_lag_seconds_sum %.6f\n",
			float64(m.lagNS.Load())/float64(time.Second))
		_, _ = fmt.Fprintf(&out, "retropick_markets_position_reconcile_lag_seconds_count %d\n", runs)
	}
	_, _ = fmt.Fprintf(&out, "retropick_markets_position_drift_count %d\n", m.driftCount.Load())
	_, _ = fmt.Fprintf(&out, "retropick_markets_position_drift_repairs_total %d\n", m.driftRepairs.Load())
	_, _ = fmt.Fprintf(&out, "retropick_markets_position_reconcile_errors_total{kind=\"upstream\"} %d\n", m.errUpstream.Load())
	_, _ = fmt.Fprintf(&out, "retropick_markets_position_reconcile_errors_total{kind=\"credentials_unwired\"} %d\n", m.errCreds.Load())
	return out.String()
}
