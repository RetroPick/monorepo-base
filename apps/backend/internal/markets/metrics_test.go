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
		"retropick_markets_eligibility_fail_closed_total 0",
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

func TestMetricsRecordPreviewSignMatch(t *testing.T) {
	t.Parallel()

	metrics := NewMetrics()
	metrics.RecordPreviewSignMatch(true)
	metrics.RecordPreviewSignMatch(true)
	metrics.RecordPreviewSignMatch(false)

	output := metrics.Prometheus()
	if !strings.Contains(output, `retropick_markets_preview_sign_match_total{result="match"} 2`) {
		t.Fatalf("metrics missing preview_sign_match match:\n%s", output)
	}
	if !strings.Contains(output, `retropick_markets_preview_sign_match_total{result="mismatch"} 1`) {
		t.Fatalf("metrics missing preview_sign_match mismatch:\n%s", output)
	}
}

func TestMetricsRecordEligibilityFailClosed(t *testing.T) {
	t.Parallel()

	metrics := NewMetrics()
	metrics.RecordEligibilityFailClosed("geo_unknown")
	metrics.RecordEligibilityFailClosed("geo_unknown")

	output := metrics.Prometheus()
	if !strings.Contains(output, "retropick_markets_eligibility_fail_closed_total 2") {
		t.Fatalf("metrics missing eligibility_fail_closed:\n%s", output)
	}
}

func TestMetricsRecordReconcile(t *testing.T) {
	t.Parallel()

	metrics := NewMetrics()
	metrics.RecordReconcileScanned(2)
	metrics.RecordReconcileRun(1, 500*time.Millisecond)
	metrics.RecordReconcileRepair("open")
	metrics.RecordReconcileRepair("unknown")
	metrics.RecordReconcileRepair("rejected")
	metrics.RecordReconcileError("upstream")
	metrics.RecordReconcileError("journal")

	output := metrics.Prometheus()
	required := []string{
		"retropick_markets_order_reconcile_scanned_total 2",
		`retropick_markets_order_reconcile_repairs_total{outcome="open"} 1`,
		`retropick_markets_order_reconcile_repairs_total{outcome="unknown"} 1`,
		`retropick_markets_order_reconcile_repairs_total{outcome="rejected"} 1`,
		`retropick_markets_order_reconcile_errors_total{kind="upstream"} 1`,
		`retropick_markets_order_reconcile_errors_total{kind="journal"} 1`,
		"retropick_markets_order_reconciliation_pending 2",
		"retropick_markets_order_reconciliation_attempts 1",
		"retropick_markets_order_reconciliation_recovered 1",
		"retropick_markets_order_reconciliation_unknown 1",
		"retropick_markets_order_reconciliation_errors 2",
		"retropick_markets_order_reconciliation_age 0.500000",
		"retropick_markets_order_reconcile_lag_seconds_count 1",
		"retropick_markets_reconciliation_lag_seconds_count 1",
	}
	for _, line := range required {
		if !strings.Contains(output, line) {
			t.Fatalf("metrics missing %q:\n%s", line, output)
		}
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
