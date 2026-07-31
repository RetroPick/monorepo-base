package realtime_test

import (
	"encoding/json"
	"testing"
	"time"

	"retropick/apps/backend/internal/markets/realtime"
)

func TestSignalCreatedParticipatesInDeliveryStream(t *testing.T) {
	t.Parallel()
	tracker := realtime.NewDeliveryTracker()
	const tokenID = "token-1"
	epoch := tracker.BumpEpoch(tokenID)
	_, firstCounter := tracker.Next(tokenID)
	streamEpoch, deliveryCounter := tracker.Next(tokenID)
	if streamEpoch != epoch || deliveryCounter != firstCounter+1 {
		t.Fatalf("delivery stream epoch=%d counter=%d", streamEpoch, deliveryCounter)
	}
	now := time.Date(2026, 7, 31, 12, 0, 0, 0, time.UTC)
	signalEnvelope, err := realtime.NewEnvelope(
		realtime.TypeSignalCreated,
		"market-1", tokenID, tokenID, "book-hash",
		streamEpoch, deliveryCounter, now, now,
		map[string]string{"signalId": "signal:test"},
	)
	if err != nil {
		t.Fatal(err)
	}
	payload, err := realtime.MarshalEnvelope(signalEnvelope)
	if err != nil {
		t.Fatal(err)
	}
	var wire map[string]any
	if err := json.Unmarshal(payload, &wire); err != nil {
		t.Fatal(err)
	}
	if wire["streamEpoch"] == float64(0) || wire["deliveryCounter"] == float64(0) {
		t.Fatalf("signal must use active delivery stream metadata: %+v", wire)
	}
}
