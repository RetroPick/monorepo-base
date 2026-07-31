package signals_test

import (
	"testing"
	"time"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/signals"
)

func TestComputeMidpointPrice(t *testing.T) {
	t.Parallel()
	bid := markets.DecimalString("0.4")
	ask := markets.DecimalString("0.6")
	mid, err := signals.ComputeMidpointPrice(&bid, &ask)
	if err != nil || mid == nil {
		t.Fatalf("mid %v err %v", mid, err)
	}
	if string(*mid) != "0.5" {
		t.Fatalf("mid %s", *mid)
	}
}

func TestComputeMidpointCrossedBookRejected(t *testing.T) {
	t.Parallel()
	bid := markets.DecimalString("0.7")
	ask := markets.DecimalString("0.6")
	_, err := signals.ComputeMidpointPrice(&bid, &ask)
	if err == nil {
		t.Fatal("expected crossed book error")
	}
}

func TestDeltaProbabilityPoints(t *testing.T) {
	t.Parallel()
	current := markets.DecimalString("0.55")
	reference := markets.DecimalString("0.50")
	delta, err := signals.DeltaProbabilityPoints(current, reference)
	if err != nil {
		t.Fatal(err)
	}
	if delta < 4_900_000 || delta > 5_100_000 {
		t.Fatalf("delta %d", delta)
	}
}

func TestEvaluatePriceMoveThreshold(t *testing.T) {
	t.Parallel()
	cfg := signals.DefaultPriceRuleConfig(time.Minute)
	emit, dir := signals.EvaluatePriceMove(3_000_000, cfg, "")
	if !emit || dir != signals.DirectionUp {
		t.Fatalf("emit %v dir %s", emit, dir)
	}
	emit, _ = signals.EvaluatePriceMove(1_000_000, cfg, "")
	if emit {
		t.Fatal("should not emit below threshold")
	}
}

func TestEvaluatePriceMoveBoundaryExact(t *testing.T) {
	t.Parallel()
	cfg := signals.DefaultPriceRuleConfig(time.Minute)
	emit, _ := signals.EvaluatePriceMove(cfg.ThresholdOnMicroPP, cfg, "")
	if !emit {
		t.Fatal("exact threshold should emit")
	}
	emit, _ = signals.EvaluatePriceMove(cfg.ThresholdOnMicroPP-1, cfg, "")
	if emit {
		t.Fatal("one micro-PP below threshold should not emit")
	}
}

func TestRelativeDepthChangeZeroBaselineUsesFloor(t *testing.T) {
	t.Parallel()
	current := markets.DecimalString("100")
	reference := markets.DecimalString("0")
	floor, _ := signals.ParseMicroDecimal("10")
	change, err := signals.RelativeDepthChange(current, reference, floor)
	if err != nil {
		t.Fatal(err)
	}
	if change < 9_000_000 {
		t.Fatalf("change %d", change)
	}
}

func TestPriceMoveIdempotencyKeyCanonicalThreshold(t *testing.T) {
	t.Parallel()
	bucketEnd := time.Date(2026, 7, 31, 12, 0, 0, 0, time.UTC)
	on2, _ := signals.ParseMicroPP("2")
	on20, _ := signals.ParseMicroPP("2.0")
	key1 := signals.PriceMoveIdempotencyKey(signals.RuleVersionP13, "m1", "t1", bucketEnd, "up", on2)
	key2 := signals.PriceMoveIdempotencyKey(signals.RuleVersionP13, "m1", "t1", bucketEnd, "up", on20)
	if key1 != key2 {
		t.Fatalf("canonical threshold keys differ")
	}
}

func TestLiquidityChangeIdempotencyIncludesEpsilon(t *testing.T) {
	t.Parallel()
	bucketEnd := time.Date(2026, 7, 31, 12, 0, 0, 0, time.UTC)
	threshold, _ := signals.ParseMicroDecimal("0.25")
	epsilon, _ := signals.ParseMicroDecimal("0.01")
	key := signals.LiquidityChangeIdempotencyKey(signals.RuleVersionP13, "m1", "t1", bucketEnd, "up", threshold, epsilon)
	if key == "" {
		t.Fatal("empty key")
	}
}

func TestComputeLiquidityDepthsRejectsStaleBook(t *testing.T) {
	t.Parallel()
	epsilon, _ := signals.ParseMicroDecimal("0.01")
	snapshot := markets.OrderBookSnapshot{
		BestBid: ptrDecimal("0.4"),
		BestAsk: ptrDecimal("0.6"),
		Bids:    []markets.OrderBookLevel{{Price: "0.4", Size: "10"}},
		Asks:    []markets.OrderBookLevel{{Price: "0.6", Size: "10"}},
		Freshness: markets.MarketFreshness{State: markets.FreshnessStale},
	}
	_, _, _, err := signals.ComputeLiquidityDepths(snapshot, epsilon)
	if err == nil {
		t.Fatal("expected stale rejection")
	}
}

func ptrDecimal(v string) *markets.DecimalString {
	d := markets.DecimalString(v)
	return &d
}
