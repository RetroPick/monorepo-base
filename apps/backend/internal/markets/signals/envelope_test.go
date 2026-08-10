package signals

import (
	"errors"
	"testing"
	"time"
)

func TestProvenanceIDFromParamsRef(t *testing.T) {
	t.Parallel()
	got := ProvenanceID("intelligence_params_v1.yaml#large_trade_v1")
	if got != "large_trade_v1" {
		t.Fatalf("provenanceId %q", got)
	}
}

func TestBuildEvidenceEnvelopeGoldenVector(t *testing.T) {
	t.Parallel()

	computedAt := time.Date(2026, 8, 9, 0, 0, 0, 0, time.UTC)
	first, err := BuildEvidenceEnvelope(BuildOptions{
		SignalType: SignalTypeWhaleTrade,
		ComputedAt: computedAt,
		Inputs: map[string]string{
			"tradeId":  "data:trades:abc",
			"marketId": "market_123",
			"wallet":   "0xabc...",
		},
		Metrics: map[string]int64{
			"notional":           42500000000,
			"pctRecentVolumeBps": 630,
		},
		ParamsRef:   "intelligence_params_v1.yaml#large_trade_v1",
		ReasonCodes: []string{"LARGE_NOTIONAL", "PCT_RECENT_VOLUME"},
	})
	if err != nil {
		t.Fatal(err)
	}
	second, err := BuildEvidenceEnvelope(BuildOptions{
		SignalType: SignalTypeWhaleTrade,
		ComputedAt: computedAt,
		Inputs: map[string]string{
			"tradeId":  "data:trades:abc",
			"marketId": "market_123",
			"wallet":   "0xabc...",
		},
		Metrics: map[string]int64{
			"notional":           42500000000,
			"pctRecentVolumeBps": 630,
		},
		ParamsRef:   "intelligence_params_v1.yaml#large_trade_v1",
		ReasonCodes: []string{"LARGE_NOTIONAL", "PCT_RECENT_VOLUME"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if first.Hash != second.Hash {
		t.Fatalf("hashes differ %q vs %q", first.Hash, second.Hash)
	}
	if first.Lifecycle != LifecycleDraft || first.ProvenanceID != "large_trade_v1" {
		t.Fatalf("envelope %+v", first)
	}
	if !VerifyHash(first) {
		t.Fatal("hash verification failed")
	}
}

func TestBuildEvidenceEnvelopeHashChangesWhenContentChanges(t *testing.T) {
	t.Parallel()

	base := BuildOptions{
		SignalType: SignalTypeWhaleTrade,
		ComputedAt: time.Date(2026, 8, 9, 0, 0, 0, 0, time.UTC),
		Inputs: map[string]string{
			"tradeId": "data:trades:abc",
		},
		Metrics: map[string]int64{
			"notional": 42500000000,
		},
		ParamsRef:   "intelligence_params_v1.yaml#large_trade_v1",
		ReasonCodes: []string{"LARGE_NOTIONAL"},
	}
	first, err := BuildEvidenceEnvelope(base)
	if err != nil {
		t.Fatal(err)
	}
	base.Metrics["notional"] = 42600000000
	second, err := BuildEvidenceEnvelope(base)
	if err != nil {
		t.Fatal(err)
	}
	if first.Hash == second.Hash {
		t.Fatal("expected different hashes")
	}
}

func TestValidateRejectsInvalidEnvelope(t *testing.T) {
	t.Parallel()

	cases := []EvidenceEnvelope{
		{Version: 0},
		{Version: EnvelopeSchemaVersion, SignalType: SignalTypeWhaleTrade},
		{
			Version:     EnvelopeSchemaVersion,
			SignalType:  SignalTypeWhaleTrade,
			ComputedAt:  time.Unix(100, 0).UTC(),
			Inputs:      map[string]string{"tradeId": "x"},
			Metrics:     map[string]int64{"notional": 1},
			ParamsRef:   "params#v1",
			ReasonCodes: []string{"CODE"},
			Hash:        "bad",
			Lifecycle:   LifecycleDraft,
		},
	}
	for index, envelope := range cases {
		if err := Validate(envelope); !errors.Is(err, ErrInvalidEnvelope) {
			t.Fatalf("case %d err=%v", index, err)
		}
	}
}

func TestValidateAcceptsPublishedEnvelope(t *testing.T) {
	t.Parallel()

	draft, err := BuildEvidenceEnvelope(BuildOptions{
		SignalType:  SignalTypeWhaleTrade,
		ComputedAt:  time.Date(2026, 8, 9, 0, 0, 0, 0, time.UTC),
		Inputs:      map[string]string{"tradeId": "data:trades:abc"},
		Metrics:     map[string]int64{"notional": 1},
		ParamsRef:   "intelligence_params_v1.yaml#large_trade_v1",
		ReasonCodes: []string{"LARGE_NOTIONAL"},
	})
	if err != nil {
		t.Fatal(err)
	}
	active, err := Publish(draft)
	if err != nil {
		t.Fatal(err)
	}
	if err := Validate(active); err != nil {
		t.Fatal(err)
	}
}

func TestCanonicalHashIgnoresMapKeyOrder(t *testing.T) {
	t.Parallel()

	computedAt := time.Date(2026, 8, 9, 0, 0, 0, 0, time.UTC)
	first, err := BuildEvidenceEnvelope(BuildOptions{
		SignalType: SignalTypeWhaleTrade,
		ComputedAt: computedAt,
		Inputs: map[string]string{
			"marketId": "market_123",
			"tradeId":  "data:trades:abc",
		},
		Metrics: map[string]int64{
			"pctRecentVolumeBps": 630,
			"notional":           42500000000,
		},
		ParamsRef:   "intelligence_params_v1.yaml#large_trade_v1",
		ReasonCodes: []string{"PCT_RECENT_VOLUME", "LARGE_NOTIONAL"},
	})
	if err != nil {
		t.Fatal(err)
	}
	second, err := BuildEvidenceEnvelope(BuildOptions{
		SignalType: SignalTypeWhaleTrade,
		ComputedAt: computedAt,
		Inputs: map[string]string{
			"tradeId":  "data:trades:abc",
			"marketId": "market_123",
		},
		Metrics: map[string]int64{
			"notional":           42500000000,
			"pctRecentVolumeBps": 630,
		},
		ParamsRef:   "intelligence_params_v1.yaml#large_trade_v1",
		ReasonCodes: []string{"LARGE_NOTIONAL", "PCT_RECENT_VOLUME"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if first.Hash != second.Hash {
		t.Fatalf("hashes differ %q vs %q", first.Hash, second.Hash)
	}
}
