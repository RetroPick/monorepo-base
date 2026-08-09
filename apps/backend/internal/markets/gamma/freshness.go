package gamma

import (
	"fmt"
	"sort"
	"sync"
)

const freshnessSampleSize = 256

var (
	freshnessMu        sync.Mutex
	freshnessSamples   [freshnessSampleSize]float64
	freshnessSampleIdx int
	freshnessSampleLen int
	freshnessSum       float64
)

// ObserveCatalogFreshnessSeconds records catalog projection age for SLO tracking.
func ObserveCatalogFreshnessSeconds(age float64) {
	if age < 0 {
		age = 0
	}
	freshnessMu.Lock()
	defer freshnessMu.Unlock()
	if freshnessSampleLen < freshnessSampleSize {
		freshnessSamples[freshnessSampleLen] = age
		freshnessSampleLen++
	} else {
		old := freshnessSamples[freshnessSampleIdx]
		freshnessSum -= old
		freshnessSamples[freshnessSampleIdx] = age
		freshnessSampleIdx = (freshnessSampleIdx + 1) % freshnessSampleSize
	}
	freshnessSum += age
}

// CatalogFreshnessP95 returns the p95 catalog freshness age in seconds from recent observations.
func CatalogFreshnessP95() float64 {
	freshnessMu.Lock()
	defer freshnessMu.Unlock()
	return catalogFreshnessP95Locked()
}

func catalogFreshnessP95Locked() float64 {
	if freshnessSampleLen == 0 {
		return 0
	}
	values := make([]float64, freshnessSampleLen)
	copy(values, freshnessSamples[:freshnessSampleLen])
	sort.Float64s(values)
	index := int(float64(freshnessSampleLen-1) * 0.95)
	if index < 0 {
		index = 0
	}
	if index >= len(values) {
		index = len(values) - 1
	}
	return values[index]
}

// PrometheusFreshnessLines exports bounded catalog freshness metrics for scraping.
func PrometheusFreshnessLines() string {
	freshnessMu.Lock()
	count := freshnessSampleLen
	sum := freshnessSum
	p95 := catalogFreshnessP95Locked()
	freshnessMu.Unlock()

	return fmt.Sprintf(
		"retropick_markets_catalog_freshness_seconds_count %d\n"+
			"retropick_markets_catalog_freshness_seconds_sum %.6f\n"+
			"retropick_markets_catalog_freshness_p95_seconds %.6f\n",
		count,
		sum,
		p95,
	)
}

// ResetCatalogFreshnessMetrics clears freshness observations (tests only).
func ResetCatalogFreshnessMetrics() {
	freshnessMu.Lock()
	defer freshnessMu.Unlock()
	freshnessSampleIdx = 0
	freshnessSampleLen = 0
	freshnessSum = 0
}
