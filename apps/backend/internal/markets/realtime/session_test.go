package realtime

import (
	"errors"
	"testing"
	"time"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/marketdata"
)

func TestSnapshotEnvelopeNeverInventsSequence(t *testing.T) {
	t.Parallel()

	published := time.Date(2026, 7, 30, 7, 0, 0, 0, time.UTC)
	session, err := NewSession(snapshotFixture(), func() time.Time { return published })
	if err != nil {
		t.Fatal(err)
	}
	envelope, err := session.SnapshotEnvelope()
	if err != nil {
		t.Fatal(err)
	}
	if envelope.SchemaVersion != markets.SchemaVersion || envelope.Type != TypeOrderBookSnapshot {
		t.Fatalf("envelope %+v", envelope)
	}
	if envelope.Sequence != nil {
		t.Fatalf("invented sequence %q", *envelope.Sequence)
	}
	if envelope.SnapshotHash != "hash-1" || envelope.Source != "polymarket" {
		t.Fatalf("envelope %+v", envelope)
	}
}

func TestDeltaHashGapRequiresResnapshot(t *testing.T) {
	t.Parallel()

	session, err := NewSession(snapshotFixture(), time.Now)
	if err != nil {
		t.Fatal(err)
	}
	_, err = session.ApplyDelta(marketdata.Delta{
		BaseHash:  "wrong",
		NextHash:  "hash-2",
		Timestamp: time.Date(2026, 7, 30, 7, 0, 1, 0, time.UTC),
		Side:      marketdata.SideBid,
		Price:     decimal(t, "0.4"),
		Size:      decimal(t, "1"),
	})
	if !errors.Is(err, ErrResnapshotRequired) {
		t.Fatalf("error %v", err)
	}
	if !session.NeedsResnapshot() || session.Snapshot().Freshness.State != markets.FreshnessResyncing {
		t.Fatalf("snapshot %+v", session.Snapshot())
	}
}

func TestDeltaEnvelopeAdvancesHashWithoutSequence(t *testing.T) {
	t.Parallel()

	published := time.Date(2026, 7, 30, 7, 0, 2, 0, time.UTC)
	session, err := NewSession(snapshotFixture(), func() time.Time { return published })
	if err != nil {
		t.Fatal(err)
	}
	envelope, err := session.ApplyDelta(marketdata.Delta{
		BaseHash:  "hash-1",
		NextHash:  "hash-2",
		Timestamp: time.Date(2026, 7, 30, 7, 0, 1, 0, time.UTC),
		Side:      marketdata.SideBid,
		Price:     decimal(t, "0.4"),
		Size:      decimal(t, "0"),
	})
	if err != nil {
		t.Fatal(err)
	}
	if envelope.Type != TypeOrderBookDelta || envelope.SnapshotHash != "hash-2" || envelope.Sequence != nil {
		t.Fatalf("envelope %+v", envelope)
	}
	if session.NeedsResnapshot() {
		t.Fatal("valid delta marked session for resnapshot")
	}
}

func TestDisconnectMarksSessionResyncing(t *testing.T) {
	t.Parallel()

	session, err := NewSession(snapshotFixture(), time.Now)
	if err != nil {
		t.Fatal(err)
	}
	session.Disconnected(time.Date(2026, 7, 30, 7, 1, 0, 0, time.UTC))
	if !session.NeedsResnapshot() || session.Snapshot().Freshness.Reason != "realtime_disconnected" {
		t.Fatalf("snapshot %+v", session.Snapshot())
	}
}

func TestValidateEnvelopeRejectsUnknownVersionAndType(t *testing.T) {
	t.Parallel()

	envelope := markets.RealtimeEnvelope{
		SchemaVersion: "2",
		EventID:       "event-1",
		Type:          TypeOrderBookSnapshot,
		Source:        "polymarket",
		MarketID:      "market-1",
		UpstreamID:    "token-yes",
		ObservedAt:    time.Now().UTC(),
		PublishedAt:   time.Now().UTC(),
		Payload:       map[string]any{},
	}
	if !errors.Is(ValidateEnvelope(envelope), ErrUnsupportedSchema) {
		t.Fatal("unknown schema accepted")
	}
	envelope.SchemaVersion = markets.SchemaVersion
	envelope.Type = "orderbook.magic"
	if !errors.Is(ValidateEnvelope(envelope), ErrUnsupportedType) {
		t.Fatal("unknown type accepted")
	}
}

func TestEnvelopeIDIsDeterministicForSameEvidence(t *testing.T) {
	t.Parallel()

	observed := time.Date(2026, 7, 30, 7, 0, 0, 0, time.UTC)
	first, err := NewEnvelope(TypeMarketUpdated, "market-1", "upstream-1", "", observed, observed, map[string]any{"status": "closed"})
	if err != nil {
		t.Fatal(err)
	}
	second, err := NewEnvelope(TypeMarketUpdated, "market-1", "upstream-1", "", observed, observed.Add(time.Minute), map[string]any{"status": "closed"})
	if err != nil {
		t.Fatal(err)
	}
	if first.EventID != second.EventID {
		t.Fatalf("event IDs differ %s %s", first.EventID, second.EventID)
	}
}

func snapshotFixture() markets.OrderBookSnapshot {
	observed := time.Date(2026, 7, 30, 7, 0, 0, 0, time.UTC)
	return markets.OrderBookSnapshot{
		SchemaVersion: markets.SchemaVersion,
		MarketID:      "market-1",
		ConditionID:   "0xabc",
		TokenID:       "token-yes",
		Hash:          "hash-1",
		Timestamp:     observed,
		Bids: []markets.OrderBookLevel{{
			Price: markets.DecimalString("0.4"),
			Size:  markets.DecimalString("2"),
		}},
		Asks: []markets.OrderBookLevel{{
			Price: markets.DecimalString("0.6"),
			Size:  markets.DecimalString("3"),
		}},
		Freshness:  markets.MarketFreshness{State: markets.FreshnessFresh, ObservedAt: observed},
		Provenance: markets.UpstreamProvenance{Source: "polymarket_clob", UpstreamID: "token-yes", ObservedAt: observed},
	}
}

func decimal(t *testing.T, raw string) markets.DecimalString {
	t.Helper()
	value, err := markets.ParseDecimalString(raw)
	if err != nil {
		t.Fatal(err)
	}
	return value
}
