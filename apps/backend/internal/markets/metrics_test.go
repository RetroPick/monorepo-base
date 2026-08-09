package markets

import (
	"math"
	"strings"
	"testing"
	"time"
)

func TestMetricsExposeBoundedPrometheusSeries(t *testing.T) {
	t.Parallel()

	metrics := NewMetrics()
	metrics.ObserveUpstream("gamma", true, 25*time.Millisecond)
	metrics.ObserveUpstream("gamma", false, 10*time.Millisecond)
	metrics.ObserveUpstream("clob", true, 5*time.Millisecond)
	metrics.RecordCatalogSync(3, time.Unix(100, 0).UTC())
	metrics.ObserveCatalogFreshness(30 * time.Second)
	metrics.ObserveCatalogFreshness(90 * time.Second)
	metrics.RecordGammaError("rate_limited")
	metrics.RecordBookState(FreshnessStale)
	metrics.RecordBookState(FreshnessResyncing)
	metrics.RecordSignal("created")
	metrics.RecordSignal("duplicate")

	if mean := metrics.CatalogFreshnessMeanSeconds(); math.Abs(mean-60) > 0.001 {
		t.Fatalf("catalog freshness mean %v want 60", mean)
	}

	output := metrics.Prometheus()
	required := []string{
		`retropick_markets_upstream_requests_total{upstream="gamma",result="ok"} 1`,
		`retropick_markets_upstream_requests_total{upstream="gamma",result="error"} 1`,
		`retropick_markets_upstream_requests_total{upstream="clob",result="ok"} 1`,
		`retropick_markets_catalog_records_processed_total 3`,
		`retropick_markets_catalog_last_success_timestamp_seconds 100`,
		`retropick_markets_catalog_freshness_seconds_sum 120.000000`,
		`retropick_markets_catalog_freshness_seconds_count 2`,
		`retropick_markets_catalog_freshness_within_slo_total 1`,
		`retropick_markets_gamma_errors_total{kind="rate_limited"} 1`,
		`retropick_markets_books_total{state="stale"} 1`,
		`retropick_markets_books_total{state="resyncing"} 1`,
		`retropick_markets_signals_total{result="created"} 1`,
	}
	for _, line := range required {
		if !strings.Contains(output, line) {
			t.Errorf("metrics missing %q:\n%s", line, output)
		}
	}
	if strings.Contains(output, "market-1") {
		t.Fatal("high-cardinality market label leaked into metrics")
	}
}

func TestMetricsIgnoreUnknownLabelValues(t *testing.T) {
	t.Parallel()

	metrics := NewMetrics()
	metrics.ObserveUpstream("attacker-controlled", true, time.Second)
	metrics.RecordBookState(FreshnessState("attacker-controlled"))
	metrics.RecordSignal("attacker-controlled")
	metrics.RecordGammaError("attacker-controlled")
	if output := metrics.Prometheus(); strings.Contains(output, "attacker-controlled") {
		t.Fatalf("unbounded label emitted:\n%s", output)
	}
}
