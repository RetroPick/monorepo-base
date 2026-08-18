package realtime

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"retropick/apps/backend/internal/markets/postgres"
)

type spyPlanner struct {
	subs []string
}

func (p *spyPlanner) Subscribe(tokenID, marketID string) {
	p.subs = append(p.subs, tokenID)
}

func (p *spyPlanner) Unsubscribe(tokenID string) {}

type stubValidator struct {
	err error
}

func (v stubValidator) ValidateToken(_ context.Context, _, _ string) error {
	return v.err
}

func newHandlerTestClient(t *testing.T, hub *Hub) *Client {
	t.Helper()
	client := NewClient(hub, "test-client")
	if !hub.Register(client, "127.0.0.1") {
		t.Fatal("register client")
	}
	return client
}

func clientSubscriptionCount(client *Client) int {
	client.mu.RLock()
	defer client.mu.RUnlock()
	return len(client.subs)
}

func TestHandleSubscribeNilValidatorFailClosed(t *testing.T) {
	hub := NewHub(HubConfig{MaxQueue: 8, MaxConnections: 10, MaxPerIP: 10})
	planner := &spyPlanner{}
	onSubscribeCalls := 0
	h := NewHandler(HandlerConfig{
		Hub:       hub,
		Planner:   planner,
		Validator: nil,
		OnSubscribe: func(_, _ string) {
			onSubscribeCalls++
		},
	})
	client := newHandlerTestClient(t, hub)
	h.handleSubscribe(context.Background(), client, clientCommand{
		Command: "subscribe", MarketID: "market-a", TokenID: "token-a",
	})
	if len(planner.subs) != 0 {
		t.Fatalf("planner subscribed with nil validator: %v", planner.subs)
	}
	if onSubscribeCalls != 0 {
		t.Fatal("OnSubscribe called with nil validator")
	}
	if got := clientSubscriptionCount(client); got != 0 {
		t.Fatalf("hub subscribed with nil validator: count=%d", got)
	}
}

func TestHandleSubscribeValidatorErrorFailClosed(t *testing.T) {
	hub := NewHub(HubConfig{MaxQueue: 8, MaxConnections: 10, MaxPerIP: 10})
	planner := &spyPlanner{}
	onSubscribeCalls := 0
	h := NewHandler(HandlerConfig{
		Hub:       hub,
		Planner:   planner,
		Validator: stubValidator{err: errors.New("invalid token")},
		OnSubscribe: func(_, _ string) {
			onSubscribeCalls++
		},
	})
	client := newHandlerTestClient(t, hub)
	h.handleSubscribe(context.Background(), client, clientCommand{
		Command: "subscribe", MarketID: "market-a", TokenID: "token-a",
	})
	if len(planner.subs) != 0 {
		t.Fatalf("planner subscribed after validation error: %v", planner.subs)
	}
	if onSubscribeCalls != 0 {
		t.Fatal("OnSubscribe called after validation error")
	}
	if got := clientSubscriptionCount(client); got != 0 {
		t.Fatalf("hub subscribed after validation error: count=%d", got)
	}
}

func TestHandleSubscribeUnknownTokenRejectedBeforePlanner(t *testing.T) {
	hub := NewHub(HubConfig{MaxQueue: 8, MaxConnections: 10, MaxPerIP: 10})
	planner := &spyPlanner{}
	h := NewHandler(HandlerConfig{
		Hub:     hub,
		Planner: planner,
		Validator: CatalogTokenValidator{
			Lookup: func(_ context.Context, tokenID string) (string, bool, error) {
				if tokenID == "token-known" {
					return "market-a", true, nil
				}
				return "", false, nil
			},
		},
	})
	client := newHandlerTestClient(t, hub)
	h.handleSubscribe(context.Background(), client, clientCommand{
		Command: "subscribe", MarketID: "market-a", TokenID: "token-unknown",
	})
	if len(planner.subs) != 0 {
		t.Fatalf("planner subscribed unknown token: %v", planner.subs)
	}
}

func TestHandleSubscribeWrongMarketRejectedBeforePlanner(t *testing.T) {
	hub := NewHub(HubConfig{MaxQueue: 8, MaxConnections: 10, MaxPerIP: 10})
	planner := &spyPlanner{}
	h := NewHandler(HandlerConfig{
		Hub:     hub,
		Planner: planner,
		Validator: CatalogTokenValidator{
			Lookup: func(_ context.Context, _ string) (string, bool, error) {
				return "market-correct", true, nil
			},
		},
	})
	client := newHandlerTestClient(t, hub)
	h.handleSubscribe(context.Background(), client, clientCommand{
		Command: "subscribe", MarketID: "market-wrong", TokenID: "token-a",
	})
	if len(planner.subs) != 0 {
		t.Fatalf("planner subscribed wrong market: %v", planner.subs)
	}
}

func TestHandleSubscribeKnownTokenReachesPlanner(t *testing.T) {
	hub := NewHub(HubConfig{MaxQueue: 8, MaxConnections: 10, MaxPerIP: 10})
	planner := &spyPlanner{}
	h := NewHandler(HandlerConfig{
		Hub:     hub,
		Planner: planner,
		Validator: CatalogTokenValidator{
			Lookup: func(_ context.Context, _ string) (string, bool, error) {
				return "market-a", true, nil
			},
		},
	})
	client := newHandlerTestClient(t, hub)
	h.handleSubscribe(context.Background(), client, clientCommand{
		Command: "subscribe", MarketID: "market-a", TokenID: "token-a",
	})
	if len(planner.subs) != 1 || planner.subs[0] != "token-a" {
		t.Fatalf("planner not subscribed: %v", planner.subs)
	}
}

func TestCatalogTokenValidatorNilLookupFailClosed(t *testing.T) {
	v := CatalogTokenValidator{Lookup: nil}
	if err := v.ValidateToken(context.Background(), "m", "t"); err == nil {
		t.Fatal("nil lookup must reject")
	}
}
func drainSubscribeErrorCode(t *testing.T, client *Client) string {
	t.Helper()
	select {
	case msg := <-client.Send:
		var envelope struct {
			Payload struct {
				Code string `json:"code"`
			} `json:"payload"`
		}
		if err := json.Unmarshal(msg, &envelope); err != nil {
			t.Fatalf("unmarshal error envelope: %v", err)
		}
		return envelope.Payload.Code
	default:
		t.Fatal("expected error envelope on client channel")
		return ""
	}
}

func TestHandleSubscribeNilValidatorUsesValidationUnavailableCode(t *testing.T) {
	hub := NewHub(HubConfig{MaxQueue: 8, MaxConnections: 10, MaxPerIP: 10})
	h := NewHandler(HandlerConfig{Hub: hub, Planner: &spyPlanner{}, Validator: nil})
	client := newHandlerTestClient(t, hub)
	h.handleSubscribe(context.Background(), client, clientCommand{
		Command: "subscribe", MarketID: "market-a", TokenID: "token-a",
	})
	if code := drainSubscribeErrorCode(t, client); code != "validation_unavailable" {
		 t.Fatalf("code=%q want validation_unavailable", code)
	}
}

func TestHandleSubscribeRegistryNotReadyUsesValidationUnavailableCode(t *testing.T) {
	hub := NewHub(HubConfig{MaxQueue: 8, MaxConnections: 10, MaxPerIP: 10})
	h := NewHandler(HandlerConfig{
		Hub:     hub,
		Planner: &spyPlanner{},
		Validator: stubValidator{err: postgres.ErrRegistryNotReady},
	})
	client := newHandlerTestClient(t, hub)
	h.handleSubscribe(context.Background(), client, clientCommand{
		Command: "subscribe", MarketID: "market-a", TokenID: "token-a",
	})
	if code := drainSubscribeErrorCode(t, client); code != "validation_unavailable" {
		 t.Fatalf("code=%q want validation_unavailable", code)
	}
}

func TestHandleSubscribeUnknownTokenUsesInvalidTokenCode(t *testing.T) {
	hub := NewHub(HubConfig{MaxQueue: 8, MaxConnections: 10, MaxPerIP: 10})
	h := NewHandler(HandlerConfig{
		Hub:     hub,
		Planner: &spyPlanner{},
		Validator: stubValidator{err: ErrInvalidCatalogToken},
	})
	client := newHandlerTestClient(t, hub)
	h.handleSubscribe(context.Background(), client, clientCommand{
		Command: "subscribe", MarketID: "market-a", TokenID: "token-unknown",
	})
	if code := drainSubscribeErrorCode(t, client); code != "invalid_token" {
		 t.Fatalf("code=%q want invalid_token", code)
	}
}


func TestHandleSubscribeCatalogTokenNotInCatalogUsesInvalidTokenCode(t *testing.T) {
	hub := NewHub(HubConfig{MaxQueue: 8, MaxConnections: 10, MaxPerIP: 10})
	h := NewHandler(HandlerConfig{
		Hub:     hub,
		Planner: &spyPlanner{},
		Validator: stubValidator{err: postgres.ErrTokenNotInCatalog},
	})
	client := newHandlerTestClient(t, hub)
	h.handleSubscribe(context.Background(), client, clientCommand{
		Command: "subscribe", MarketID: "market-a", TokenID: "token-unknown",
	})
	if code := drainSubscribeErrorCode(t, client); code != "invalid_token" {
		t.Fatalf("code=%q want invalid_token", code)
	}
}
