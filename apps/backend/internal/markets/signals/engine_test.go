package signals

import (
	"testing"
	"time"

	"retropick/apps/backend/internal/markets"
)

func TestNewMarketSignalIsDeterministicAndEvidenceLinked(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 7, 30, 8, 0, 0, 0, time.UTC)
	engine := NewEngine(EngineConfig{Now: func() time.Time { return now }, TTL: 24 * time.Hour})
	input := Observation{
		Kind:       TypeNewMarket,
		MarketID:   "market-1",
		ObservedAt: now.Add(-time.Minute),
		Evidence:   evidence("catalog_event", "event-1", now.Add(-time.Minute), "hash-1"),
	}
	first, err := engine.Evaluate(input)
	if err != nil {
		t.Fatal(err)
	}
	second, err := engine.Evaluate(input)
	if err != nil {
		t.Fatal(err)
	}
	if first == nil || second == nil {
		t.Fatal("new market did not emit")
	}
	if first.ID != second.ID || first.IdempotencyKey != second.IdempotencyKey {
		t.Fatalf("signals differ first=%+v second=%+v", first, second)
	}
	if first.RuleVersion != RuleVersion || first.State != StateConfirmed || len(first.Evidence) != 1 {
		t.Fatalf("signal %+v", first)
	}
}

func TestPriceMoveHonorsExactThreshold(t *testing.T) {
	t.Parallel()

	engine := NewEngine(EngineConfig{})
	base := Observation{
		Kind:       TypePriceMove,
		MarketID:   "market-1",
		ObservedAt: time.Unix(100, 0).UTC(),
		Previous:   decimal(t, "0.40"),
		Current:    decimal(t, "0.45"),
		Threshold:  decimal(t, "0.05"),
		Evidence:   evidence("price_point", "point-1", time.Unix(100, 0).UTC(), "hash-1"),
	}
	signal, err := engine.Evaluate(base)
	if err != nil {
		t.Fatal(err)
	}
	if signal == nil || signal.Type != TypePriceMove {
		t.Fatalf("signal %+v", signal)
	}
	base.Current = decimal(t, "0.449")
	signal, err = engine.Evaluate(base)
	if err != nil {
		t.Fatal(err)
	}
	if signal != nil {
		t.Fatalf("sub-threshold signal %+v", signal)
	}
}

func TestLiquidityChangeSupportsDecrease(t *testing.T) {
	t.Parallel()

	engine := NewEngine(EngineConfig{})
	signal, err := engine.Evaluate(Observation{
		Kind:       TypeLiquidityChange,
		MarketID:   "market-1",
		ObservedAt: time.Unix(100, 0).UTC(),
		Previous:   decimal(t, "100"),
		Current:    decimal(t, "70"),
		Threshold:  decimal(t, "25"),
		Evidence:   evidence("market_health", "health-1", time.Unix(100, 0).UTC(), "hash-1"),
	})
	if err != nil {
		t.Fatal(err)
	}
	if signal == nil || signal.ReasonCodes[0] != "liquidity_decreased" {
		t.Fatalf("signal %+v", signal)
	}
}

func TestRuleChangedOnlyEmitsForDifferentHashes(t *testing.T) {
	t.Parallel()

	engine := NewEngine(EngineConfig{})
	input := Observation{
		Kind:         TypeRuleChanged,
		MarketID:     "market-1",
		ObservedAt:   time.Unix(100, 0).UTC(),
		PreviousHash: "hash-old",
		CurrentHash:  "hash-new",
		Evidence:     evidence("resolution_rule", "rule-1", time.Unix(100, 0).UTC(), "hash-new"),
	}
	signal, err := engine.Evaluate(input)
	if err != nil {
		t.Fatal(err)
	}
	if signal == nil || signal.ReasonCodes[0] != "resolution_rule_changed" {
		t.Fatalf("signal %+v", signal)
	}
	input.CurrentHash = input.PreviousHash
	signal, err = engine.Evaluate(input)
	if err != nil {
		t.Fatal(err)
	}
	if signal != nil {
		t.Fatalf("unchanged rule emitted %+v", signal)
	}
}

func TestRetractionPreservesOriginalEvidence(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 7, 30, 8, 0, 0, 0, time.UTC)
	engine := NewEngine(EngineConfig{Now: func() time.Time { return now }})
	signal, err := engine.Evaluate(Observation{
		Kind:       TypeNewMarket,
		MarketID:   "market-1",
		ObservedAt: now,
		Evidence:   evidence("catalog_event", "event-1", now, "hash-1"),
	})
	if err != nil {
		t.Fatal(err)
	}
	retracted, err := Retract(*signal, "source_corrected", "correction-1", now.Add(time.Hour))
	if err != nil {
		t.Fatal(err)
	}
	if retracted.State != StateRetracted || retracted.RetractedAt == nil {
		t.Fatalf("retracted %+v", retracted)
	}
	if len(retracted.Evidence) != 2 || retracted.Evidence[0].ContentHash != "hash-1" {
		t.Fatalf("evidence %+v", retracted.Evidence)
	}
}

func TestExpireOnlyAfterExpiryTime(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 7, 30, 8, 0, 0, 0, time.UTC)
	engine := NewEngine(EngineConfig{Now: func() time.Time { return now }, TTL: time.Hour})
	signal, err := engine.Evaluate(Observation{
		Kind:       TypeNewMarket,
		MarketID:   "market-1",
		ObservedAt: now,
		Evidence:   evidence("catalog_event", "event-1", now, "hash-1"),
	})
	if err != nil {
		t.Fatal(err)
	}
	if Expire(*signal, now.Add(30*time.Minute)).State != StateConfirmed {
		t.Fatal("signal expired too early")
	}
	if Expire(*signal, now.Add(2*time.Hour)).State != StateExpired {
		t.Fatal("signal did not expire")
	}
}

func evidence(kind, referenceID string, observedAt time.Time, hash string) []markets.SignalEvidence {
	return []markets.SignalEvidence{{
		Kind:        kind,
		ReferenceID: referenceID,
		ObservedAt:  observedAt,
		ContentHash: hash,
	}}
}

func decimal(t *testing.T, raw string) markets.DecimalString {
	t.Helper()
	value, err := markets.ParseDecimalString(raw)
	if err != nil {
		t.Fatal(err)
	}
	return value
}
