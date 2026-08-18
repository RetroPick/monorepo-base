package wshub

import (
	"testing"
	"time"
)

func TestHubBroadcastFiltersByChannel(t *testing.T) {
	hub := NewHub()
	market := hub.Subscribe()
	defer hub.Unsubscribe(market)
	ops := hub.Subscribe()
	defer hub.Unsubscribe(ops)

	market.Subscribe("market:abc")
	ops.Subscribe("ops:global")

	hub.Broadcast([]byte(`{"channel":"market:abc","type":"pool_update"}`))

	select {
	case <-market.C:
	case <-time.After(time.Second):
		t.Fatal("market subscriber did not receive market event")
	}
	select {
	case <-ops.C:
		t.Fatal("ops subscriber received market event")
	default:
	}
}

func TestHubBroadcastDefaultDenyBeforeSubscribe(t *testing.T) {
	hub := NewHub()
	client := hub.Subscribe()
	defer hub.Unsubscribe(client)

	hub.Broadcast([]byte(`{"channel":"user:0xabc","type":"position_update"}`))
	hub.Broadcast([]byte(`{"channel":"deposit:0xabc","type":"deposit_update"}`))

	select {
	case msg := <-client.C:
		t.Fatalf("unsubscribed client received private event: %s", msg)
	default:
	}
}

func TestHubBroadcastDefaultDenyAfterLastUnsubscribe(t *testing.T) {
	hub := NewHub()
	client := hub.Subscribe()
	defer hub.Unsubscribe(client)
	client.Subscribe("market:abc")
	client.Unsubscribe("market:abc")

	hub.Broadcast([]byte(`{"channel":"user:0xabc","type":"position_update"}`))

	select {
	case msg := <-client.C:
		t.Fatalf("client received event after removing its last subscription: %s", msg)
	default:
	}
}
