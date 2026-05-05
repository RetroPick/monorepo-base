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
