package realtime

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/marketdata"
)

const (
	TypeOrderBookSnapshot = "orderbook.snapshot"
	TypeOrderBookDelta    = "orderbook.delta"
	TypeMarketUpdated     = "market.updated"
	TypeSignalCreated     = "signal.created"
	TypeSignalRetracted   = "signal.retracted"
)

var (
	ErrResnapshotRequired = errors.New("authoritative resnapshot required")
	ErrUnsupportedSchema  = errors.New("unsupported realtime schema")
	ErrUnsupportedType    = errors.New("unsupported realtime type")
	ErrInvalidEnvelope    = errors.New("invalid realtime envelope")
)

type Session struct {
	state marketdata.State
	now   func() time.Time
}

func NewSession(snapshot markets.OrderBookSnapshot, now func() time.Time) (*Session, error) {
	if snapshot.SchemaVersion != markets.SchemaVersion || snapshot.MarketID == "" ||
		snapshot.TokenID == "" || snapshot.Hash == "" || snapshot.Timestamp.IsZero() {
		return nil, fmt.Errorf("%w: incomplete snapshot", ErrInvalidEnvelope)
	}
	if now == nil {
		now = time.Now
	}
	return &Session{
		state: marketdata.State{Snapshot: snapshot},
		now:   now,
	}, nil
}

func (s *Session) SnapshotEnvelope() (markets.RealtimeEnvelope, error) {
	snapshot := s.state.Snapshot
	return NewEnvelope(
		TypeOrderBookSnapshot,
		snapshot.MarketID,
		snapshot.TokenID,
		snapshot.Hash,
		snapshot.Timestamp,
		s.now().UTC(),
		snapshot,
	)
}

func (s *Session) ApplyDelta(delta marketdata.Delta) (markets.RealtimeEnvelope, error) {
	if err := s.state.ApplyDelta(delta); err != nil {
		return markets.RealtimeEnvelope{}, fmt.Errorf("%w: %v", ErrResnapshotRequired, err)
	}
	return NewEnvelope(
		TypeOrderBookDelta,
		s.state.Snapshot.MarketID,
		s.state.Snapshot.TokenID,
		s.state.Snapshot.Hash,
		delta.Timestamp,
		s.now().UTC(),
		delta,
	)
}

func (s *Session) Disconnected(observedAt time.Time) {
	s.state.MarkDisconnected(observedAt)
}

func (s *Session) NeedsResnapshot() bool {
	switch s.state.Snapshot.Freshness.State {
	case markets.FreshnessResyncing, markets.FreshnessInvalid, markets.FreshnessStale, markets.FreshnessUnavailable:
		return true
	case markets.FreshnessFresh:
		return false
	default:
		return true
	}
}

func (s *Session) Snapshot() markets.OrderBookSnapshot {
	return s.state.Snapshot
}

func NewEnvelope(
	eventType,
	marketID,
	upstreamID,
	snapshotHash string,
	observedAt,
	publishedAt time.Time,
	payload any,
) (markets.RealtimeEnvelope, error) {
	if !validType(eventType) {
		return markets.RealtimeEnvelope{}, ErrUnsupportedType
	}
	if strings.TrimSpace(marketID) == "" || strings.TrimSpace(upstreamID) == "" ||
		observedAt.IsZero() || publishedAt.IsZero() || payload == nil {
		return markets.RealtimeEnvelope{}, ErrInvalidEnvelope
	}
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return markets.RealtimeEnvelope{}, fmt.Errorf("%w: payload", ErrInvalidEnvelope)
	}
	evidence := strings.Join([]string{
		eventType,
		marketID,
		upstreamID,
		snapshotHash,
		observedAt.UTC().Format(time.RFC3339Nano),
		string(payloadJSON),
	}, "\x00")
	sum := sha256.Sum256([]byte(evidence))
	return markets.RealtimeEnvelope{
		SchemaVersion: markets.SchemaVersion,
		EventID:       hex.EncodeToString(sum[:]),
		Type:          eventType,
		Source:        "polymarket",
		MarketID:      marketID,
		UpstreamID:    upstreamID,
		Sequence:      nil,
		SnapshotHash:  snapshotHash,
		ObservedAt:    observedAt.UTC(),
		PublishedAt:   publishedAt.UTC(),
		Payload:       payload,
	}, nil
}

func ValidateEnvelope(envelope markets.RealtimeEnvelope) error {
	if envelope.SchemaVersion != markets.SchemaVersion {
		return ErrUnsupportedSchema
	}
	if !validType(envelope.Type) {
		return ErrUnsupportedType
	}
	if envelope.EventID == "" || envelope.Source != "polymarket" || envelope.MarketID == "" ||
		envelope.UpstreamID == "" || envelope.ObservedAt.IsZero() || envelope.PublishedAt.IsZero() ||
		envelope.Payload == nil {
		return ErrInvalidEnvelope
	}
	if envelope.Sequence != nil {
		return fmt.Errorf("%w: undocumented sequence", ErrInvalidEnvelope)
	}
	return nil
}

func validType(eventType string) bool {
	switch eventType {
	case TypeOrderBookSnapshot, TypeOrderBookDelta, TypeMarketUpdated, TypeSignalCreated, TypeSignalRetracted:
		return true
	default:
		return false
	}
}
