package realtime

import (
	"fmt"
	"strings"
	"sync/atomic"
	"time"
)

// SnapshotAgeObserver records order book snapshot publish ages for SLO monitoring.
type SnapshotAgeObserver struct {
	count atomic.Uint64
	sumNS atomic.Uint64
	maxNS atomic.Uint64
}

func NewSnapshotAgeObserver() *SnapshotAgeObserver {
	return &SnapshotAgeObserver{}
}

func (o *SnapshotAgeObserver) ObservePublishAge(observedAt, publishedAt time.Time) {
	if observedAt.IsZero() || publishedAt.IsZero() {
		return
	}
	age := publishedAt.Sub(observedAt)
	if age < 0 {
		age = 0
	}
	ns := uint64(age.Nanoseconds())
	o.count.Add(1)
	o.sumNS.Add(ns)
	for {
		prev := o.maxNS.Load()
		if ns <= prev || o.maxNS.CompareAndSwap(prev, ns) {
			break
		}
	}
}

func (o *SnapshotAgeObserver) Count() uint64 {
	return o.count.Load()
}

func (o *SnapshotAgeObserver) MaxAge() time.Duration {
	return time.Duration(o.maxNS.Load())
}

func (o *SnapshotAgeObserver) PrometheusFragment() string {
	count := o.count.Load()
	if count == 0 {
		return ""
	}
	sum := float64(o.sumNS.Load()) / float64(time.Second)
	var out strings.Builder
	_, _ = fmt.Fprintf(&out, "retropick_markets_orderbook_snapshot_age_seconds_sum %.6f\n", sum)
	_, _ = fmt.Fprintf(&out, "retropick_markets_orderbook_snapshot_age_seconds_count %d\n", count)
	_, _ = fmt.Fprintf(&out, "retropick_markets_orderbook_snapshot_age_seconds_max %.6f\n", float64(o.maxNS.Load())/float64(time.Second))
	return out.String()
}
