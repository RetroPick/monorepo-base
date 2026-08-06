package realtime_test

import (
	"context"
	"encoding/json"
	"errors"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/gorilla/websocket"
	"retropick/apps/backend/internal/markets/clob"
	marketsconfig "retropick/apps/backend/internal/markets/config"
	"retropick/apps/backend/internal/markets/realtime"
	upstreamws "retropick/apps/backend/internal/markets/upstream/ws"
)

type memRegistry struct {
	tokens map[string]string
}

func (m *memRegistry) MarketForToken(tokenID string) (string, bool) {
	v, ok := m.tokens[tokenID]
	return v, ok
}

func (m *memRegistry) ValidateToken(_ context.Context, marketID, tokenID string) error {
	found, ok := m.MarketForToken(tokenID)
	if !ok || found != marketID {
		return realtime.ErrInvalidCatalogToken
	}
	return nil
}

type failingREST struct{}

func (failingREST) GetOrderBook(_ context.Context, _ string) (clob.OrderBook, error) {
	return clob.OrderBook{}, errors.New("rest disabled in e2e")
}

func startRuntime(t *testing.T, upstream *upstreamws.FakeServer, registry *memRegistry, useREST bool) *realtime.Runtime {
	t.Helper()
	cfg := marketsconfig.Config{
		RealtimeEnabled:    true,
		RealtimeWSURL:      upstream.URL(),
		RealtimeMaxAssets:  10,
		RealtimeMaxPerConn: 10,
		BookMaxAge:         30 * time.Second,
	}
	var rest realtime.RESTSnapshotter = failingREST{}
	if useREST {
		rest = nil
	}
	rt, err := realtime.NewRuntime(realtime.RuntimeConfig{
		Config:            cfg,
		REST:              rest,
		Registry:          registry,
		Validator:         registry,
		ReconcileInterval: 200 * time.Millisecond,
	})
	if err != nil {
		t.Fatal(err)
	}
	rt.SetRegistryReady(true)
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	rt.Start(ctx)
	t.Cleanup(rt.Stop)
	return rt
}

func dialPublicWS(t *testing.T, rt *realtime.Runtime) *websocket.Conn {
	t.Helper()
	r := chi.NewRouter()
	rt.Handler.RegisterRoutes(r)
	srv := httptest.NewServer(r)
	t.Cleanup(srv.Close)
	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + "/api/v1/markets/realtime"
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { conn.Close() })
	return conn
}

func TestUpstreamTransportE2E(t *testing.T) {
	t.Parallel()
	upstream := upstreamws.NewFakeServer()
	defer upstream.Close()
	const (
		marketID = "market-e2e"
		tokenID  = "token-e2e"
		wantHash = "upstream-only-hash-xyz"
	)
	registry := &memRegistry{tokens: map[string]string{tokenID: marketID}}
	rt := startRuntime(t, upstream, registry, false)
	conn := dialPublicWS(t, rt)
	_, _, _ = conn.ReadMessage() // hello
	sub, _ := json.Marshal(map[string]string{"command": "subscribe", "marketId": marketID, "tokenId": tokenID})
	if err := conn.WriteMessage(websocket.TextMessage, sub); err != nil {
		t.Fatal(err)
	}
	deadline := time.Now().Add(8 * time.Second)
	for time.Now().Before(deadline) {
		subs := upstream.SubscribedTokens()
		if len(subs) > 0 {
			break
		}
		time.Sleep(100 * time.Millisecond)
	}
	if len(upstream.SubscribedTokens()) == 0 {
		t.Fatal("upstream never received subscription")
	}
	upstream.PushBook(tokenID, wantHash)
	_ = conn.SetReadDeadline(deadline)
	for {
		_, data, err := conn.ReadMessage()
		if err != nil {
			t.Fatalf("read while waiting for snapshot: %v", err)
		}
		var envelope map[string]any
		if json.Unmarshal(data, &envelope) != nil {
			continue
		}
		if envelope["eventType"] != realtime.TypeOrderBookSnapshot {
			continue
		}
		if envelope["snapshotHash"] == wantHash {
			return
		}
		payload, _ := envelope["payload"].(map[string]any)
		if payload != nil && payload["hash"] == wantHash {
			return
		}
	}
}

func TestRealtimeE2ERejectsWrongToken(t *testing.T) {
	t.Parallel()
	upstream := upstreamws.NewFakeServer()
	defer upstream.Close()
	registry := &memRegistry{tokens: map[string]string{"good-token": "market-1"}}
	rt := startRuntime(t, upstream, registry, false)
	conn := dialPublicWS(t, rt)
	_, _, _ = conn.ReadMessage()
	sub, _ := json.Marshal(map[string]string{"command": "subscribe", "marketId": "market-1", "tokenId": "bad-token"})
	_ = conn.WriteMessage(websocket.TextMessage, sub)
	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		_ = conn.SetReadDeadline(time.Now().Add(time.Second))
		_, data, err := conn.ReadMessage()
		if err != nil {
			t.Fatal(err)
		}
		if strings.Contains(string(data), "invalid_token") {
			return
		}
	}
	t.Fatal("expected invalid_token error")
}

func TestSlowClientE2EDoesNotBlockHealthyClient(t *testing.T) {
	t.Parallel()
	hub := realtime.NewHub(realtime.HubConfig{MaxQueue: 1})
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	hub.Start(ctx)
	slow := realtime.NewClient(hub, "slow")
	fast := realtime.NewClient(hub, "fast")
	if !hub.Register(slow, "1.1.1.1") || !hub.Register(fast, "1.1.1.2") {
		t.Fatal("register failed")
	}
	hub.Subscribe(slow, "m", "t")
	hub.Subscribe(fast, "m", "t")
	payload := []byte(`{"eventType":"orderbook.snapshot","hash":"load-test"}`)
	for i := 0; i < 5; i++ {
		hub.PublishToToken("m", "t", payload)
	}
	msg, ok := <-fast.Send
	if !ok {
		t.Fatal("healthy client channel closed")
	}
	if string(msg) == "" {
		t.Fatal("empty message on healthy client")
	}
	if hub.SlowConsumerCount() == 0 {
		t.Fatal("expected slow consumer removal")
	}
}

func TestCapabilitiesRealtimeStableWhileConnecting(t *testing.T) {
	t.Parallel()
	status := realtime.NewStatusProvider(true)
	status.SetRegistryReady(true)
	status.SetHubRunning(true)
	status.SetDemandedTokens(1)
	status.SetConnectedShards(0)
	if !status.CapabilitiesRealtime() {
		t.Fatal("realtime capability should remain available while connecting")
	}
	if status.HealthCheck() != "degraded" {
		t.Fatalf("health %s", status.HealthCheck())
	}
}
