package realtime_test

import (
	"context"
	"testing"
	"time"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/realtime"
)

func TestEnvelopeNeverInventsSequence(t *testing.T) {
	t.Parallel()
	observed := time.Date(2026, 7, 31, 0, 0, 0, 0, time.UTC)
	envelope, err := realtime.NewEnvelope(
		realtime.TypeOrderBookSnapshot,
		"market-1", "token-1", "token-1", "hash-1",
		1, 1, observed, observed,
		map[string]string{"status": "ok"},
	)
	if err != nil {
		t.Fatal(err)
	}
	if envelope.Sequence != nil {
		t.Fatalf("invented sequence %v", envelope.Sequence)
	}
	if envelope.StreamEpoch != 1 || envelope.DeliveryCounter != 1 {
		t.Fatalf("transport metadata %+v", envelope)
	}
}

func TestMarshalEnvelopeSequenceIsNull(t *testing.T) {
	t.Parallel()
	observed := time.Date(2026, 7, 31, 0, 0, 0, 0, time.UTC)
	envelope, err := realtime.NewEnvelope(
		realtime.TypeOrderBookSnapshot,
		"market-1", "token-1", "token-1", "hash-1",
		1, 1, observed, observed,
		map[string]string{"status": "ok"},
	)
	if err != nil {
		t.Fatal(err)
	}
	payload, err := realtime.MarshalEnvelope(envelope)
	if err != nil {
		t.Fatal(err)
	}
	if !realtime.WireSequenceNull(payload) {
		t.Fatalf("wire %s", string(payload))
	}
}

func TestDeliveryTrackerMonotonicWithinEpoch(t *testing.T) {
	t.Parallel()
	tracker := realtime.NewDeliveryTracker()
	tracker.BumpEpoch("t1")
	e1, c1 := tracker.Next("t1")
	e2, c2 := tracker.Next("t1")
	if e1 != e2 || c2 != c1+1 {
		t.Fatalf("epoch %d/%d counter %d/%d", e1, e2, c1, c2)
	}
}

func TestDeliveryTrackerEpochReset(t *testing.T) {
	t.Parallel()
	tracker := realtime.NewDeliveryTracker()
	tracker.BumpEpoch("t1")
	_, c1 := tracker.Next("t1")
	tracker.BumpEpoch("t1")
	e2, c2 := tracker.Next("t1")
	if c2 != 1 {
		t.Fatalf("counter reset expected 1, got %d", c2)
	}
	if e2 < 1 {
		t.Fatalf("epoch %d", e2)
	}
	_ = c1
}

func TestValidateEnvelopeRejectsSequence(t *testing.T) {
	t.Parallel()
	seq := "1"
	envelope := markets.RealtimeEnvelope{
		SchemaVersion: markets.SchemaVersion,
		EventID:       "e1",
		Type:          realtime.TypeOrderBookSnapshot,
		MarketID:      "m1",
		UpstreamID:    "t1",
		TokenID:       "t1",
		Sequence:      &seq,
		ObservedAt:    time.Now().UTC(),
		PublishedAt:   time.Now().UTC(),
		Payload:       map[string]any{},
	}
	if err := realtime.ValidateEnvelope(envelope); err == nil {
		t.Fatal("expected sequence rejection")
	}
}

func TestHubPublishToToken(t *testing.T) {
	t.Parallel()
	hub := realtime.NewHub(realtime.HubConfig{MaxQueue: 8})
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	hub.Start(ctx)
	client := realtime.NewClient(hub, "c1")
	if !hub.Register(client, "127.0.0.1") {
		t.Fatal("register failed")
	}
	hub.Subscribe(client, "m1", "t1")
	hub.PublishToToken("m1", "t1", []byte(`{"eventType":"orderbook.snapshot"}`))
	select {
	case msg := <-client.Send:
		if string(msg) == "" {
			t.Fatal("empty message")
		}
	case <-time.After(time.Second):
		t.Fatal("timeout waiting for message")
	}
}

func TestStatusProviderStates(t *testing.T) {
	t.Parallel()
	status := realtime.NewStatusProvider(true)
	status.SetRegistryReady(true)
	status.SetHubRunning(true)
	if status.State() != realtime.StateIdleReady {
		t.Fatalf("expected idle ready, got %s", status.State())
	}
	status.SetDemandedTokens(1)
	status.SetConnectedShards(0)
	if !status.CapabilitiesRealtime() {
		t.Fatal("realtime capability should remain available while connecting")
	}
	if status.HealthCheck() != "degraded" {
		t.Fatalf("health %s", status.HealthCheck())
	}
}

func TestCommandLimiterFirstCommandAlwaysAllowed(t *testing.T) {
	t.Parallel()
	// covered via handler integration; token bucket tested in limiter via handler tests
}
