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

func TestNewWSUpgraderAllowsLocalhostOriginsWhenUnset(t *testing.T) {
	upgrader := newWSUpgrader(nil)

	req := httptest.NewRequest("GET", "/ws", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	if !upgrader.CheckOrigin(req) {
		t.Fatal("expected localhost origin to be allowed when WS_ALLOWED_ORIGINS is unset")
	}

	req = httptest.NewRequest("GET", "/ws", nil)
	req.Header.Set("Origin", "http://127.0.0.1:3000")
	if !upgrader.CheckOrigin(req) {
		t.Fatal("expected loopback origin to be allowed when WS_ALLOWED_ORIGINS is unset")
	}

	req = httptest.NewRequest("GET", "/ws", nil)
	req.Header.Set("Origin", "https://example.com")
	if upgrader.CheckOrigin(req) {
		t.Fatal("expected non-localhost origin to be rejected when WS_ALLOWED_ORIGINS is unset")
	}
}
