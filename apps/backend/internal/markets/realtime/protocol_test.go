package realtime_test

import (
	"testing"
	"time"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/realtime"
)

func TestDeliveryStreamGapOnCounterSkip(t *testing.T) {
	t.Parallel()

	stream := &realtime.DeliveryStream{}
	first := markets.RealtimeEnvelope{
		Type:            realtime.TypeOrderBookSnapshot,
		TokenID:         "token-1",
		StreamEpoch:     1,
		DeliveryCounter: 1,
	}
	if action := stream.Inspect(first); action != realtime.GapActionEpochReset {
		t.Fatalf("first action %v", action)
	}
	skip := markets.RealtimeEnvelope{
		Type:            realtime.TypeOrderBookSnapshot,
		TokenID:         "token-1",
		StreamEpoch:     1,
		DeliveryCounter: 3,
	}
	if action := stream.Inspect(skip); action != realtime.GapActionGapDetected {
		t.Fatalf("skip action %v", action)
	}
}

func TestDeliveryStreamEpochReset(t *testing.T) {
	t.Parallel()

	stream := &realtime.DeliveryStream{}
	_ = stream.Inspect(markets.RealtimeEnvelope{
		Type:            realtime.TypeOrderBookSnapshot,
		TokenID:         "token-1",
		StreamEpoch:     1,
		DeliveryCounter: 1,
	})
	action := stream.Inspect(markets.RealtimeEnvelope{
		Type:            realtime.TypeOrderBookSnapshot,
		TokenID:         "token-1",
		StreamEpoch:     2,
		DeliveryCounter: 1,
	})
	if action != realtime.GapActionEpochReset {
		t.Fatalf("action %v", action)
	}
	if stream.StreamEpoch != 2 || stream.DeliveryCounter != 1 {
		t.Fatalf("state %+v", stream)
	}
}

func TestDeliveryStreamResyncRequired(t *testing.T) {
	t.Parallel()

	stream := &realtime.DeliveryStream{}
	action := stream.Inspect(markets.RealtimeEnvelope{
		Type:    realtime.TypeResyncRequired,
		TokenID: "token-1",
	})
	if action != realtime.GapActionResyncRequired {
		t.Fatalf("action %v", action)
	}
}

func TestDeliveryStreamContiguousApply(t *testing.T) {
	t.Parallel()

	stream := &realtime.DeliveryStream{}
	for counter := uint64(1); counter <= 3; counter++ {
		action := stream.Inspect(markets.RealtimeEnvelope{
			Type:            realtime.TypeTradeExecuted,
			TokenID:         "token-1",
			StreamEpoch:     1,
			DeliveryCounter: counter,
		})
		if counter == 1 {
			if action != realtime.GapActionEpochReset {
				t.Fatalf("counter %d action %v", counter, action)
			}
			continue
		}
		if action != realtime.GapActionApply {
			t.Fatalf("counter %d action %v", counter, action)
		}
	}
}

func TestDefaultBookMaxAgeMatchesNFR(t *testing.T) {
	t.Parallel()
	if realtime.DefaultBookMaxAge != 5*time.Second {
		t.Fatalf("DefaultBookMaxAge %v", realtime.DefaultBookMaxAge)
	}
}
