package gamma

import (
	"strings"
	"testing"
)

func TestCatalogFreshnessP95(t *testing.T) {
	ResetCatalogFreshnessMetrics()
	for _, age := range []float64{10, 20, 30, 40, 50, 60, 70, 80, 90, 100} {
		ObserveCatalogFreshnessSeconds(age)
	}
	if got := CatalogFreshnessP95(); got != 90 {
		t.Fatalf("p95 %v", got)
	}
	output := PrometheusFreshnessLines()
	if !strings.Contains(output, "catalog_freshness_p95") {
		t.Fatalf("missing p95 metric:\n%s", output)
	}
	if !strings.Contains(output, "retropick_markets_catalog_freshness_seconds_count 10") {
		t.Fatalf("missing count:\n%s", output)
	}
}

func TestObserveCatalogFreshnessIgnoresNegativeAge(t *testing.T) {
	ResetCatalogFreshnessMetrics()
	ObserveCatalogFreshnessSeconds(-5)
	if got := CatalogFreshnessP95(); got != 0 {
		t.Fatalf("p95 %v", got)
	}
}
