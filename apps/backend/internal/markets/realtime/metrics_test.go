package realtime_test

import (
	"strings"
	"testing"
	"time"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/realtime"
)

func TestSnapshotAgeObserverRecordsPublishAge(t *testing.T) {
	t.Parallel()

	observer := realtime.NewSnapshotAgeObserver()
	observed := time.Date(2026, 8, 9, 12, 0, 0, 0, time.UTC)
	published := observed.Add(2 * time.Second)
	observer.ObservePublishAge(observed, published)
	if observer.Count() != 1 {
		t.Fatalf("count %d", observer.Count())
	}
	if observer.MaxAge() != 2*time.Second {
		t.Fatalf("max age %v", observer.MaxAge())
	}
}

func TestSnapshotAgeObserverPrometheusFragment(t *testing.T) {
	t.Parallel()

	observer := realtime.NewSnapshotAgeObserver()
	observed := time.Date(2026, 8, 9, 12, 0, 0, 0, time.UTC)
	observer.ObservePublishAge(observed, observed.Add(time.Second))
	fragment := observer.PrometheusFragment()
	if !strings.Contains(fragment, "retropick_markets_orderbook_snapshot_age_seconds_sum") {
		t.Fatalf("fragment %q", fragment)
	}
	if !strings.Contains(fragment, "retropick_markets_orderbook_snapshot_age_seconds_count 1") {
		t.Fatalf("fragment %q", fragment)
	}
}

func TestProducerObservesSnapshotAge(t *testing.T) {
	t.Parallel()

	observer := realtime.NewSnapshotAgeObserver()
	hub := realtime.NewHub(realtime.HubConfig{MaxQueue: 4})
	producer := realtime.NewProducer(realtime.ProducerConfig{
		Hub:     hub,
		Metrics: observer,
	})
	now := time.Date(2026, 8, 9, 12, 0, 0, 0, time.UTC)
	producer.PublishSignal("market-1", "token-1", mustSnapshotEnvelope(t, now))
	if observer.Count() != 1 {
		t.Fatalf("expected snapshot age observation, count %d", observer.Count())
	}
	if observer.MaxAge() != 1500*time.Millisecond {
		t.Fatalf("max age %v", observer.MaxAge())
	}
}

func mustSnapshotEnvelope(t *testing.T, now time.Time) markets.RealtimeEnvelope {
	t.Helper()
	envelope, err := realtime.NewEnvelope(
		realtime.TypeOrderBookSnapshot,
		"market-1", "token-1", "token-1", "hash-1",
		1, 1, now.Add(-1500*time.Millisecond), now,
		map[string]string{"status": "ok"},
	)
	if err != nil {
		t.Fatal(err)
	}
	return envelope
}
