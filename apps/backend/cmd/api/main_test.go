package main

import (
	"net/http/httptest"
	"testing"
)

func TestNewWSUpgraderBuildsIndependentOriginChecks(t *testing.T) {
	first := newWSUpgrader([]string{"https://first.example"})
	second := newWSUpgrader([]string{"https://second.example"})

	firstReq := httptest.NewRequest("GET", "/ws", nil)
	firstReq.Header.Set("Origin", "https://first.example")
	if !first.CheckOrigin(firstReq) {
		t.Fatal("expected first upgrader to allow its configured origin")
	}
	if second.CheckOrigin(firstReq) {
		t.Fatal("expected second upgrader to reject first upgrader origin")
	}

	secondReq := httptest.NewRequest("GET", "/ws", nil)
	secondReq.Header.Set("Origin", "https://second.example")
	if !second.CheckOrigin(secondReq) {
		t.Fatal("expected second upgrader to allow its configured origin")
	}
	if first.CheckOrigin(secondReq) {
		t.Fatal("expected first upgrader to reject second upgrader origin")
	}
}
