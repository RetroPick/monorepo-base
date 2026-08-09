package realtime

import (
	"bytes"
	"encoding/json"
	"time"

	"retropick/apps/backend/internal/markets"
)

// DefaultBookMaxAge is the MKT-NFR-002 target for order book snapshot freshness.
const DefaultBookMaxAge = 5 * time.Second

// UIStaleBadgeAfter is the ADR-005 UX threshold for a delayed/stale badge.
const UIStaleBadgeAfter = 10 * time.Second

// GapAction describes how a client should react to a realtime envelope.
type GapAction int

const (
	GapActionApply GapAction = iota
	GapActionEpochReset
	GapActionGapDetected
	GapActionResyncRequired
)

// DeliveryStream tracks per-token delivery metadata for gap recovery (ADR-005).
type DeliveryStream struct {
	TokenID         string
	StreamEpoch     uint64
	DeliveryCounter uint64
	Initialized     bool
}

// Inspect evaluates envelope delivery continuity and updates stream state on success.
func (s *DeliveryStream) Inspect(envelope markets.RealtimeEnvelope) GapAction {
	if envelope.TokenID != "" {
		if s.TokenID != "" && envelope.TokenID != s.TokenID {
			return GapActionApply
		}
		s.TokenID = envelope.TokenID
	}

	switch envelope.Type {
	case TypeHello, TypeSubscribed, TypeUnsubscribed, TypeError:
		return GapActionApply
	case TypeResyncRequired:
		return GapActionResyncRequired
	}

	if !s.Initialized {
		s.StreamEpoch = envelope.StreamEpoch
		s.DeliveryCounter = envelope.DeliveryCounter
		s.Initialized = true
		return GapActionEpochReset
	}

	if envelope.StreamEpoch != s.StreamEpoch {
		s.StreamEpoch = envelope.StreamEpoch
		s.DeliveryCounter = envelope.DeliveryCounter
		return GapActionEpochReset
	}

	if envelope.DeliveryCounter != s.DeliveryCounter+1 {
		return GapActionGapDetected
	}

	s.DeliveryCounter = envelope.DeliveryCounter
	return GapActionApply
}

// WireSequenceNull reports whether marshaled JSON includes "sequence":null (AsyncAPI contract).
func WireSequenceNull(payload []byte) bool {
	var wire map[string]json.RawMessage
	if err := json.Unmarshal(payload, &wire); err != nil {
		return false
	}
	raw, ok := wire["sequence"]
	if !ok {
		return false
	}
	return bytes.Equal(raw, []byte("null"))
}
