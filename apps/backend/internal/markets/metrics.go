package markets

import (
	"fmt"
	"strings"
	"sync/atomic"
	"time"
)

type metricPair struct {
	ok         atomic.Uint64
	failed     atomic.Uint64
	durationNS atomic.Uint64
}

const catalogFreshnessSLO = 60 * time.Second

type Metrics struct {
	gamma metricPair
	clob  metricPair

	catalogRecords            atomic.Uint64
	catalogLastSuccess        atomic.Int64
	catalogFreshnessSecondsNS atomic.Uint64
	catalogFreshnessCount     atomic.Uint64
	catalogFreshnessWithinSLO atomic.Uint64

	gammaErrorRateLimited    atomic.Uint64
	gammaErrorNotFound       atomic.Uint64
	gammaErrorUpstream       atomic.Uint64
	gammaErrorInvalidPayload atomic.Uint64

	bookFresh       atomic.Uint64
	bookStale       atomic.Uint64
	bookResyncing   atomic.Uint64
	bookUnavailable atomic.Uint64
	bookInvalid     atomic.Uint64

	signalCreated   atomic.Uint64
	signalDuplicate atomic.Uint64
	signalExpired   atomic.Uint64
	signalRetracted atomic.Uint64

	eligibilityFailClosed atomic.Uint64

	orderPreviewOK         atomic.Uint64
	orderPreviewFailed     atomic.Uint64
	orderSubmitOK          atomic.Uint64
	orderSubmitFailed      atomic.Uint64
	previewSignMatchOK     atomic.Uint64
	previewSignMatchFailed atomic.Uint64

	reconcileRuns           atomic.Uint64
	reconcileRepaired       atomic.Uint64
	reconcileLagNS          atomic.Uint64
	reconcileScanned        atomic.Uint64
	reconcilePending        atomic.Uint64
	reconcileAgeNS          atomic.Uint64
	reconcileRepairOpen     atomic.Uint64
	reconcileRepairRejected atomic.Uint64
	reconcileRepairCanceled atomic.Uint64
	reconcileRepairFill     atomic.Uint64
	reconcileRepairUnknown  atomic.Uint64
	reconcileErrorsUpstream atomic.Uint64
	reconcileErrorsCreds    atomic.Uint64
	reconcileErrorsJournal  atomic.Uint64
}

func NewMetrics() *Metrics {
	return &Metrics{}
}

func (m *Metrics) ObserveUpstream(upstream string, succeeded bool, duration time.Duration) {
	var pair *metricPair
	switch upstream {
	case "gamma":
		pair = &m.gamma
	case "clob":
		pair = &m.clob
	default:
		return
	}
	if succeeded {
		pair.ok.Add(1)
	} else {
		pair.failed.Add(1)
	}
	if duration > 0 {
		pair.durationNS.Add(uint64(duration))
	}
}

func (m *Metrics) RecordCatalogSync(records int, succeededAt time.Time) {
	if records > 0 {
		m.catalogRecords.Add(uint64(records))
	}
	if !succeededAt.IsZero() {
		m.catalogLastSuccess.Store(succeededAt.Unix())
	}
}

func (m *Metrics) ObserveCatalogFreshness(age time.Duration) {
	if age < 0 {
		return
	}
	m.catalogFreshnessSecondsNS.Add(uint64(age))
	m.catalogFreshnessCount.Add(1)
	if age <= catalogFreshnessSLO {
		m.catalogFreshnessWithinSLO.Add(1)
	}
}

func (m *Metrics) CatalogFreshnessMeanSeconds() float64 {
	count := m.catalogFreshnessCount.Load()
	if count == 0 {
		return 0
	}
	return float64(m.catalogFreshnessSecondsNS.Load()) / float64(count) / float64(time.Second)
}

func (m *Metrics) RecordGammaError(kind string) {
	switch kind {
	case "rate_limited":
		m.gammaErrorRateLimited.Add(1)
	case "not_found":
		m.gammaErrorNotFound.Add(1)
	case "upstream":
		m.gammaErrorUpstream.Add(1)
	case "invalid_payload":
		m.gammaErrorInvalidPayload.Add(1)
	}
}

func (m *Metrics) RecordBookState(state FreshnessState) {
	switch state {
	case FreshnessFresh:
		m.bookFresh.Add(1)
	case FreshnessStale:
		m.bookStale.Add(1)
	case FreshnessResyncing:
		m.bookResyncing.Add(1)
	case FreshnessUnavailable:
		m.bookUnavailable.Add(1)
	case FreshnessInvalid:
		m.bookInvalid.Add(1)
	}
}

func (m *Metrics) RecordSignal(result string) {
	switch result {
	case "created":
		m.signalCreated.Add(1)
	case "duplicate":
		m.signalDuplicate.Add(1)
	case "expired":
		m.signalExpired.Add(1)
	case "retracted":
		m.signalRetracted.Add(1)
	}
}

func (m *Metrics) RecordEligibilityFailClosed(_ string) {
	m.RecordFailClosed("")
}

func (m *Metrics) RecordFailClosed(_ string) {
	if m == nil {
		return
	}
	m.eligibilityFailClosed.Add(1)
}

func (m *Metrics) RecordOrderPreview(success bool) {
	if m == nil {
		return
	}
	if success {
		m.orderPreviewOK.Add(1)
	} else {
		m.orderPreviewFailed.Add(1)
	}
}

func (m *Metrics) RecordOrderSubmit(success bool) {
	if m == nil {
		return
	}
	if success {
		m.orderSubmitOK.Add(1)
	} else {
		m.orderSubmitFailed.Add(1)
	}
}

func (m *Metrics) RecordPreviewSignMatch(matched bool) {
	if m == nil {
		return
	}
	if matched {
		m.previewSignMatchOK.Add(1)
	} else {
		m.previewSignMatchFailed.Add(1)
	}
}

func (m *Metrics) RecordReconcileRun(repaired int, duration time.Duration) {
	if m == nil {
		return
	}
	m.reconcileRuns.Add(1)
	if repaired > 0 {
		m.reconcileRepaired.Add(uint64(repaired))
	}
	if duration > 0 {
		m.reconcileLagNS.Add(uint64(duration))
		m.reconcileAgeNS.Store(uint64(duration))
	} else {
		m.reconcileAgeNS.Store(0)
	}
}

func (m *Metrics) RecordReconcileRepair(outcome string) {
	if m == nil {
		return
	}
	switch outcome {
	case "open":
		m.reconcileRepairOpen.Add(1)
	case "rejected":
		m.reconcileRepairRejected.Add(1)
	case "canceled":
		m.reconcileRepairCanceled.Add(1)
	case "fill":
		m.reconcileRepairFill.Add(1)
	case "unknown":
		m.reconcileRepairUnknown.Add(1)
	}
}

func (m *Metrics) RecordReconcileScanned(count int) {
	if m == nil {
		return
	}
	if count <= 0 {
		m.reconcilePending.Store(0)
		return
	}
	m.reconcileScanned.Add(uint64(count))
	m.reconcilePending.Store(uint64(count))
}

func (m *Metrics) RecordReconcileError(kind string) {
	if m == nil {
		return
	}
	switch kind {
	case "credentials_unwired":
		m.reconcileErrorsCreds.Add(1)
	case "upstream":
		m.reconcileErrorsUpstream.Add(1)
	case "journal":
		m.reconcileErrorsJournal.Add(1)
	}
}

func (m *Metrics) Prometheus() string {
	var out strings.Builder
	writeUpstreamMetrics(&out, "gamma", &m.gamma)
	writeUpstreamMetrics(&out, "clob", &m.clob)
	_, _ = fmt.Fprintf(&out, "retropick_markets_catalog_records_processed_total %d\n", m.catalogRecords.Load())
	_, _ = fmt.Fprintf(&out, "retropick_markets_catalog_last_success_timestamp_seconds %d\n", m.catalogLastSuccess.Load())
	_, _ = fmt.Fprintf(
		&out,
		"retropick_markets_catalog_freshness_seconds_sum %.6f\n",
		float64(m.catalogFreshnessSecondsNS.Load())/float64(time.Second),
	)
	_, _ = fmt.Fprintf(&out, "retropick_markets_catalog_freshness_seconds_count %d\n", m.catalogFreshnessCount.Load())
	_, _ = fmt.Fprintf(&out, "retropick_markets_catalog_freshness_within_slo_total %d\n", m.catalogFreshnessWithinSLO.Load())
	writeLabeledCounter(&out, "retropick_markets_gamma_errors_total", "kind", "rate_limited", m.gammaErrorRateLimited.Load())
	writeLabeledCounter(&out, "retropick_markets_gamma_errors_total", "kind", "not_found", m.gammaErrorNotFound.Load())
	writeLabeledCounter(&out, "retropick_markets_gamma_errors_total", "kind", "upstream", m.gammaErrorUpstream.Load())
	writeLabeledCounter(&out, "retropick_markets_gamma_errors_total", "kind", "invalid_payload", m.gammaErrorInvalidPayload.Load())
	writeLabeledCounter(&out, "retropick_markets_books_total", "state", "fresh", m.bookFresh.Load())
	writeLabeledCounter(&out, "retropick_markets_books_total", "state", "stale", m.bookStale.Load())
	writeLabeledCounter(&out, "retropick_markets_books_total", "state", "resyncing", m.bookResyncing.Load())
	writeLabeledCounter(&out, "retropick_markets_books_total", "state", "unavailable", m.bookUnavailable.Load())
	writeLabeledCounter(&out, "retropick_markets_books_total", "state", "invalid", m.bookInvalid.Load())
	writeLabeledCounter(&out, "retropick_markets_signals_total", "result", "created", m.signalCreated.Load())
	writeLabeledCounter(&out, "retropick_markets_signals_total", "result", "duplicate", m.signalDuplicate.Load())
	writeLabeledCounter(&out, "retropick_markets_signals_total", "result", "expired", m.signalExpired.Load())
	writeLabeledCounter(&out, "retropick_markets_signals_total", "result", "retracted", m.signalRetracted.Load())
	_, _ = fmt.Fprintf(&out, "retropick_markets_eligibility_fail_closed_total %d\n", m.eligibilityFailClosed.Load())
	writeLabeledCounter(&out, "retropick_markets_order_preview_total", "result", "ok", m.orderPreviewOK.Load())
	writeLabeledCounter(&out, "retropick_markets_order_preview_total", "result", "error", m.orderPreviewFailed.Load())
	writeLabeledCounter(&out, "retropick_markets_order_submit_total", "result", "ok", m.orderSubmitOK.Load())
	writeLabeledCounter(&out, "retropick_markets_order_submit_total", "result", "error", m.orderSubmitFailed.Load())
	writeLabeledCounter(&out, "retropick_markets_preview_sign_match_total", "result", "match", m.previewSignMatchOK.Load())
	writeLabeledCounter(&out, "retropick_markets_preview_sign_match_total", "result", "mismatch", m.previewSignMatchFailed.Load())
	_, _ = fmt.Fprintf(&out, "retropick_markets_reconcile_runs_total %d\n", m.reconcileRuns.Load())
	_, _ = fmt.Fprintf(&out, "retropick_markets_reconcile_repairs_total %d\n", m.reconcileRepaired.Load())
	_, _ = fmt.Fprintf(&out, "retropick_markets_order_reconcile_scanned_total %d\n", m.reconcileScanned.Load())
	_, _ = fmt.Fprintf(&out, "retropick_markets_order_reconciliation_pending %d\n", m.reconcilePending.Load())
	_, _ = fmt.Fprintf(&out, "retropick_markets_order_reconciliation_attempts %d\n", m.reconcileRuns.Load())
	_, _ = fmt.Fprintf(&out, "retropick_markets_order_reconciliation_recovered %d\n", m.reconcileRepairOpen.Load())
	_, _ = fmt.Fprintf(&out, "retropick_markets_order_reconciliation_unknown %d\n", m.reconcileRepairUnknown.Load())
	_, _ = fmt.Fprintf(&out, "retropick_markets_order_reconciliation_errors %d\n", m.reconcileErrorsUpstream.Load()+m.reconcileErrorsCreds.Load()+m.reconcileErrorsJournal.Load())
	writeLabeledCounter(&out, "retropick_markets_order_reconcile_repairs_total", "outcome", "open", m.reconcileRepairOpen.Load())
	writeLabeledCounter(&out, "retropick_markets_order_reconcile_repairs_total", "outcome", "rejected", m.reconcileRepairRejected.Load())
	writeLabeledCounter(&out, "retropick_markets_order_reconcile_repairs_total", "outcome", "canceled", m.reconcileRepairCanceled.Load())
	writeLabeledCounter(&out, "retropick_markets_order_reconcile_repairs_total", "outcome", "fill", m.reconcileRepairFill.Load())
	writeLabeledCounter(&out, "retropick_markets_order_reconcile_repairs_total", "outcome", "unknown", m.reconcileRepairUnknown.Load())
	writeLabeledCounter(&out, "retropick_markets_order_reconcile_errors_total", "kind", "upstream", m.reconcileErrorsUpstream.Load())
	writeLabeledCounter(&out, "retropick_markets_order_reconcile_errors_total", "kind", "credentials_unwired", m.reconcileErrorsCreds.Load())
	writeLabeledCounter(&out, "retropick_markets_order_reconcile_errors_total", "kind", "journal", m.reconcileErrorsJournal.Load())
	if runs := m.reconcileRuns.Load(); runs > 0 {
		_, _ = fmt.Fprintf(
			&out,
			"retropick_markets_order_reconcile_lag_seconds_sum %.6f\n",
			float64(m.reconcileLagNS.Load())/float64(time.Second),
		)
		_, _ = fmt.Fprintf(&out, "retropick_markets_order_reconcile_lag_seconds_count %d\n", runs)
		_, _ = fmt.Fprintf(
			&out,
			"retropick_markets_reconciliation_lag_seconds_sum %.6f\n",
			float64(m.reconcileLagNS.Load())/float64(time.Second),
		)
		_, _ = fmt.Fprintf(&out, "retropick_markets_reconciliation_lag_seconds_count %d\n", runs)
		_, _ = fmt.Fprintf(
			&out,
			"retropick_markets_order_reconciliation_age %.6f\n",
			float64(m.reconcileAgeNS.Load())/float64(time.Second),
		)
	}
	return out.String()
}

func writeUpstreamMetrics(out *strings.Builder, upstream string, pair *metricPair) {
	writeTwoLabelCounter(out, "retropick_markets_upstream_requests_total", "upstream", upstream, "result", "ok", pair.ok.Load())
	writeTwoLabelCounter(out, "retropick_markets_upstream_requests_total", "upstream", upstream, "result", "error", pair.failed.Load())
	_, _ = fmt.Fprintf(
		out,
		"retropick_markets_upstream_request_duration_seconds_sum{upstream=%q} %.6f\n",
		upstream,
		float64(pair.durationNS.Load())/float64(time.Second),
	)
	_, _ = fmt.Fprintf(
		out,
		"retropick_markets_upstream_request_duration_seconds_count{upstream=%q} %d\n",
		upstream,
		pair.ok.Load()+pair.failed.Load(),
	)
}

func writeLabeledCounter(out *strings.Builder, metric, label, value string, count uint64) {
	_, _ = fmt.Fprintf(out, "%s{%s=%q} %d\n", metric, label, value, count)
}

func writeTwoLabelCounter(
	out *strings.Builder,
	metric,
	firstLabel,
	firstValue,
	secondLabel,
	secondValue string,
	count uint64,
) {
	_, _ = fmt.Fprintf(
		out,
		"%s{%s=%q,%s=%q} %d\n",
		metric,
		firstLabel,
		firstValue,
		secondLabel,
		secondValue,
		count,
	)
}
