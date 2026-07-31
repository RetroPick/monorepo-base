package realtime

import (
	"encoding/json"
	"time"

	"retropick/apps/backend/internal/markets"
)

// ControlEnvelope is the canonical wire shape for hello/subscribed/unsubscribed/error.
type ControlEnvelope struct {
	SchemaVersion string `json:"schemaVersion"`
	EventType     string `json:"eventType"`
	MarketID      string `json:"marketId,omitempty"`
	TokenID       string `json:"tokenId,omitempty"`
	Sequence      *string `json:"sequence"`
	Payload       any    `json:"payload"`
}

func NewControlMessage(eventType, marketID, tokenID string, payload any) ([]byte, error) {
	env := ControlEnvelope{
		SchemaVersion: markets.SchemaVersion,
		EventType:     eventType,
		MarketID:      marketID,
		TokenID:       tokenID,
		Sequence:      nil,
		Payload:       payload,
	}
	return json.Marshal(env)
}

// DataEnvelope is the canonical wire shape for book/trade/signal/resync events.
type DataEnvelope struct {
	SchemaVersion   string    `json:"schemaVersion"`
	EventID         string    `json:"eventId"`
	EventType       string    `json:"eventType"`
	Source          string    `json:"source"`
	MarketID        string    `json:"marketId"`
	UpstreamID      string    `json:"upstreamId"`
	TokenID         string    `json:"tokenId"`
	Sequence        *string   `json:"sequence"`
	SnapshotHash    string    `json:"snapshotHash,omitempty"`
	StreamEpoch     uint64    `json:"streamEpoch"`
	DeliveryCounter uint64    `json:"deliveryCounter"`
	ObservedAt      time.Time `json:"observedAt"`
	PublishedAt     time.Time `json:"publishedAt"`
	Payload         any       `json:"payload"`
}

func DataFromRealtime(envelope markets.RealtimeEnvelope) DataEnvelope {
	return DataEnvelope{
		SchemaVersion:   envelope.SchemaVersion,
		EventID:         envelope.EventID,
		EventType:       envelope.Type,
		Source:          envelope.Source,
		MarketID:        envelope.MarketID,
		UpstreamID:      envelope.UpstreamID,
		TokenID:         envelope.TokenID,
		Sequence:        nil,
		SnapshotHash:    envelope.SnapshotHash,
		StreamEpoch:     envelope.StreamEpoch,
		DeliveryCounter: envelope.DeliveryCounter,
		ObservedAt:      envelope.ObservedAt,
		PublishedAt:     envelope.PublishedAt,
		Payload:         envelope.Payload,
	}
}

func MarshalDataEnvelope(envelope markets.RealtimeEnvelope) ([]byte, error) {
	return json.Marshal(DataFromRealtime(envelope))
}
