package marketdata

import (
	"errors"
	"testing"
	"time"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/clob"
)

func TestBuildSnapshotSortsBestLevelsAndCalculatesExactSpread(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 7, 30, 5, 0, 0, 0, time.UTC)
	snapshot, err := BuildSnapshot("polymarket:market:1", clob.OrderBook{
		ConditionID:  "0xabc",
		TokenID:      "token-yes",
		Timestamp:    now.Add(-2 * time.Second),
		Hash:         "hash-1",
		Bids:         []clob.Level{{Price: "0.10", Size: "10"}, {Price: "0.40", Size: "5.5"}},
		Asks:         []clob.Level{{Price: "0.90", Size: "8"}, {Price: "0.60", Size: "4"}},
		MinOrderSize: "5",
		TickSize:     "0.01",
	}, now, 5*time.Second)
	if err != nil {
		t.Fatal(err)
	}
	if snapshot.Bids[0].Price != "0.40" || snapshot.Asks[0].Price != "0.60" {
		t.Fatalf("levels bids=%+v asks=%+v", snapshot.Bids, snapshot.Asks)
	}
	if snapshot.BestBid == nil || *snapshot.BestBid != "0.40" {
		t.Fatalf("best bid %v", snapshot.BestBid)
	}
	if snapshot.BestAsk == nil || *snapshot.BestAsk != "0.60" {
		t.Fatalf("best ask %v", snapshot.BestAsk)
	}
	if snapshot.Midpoint == nil || *snapshot.Midpoint != "0.5" {
		t.Fatalf("midpoint %v", snapshot.Midpoint)
	}
	if snapshot.Spread == nil || *snapshot.Spread != "0.2" {
		t.Fatalf("spread %v", snapshot.Spread)
	}
	if snapshot.Freshness.State != markets.FreshnessFresh {
		t.Fatalf("freshness %+v", snapshot.Freshness)
	}
}

func TestBuildSnapshotMarksCrossedBookInvalid(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 7, 30, 5, 0, 0, 0, time.UTC)
	snapshot, err := BuildSnapshot("market-1", clob.OrderBook{
		ConditionID:  "0xabc",
		TokenID:      "token-yes",
		Timestamp:    now,
		Hash:         "hash-1",
		Bids:         []clob.Level{{Price: "0.70", Size: "1"}},
		Asks:         []clob.Level{{Price: "0.60", Size: "1"}},
		MinOrderSize: "1",
		TickSize:     "0.01",
	}, now, 5*time.Second)
	if !errors.Is(err, ErrCrossedBook) {
		t.Fatalf("error %v", err)
	}
	if snapshot.Freshness.State != markets.FreshnessInvalid {
		t.Fatalf("freshness %+v", snapshot.Freshness)
	}
}

func TestBuildSnapshotLabelsOldSnapshotStale(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 7, 30, 5, 0, 0, 0, time.UTC)
	snapshot, err := BuildSnapshot("market-1", clob.OrderBook{
		ConditionID:  "0xabc",
		TokenID:      "token-yes",
		Timestamp:    now.Add(-10 * time.Second),
		Hash:         "hash-1",
		Bids:         []clob.Level{},
		Asks:         []clob.Level{},
		MinOrderSize: "1",
		TickSize:     "0.01",
	}, now, 5*time.Second)
	if err != nil {
		t.Fatal(err)
	}
	if snapshot.Freshness.State != markets.FreshnessStale || snapshot.Freshness.Reason != "snapshot_age_exceeded" {
		t.Fatalf("freshness %+v", snapshot.Freshness)
	}
}

func TestApplyDeltaForcesResyncOnHashGap(t *testing.T) {
	t.Parallel()

	state := State{Snapshot: markets.OrderBookSnapshot{
		Hash:      "hash-1",
		Timestamp: time.Unix(10, 0).UTC(),
		Freshness: markets.MarketFreshness{State: markets.FreshnessFresh},
	}}
	err := state.ApplyDelta(Delta{
		BaseHash:  "wrong-hash",
		NextHash:  "hash-2",
		Timestamp: time.Unix(11, 0).UTC(),
		Side:      SideBid,
		Price:     mustDecimal(t, "0.4"),
		Size:      mustDecimal(t, "1"),
	})
	if !errors.Is(err, ErrGapDetected) {
		t.Fatalf("error %v", err)
	}
	if state.Snapshot.Freshness.State != markets.FreshnessResyncing {
		t.Fatalf("freshness %+v", state.Snapshot.Freshness)
	}
}

func TestApplyDeltaUpdatesAndRemovesLevels(t *testing.T) {
	t.Parallel()

	state := State{Snapshot: markets.OrderBookSnapshot{
		Hash:      "hash-1",
		Timestamp: time.Unix(10, 0).UTC(),
		Bids: []markets.OrderBookLevel{
			{Price: mustDecimal(t, "0.4"), Size: mustDecimal(t, "2")},
			{Price: mustDecimal(t, "0.3"), Size: mustDecimal(t, "3")},
		},
		Freshness: markets.MarketFreshness{State: markets.FreshnessFresh},
	}}
	if err := state.ApplyDelta(Delta{
		BaseHash:  "hash-1",
		NextHash:  "hash-2",
		Timestamp: time.Unix(11, 0).UTC(),
		Side:      SideBid,
		Price:     mustDecimal(t, "0.4"),
		Size:      mustDecimal(t, "0"),
	}); err != nil {
		t.Fatal(err)
	}
	if state.Snapshot.Hash != "hash-2" || len(state.Snapshot.Bids) != 1 || state.Snapshot.Bids[0].Price != "0.3" {
		t.Fatalf("snapshot %+v", state.Snapshot)
	}
}

func TestHealthUsesDeterministicComponentsWithoutCompositeScore(t *testing.T) {
	t.Parallel()

	observed := time.Date(2026, 7, 30, 5, 0, 0, 0, time.UTC)
	health, err := Health(markets.OrderBookSnapshot{
		MarketID:  "market-1",
		Timestamp: observed,
		Bids: []markets.OrderBookLevel{
			{Price: mustDecimal(t, "0.4"), Size: mustDecimal(t, "10")},
			{Price: mustDecimal(t, "0.3"), Size: mustDecimal(t, "5.5")},
		},
		Asks: []markets.OrderBookLevel{
			{Price: mustDecimal(t, "0.6"), Size: mustDecimal(t, "12")},
		},
		Freshness:  markets.MarketFreshness{State: markets.FreshnessFresh, ObservedAt: observed},
		Provenance: markets.UpstreamProvenance{Source: "polymarket_clob", ObservedAt: observed},
	}, observed.Add(time.Second))
	if err != nil {
		t.Fatal(err)
	}
	if health.Algorithm != "market-health-components-v1" {
		t.Fatalf("algorithm %q", health.Algorithm)
	}
	if health.BidDepth != "15.5" || health.AskDepth != "12" || health.SnapshotAgeMS != 1000 {
		t.Fatalf("health %+v", health)
	}
}

func TestNormalizeHistoryPreservesSparseTimestamps(t *testing.T) {
	t.Parallel()

	points, err := NormalizeHistory([]clob.PricePoint{
		{Timestamp: time.Unix(100, 0).UTC(), Price: "0.1"},
		{Timestamp: time.Unix(1000, 0).UTC(), Price: "0.2"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(points) != 2 || points[1].Timestamp.Sub(points[0].Timestamp) != 15*time.Minute {
		t.Fatalf("points %+v", points)
	}
	if points[0].Derived || points[0].Source != "polymarket_clob" {
		t.Fatalf("point %+v", points[0])
	}
}

func mustDecimal(t *testing.T, raw string) markets.DecimalString {
	t.Helper()
	value, err := markets.ParseDecimalString(raw)
	if err != nil {
		t.Fatal(err)
	}
	return value
}
