package realtime_test

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/gorilla/websocket"
	marketsconfig "retropick/apps/backend/internal/markets/config"
	"retropick/apps/backend/internal/markets/clob"
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
		return fmt.Errorf("token not in catalog")
	}
	return nil
}

type fakeREST struct{}

func (fakeREST) GetOrderBook(_ context.Context, tokenID string) (clob.OrderBook, error) {
	return clob.OrderBook{
		ConditionID:  "0xcondition",
		TokenID:      tokenID,
		Timestamp:    time.Now().UTC(),
		Hash:         "rest-hash-" + tokenID,
		Bids:         []clob.Level{{Price: "0.4", Size: "100"}},
		Asks:         []clob.Level{{Price: "0.6", Size: "200"}},
		MinOrderSize: "1",
		TickSize:     "0.01",
	}, nil
}

func TestRealtimeE2EFakeUpstreamSnapshot(t *testing.T) {
	t.Parallel()
	upstream := upstreamws.NewFakeServer()
	defer upstream.Close()

	registry := &memRegistry{tokens: map[string]string{"token-e2e": "market-e2e"}}
	cfg := marketsconfig.Config{
		RealtimeEnabled:    true,
		RealtimeWSURL:      upstream.URL(),
		RealtimeMaxAssets:  10,
		RealtimeMaxPerConn: 10,
		BookMaxAge:         30 * time.Second,
	}
	rt, err := realtime.NewRuntime(realtime.RuntimeConfig{
		Config:    cfg,
		REST:      fakeREST{},
		Registry:  registry,
		Validator: registry,
	})
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	rt.Start(ctx)
	defer rt.Stop()

	r := chi.NewRouter()
	rt.Handler.RegisterRoutes(r)
	srv := httptest.NewServer(r)
	defer srv.Close()

	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + "/api/v1/markets/realtime"
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()

	sub, _ := json.Marshal(map[string]string{
		"command":  "subscribe",
		"marketId": "market-e2e",
		"tokenId":  "token-e2e",
	})
	if err := conn.WriteMessage(websocket.TextMessage, sub); err != nil {
		t.Fatal(err)
	}

	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		_ = conn.SetReadDeadline(time.Now().Add(time.Second))
		_, data, err := conn.ReadMessage()
		if err != nil {
			break
		}
		var envelope map[string]any
		if err := json.Unmarshal(data, &envelope); err != nil {
			continue
		}
		eventType, _ := envelope["eventType"].(string)
		if eventType == realtime.TypeOrderBookSnapshot {
			return
		}
	}
	t.Fatal("timeout waiting for orderbook.snapshot")
}

func TestRealtimeE2ERejectsWrongToken(t *testing.T) {
	t.Parallel()
	upstream := upstreamws.NewFakeServer()
	defer upstream.Close()
	registry := &memRegistry{tokens: map[string]string{"good-token": "market-1"}}
	cfg := marketsconfig.Config{
		RealtimeWSURL:      upstream.URL(),
		RealtimeMaxAssets:  10,
		RealtimeMaxPerConn: 10,
	}
	rt, err := realtime.NewRuntime(realtime.RuntimeConfig{
		Config:    cfg,
		REST:      fakeREST{},
		Registry:  registry,
		Validator: registry,
	})
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	rt.Start(ctx)
	defer rt.Stop()

	r := chi.NewRouter()
	rt.Handler.RegisterRoutes(r)
	srv := httptest.NewServer(r)
	defer srv.Close()

	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + "/api/v1/markets/realtime"
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	_ = conn.SetReadDeadline(time.Now().Add(2 * time.Second))
	if _, _, err := conn.ReadMessage(); err != nil {
		t.Fatal(err)
	}
	sub, _ := json.Marshal(map[string]string{
		"command":  "subscribe",
		"marketId": "market-1",
		"tokenId":  "bad-token",
	})
	if err := conn.WriteMessage(websocket.TextMessage, sub); err != nil {
		t.Fatal(err)
	}
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

func TestRealtimeHubSlowClientDoesNotBlockHealthyClient(t *testing.T) {
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
	for i := 0; i < 10; i++ {
		payload := []byte(fmt.Sprintf(`{"eventType":"orderbook.snapshot","n":%d}`, i))
		hub.PublishToToken("m", "t", payload)
	}
	select {
	case <-fast.Send:
	case <-time.After(2 * time.Second):
		t.Fatal("healthy client blocked")
	}
}
