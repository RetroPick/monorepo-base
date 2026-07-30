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

type Metrics struct {
	gamma metricPair
	clob  metricPair

	catalogRecords     atomic.Uint64
	catalogLastSuccess atomic.Int64

	bookFresh       atomic.Uint64
	bookStale       atomic.Uint64
	bookResyncing   atomic.Uint64
	bookUnavailable atomic.Uint64
	bookInvalid     atomic.Uint64

	signalCreated   atomic.Uint64
	signalDuplicate atomic.Uint64
	signalExpired   atomic.Uint64
	signalRetracted atomic.Uint64
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

func (m *Metrics) Prometheus() string {
	var out strings.Builder
	writeUpstreamMetrics(&out, "gamma", &m.gamma)
	writeUpstreamMetrics(&out, "clob", &m.clob)
	_, _ = fmt.Fprintf(&out, "retropick_markets_catalog_records_processed_total %d\n", m.catalogRecords.Load())
	_, _ = fmt.Fprintf(&out, "retropick_markets_catalog_last_success_timestamp_seconds %d\n", m.catalogLastSuccess.Load())
	writeLabeledCounter(&out, "retropick_markets_books_total", "state", "fresh", m.bookFresh.Load())
	writeLabeledCounter(&out, "retropick_markets_books_total", "state", "stale", m.bookStale.Load())
	writeLabeledCounter(&out, "retropick_markets_books_total", "state", "resyncing", m.bookResyncing.Load())
	writeLabeledCounter(&out, "retropick_markets_books_total", "state", "unavailable", m.bookUnavailable.Load())
	writeLabeledCounter(&out, "retropick_markets_books_total", "state", "invalid", m.bookInvalid.Load())
	writeLabeledCounter(&out, "retropick_markets_signals_total", "result", "created", m.signalCreated.Load())
	writeLabeledCounter(&out, "retropick_markets_signals_total", "result", "duplicate", m.signalDuplicate.Load())
	writeLabeledCounter(&out, "retropick_markets_signals_total", "result", "expired", m.signalExpired.Load())
	writeLabeledCounter(&out, "retropick_markets_signals_total", "result", "retracted", m.signalRetracted.Load())
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
