package signals_test

import (
	"testing"

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
	if delta < 4.9 || delta > 5.1 {
		t.Fatalf("delta %f", delta)
	}
}

func TestEvaluatePriceMoveThreshold(t *testing.T) {
	t.Parallel()
	cfg := signals.PriceRuleConfig{ThresholdOnPP: 2, ThresholdOffPP: 1}
	emit, dir := signals.EvaluatePriceMove(3, cfg, "")
	if !emit || dir != signals.DirectionUp {
		t.Fatalf("emit %v dir %s", emit, dir)
	}
	emit, _ = signals.EvaluatePriceMove(1, cfg, "")
	if emit {
		t.Fatal("should not emit below threshold")
	}
}

func TestRelativeDepthChangeZeroBaselineUsesFloor(t *testing.T) {
	t.Parallel()
	current := markets.DecimalString("100")
	reference := markets.DecimalString("0")
	change, err := signals.RelativeDepthChange(current, reference, 10)
	if err != nil {
		t.Fatal(err)
	}
	if change < 9 {
		t.Fatalf("change %f", change)
	}
}

func TestPriceMoveIdempotencyKeyDeterministic(t *testing.T) {
	t.Parallel()
	bucket := signals.PriceBucket{
		MarketID: "m1", TokenID: "t1", RuleVersion: signals.RuleVersionP13,
	}
	key1 := signals.PriceMoveIdempotencyKey(signals.RuleVersionP13, "m1", "t1", bucket.BucketEnd, "up", 2)
	key2 := signals.PriceMoveIdempotencyKey(signals.RuleVersionP13, "m1", "t1", bucket.BucketEnd, "up", 2)
	if key1 != key2 {
		t.Fatalf("keys differ %s %s", key1, key2)
	}
}
