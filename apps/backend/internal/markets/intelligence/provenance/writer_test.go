package provenance_test

import (
	"testing"
	"time"

	"retropick/apps/backend/internal/markets/intelligence/model"
	"retropick/apps/backend/internal/markets/intelligence/provenance"
	"retropick/apps/backend/internal/markets/intelligence/whale"
	"retropick/apps/backend/internal/markets/signals"
)

func TestBuildWhaleEnvelopeActive(t *testing.T) {
	writer := provenance.NewWriter()
	trade := model.NormalizedTrade{
		Source:          model.SourceDataTrades,
		UpstreamTradeID: "tr_1001",
		WalletAddress:   "0x1111111111111111111111111111111111111111",
		MarketID:        "market_demo_1",
		Side:            model.SideBuy,
		Outcome:         "YES",
		NotionalMinor:   42_500_000_000,
		TradedAt:        time.Date(2026, 8, 9, 10, 0, 0, 0, time.UTC),
	}
	result := whale.ClassifyResult{
		IsWhale:     true,
		WhaleScore:  88.5,
		ReasonCodes: []string{whale.ReasonNotionalThreshold, whale.ReasonVolumeShare},
		Fingerprint: "abc123",
	}
	envelope, err := writer.BuildWhaleEnvelope(trade, result, time.Date(2026, 8, 9, 10, 5, 0, 0, time.UTC))
	if err != nil {
		t.Fatal(err)
	}
	if envelope.Lifecycle != signals.LifecycleActive {
		t.Fatalf("lifecycle = %q", envelope.Lifecycle)
	}
	if envelope.SignalType != signals.SignalTypeWhaleTrade {
		t.Fatalf("signalType = %q", envelope.SignalType)
	}
	if envelope.ProvenanceID != "whale_score_launch" {
		t.Fatalf("provenanceId = %q", envelope.ProvenanceID)
	}
	if err := signals.Validate(envelope); err != nil {
		t.Fatal(err)
	}
}
