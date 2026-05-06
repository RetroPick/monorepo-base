package marketdata

import (
	"testing"
	"time"
)

func TestBucketStart(t *testing.T) {
	ts := time.Date(2026, 5, 5, 10, 4, 59, 0, time.UTC)
	got := bucketStart(ts, 60)
	want := time.Date(2026, 5, 5, 10, 4, 0, 0, time.UTC)
	if !got.Equal(want) {
		t.Fatalf("bucketStart mismatch: got=%s want=%s", got, want)
	}
}

func TestCandleEventDedupeKeyAllowsRepeatedIntraBucketUpdates(t *testing.T) {
	first := candleEventDedupeKey("btc-usd", 60, time.Date(2026, 5, 5, 10, 4, 10, 0, time.UTC))
	second := candleEventDedupeKey("btc-usd", 60, time.Date(2026, 5, 5, 10, 4, 40, 0, time.UTC))

	if first == second {
		t.Fatalf("expected unique dedupe keys for repeated intra-bucket updates, got %q", first)
	}
}
