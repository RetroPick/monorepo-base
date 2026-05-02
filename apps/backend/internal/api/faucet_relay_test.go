package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"retropick/apps/backend/internal/config"
	"retropick/apps/backend/internal/registry"
)

func TestUserFaucetRelayHandler_notEnabled(t *testing.T) {
	reg := &registry.Registry{ChainID: 84532}
	h := UserFaucetRelayHandler(&config.Config{FaucetRelayEnabled: false}, nil, reg)
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{}`))
	rr := httptest.NewRecorder()
	h(rr, req)
	if rr.Code != http.StatusNotImplemented {
		t.Fatalf("status %d body %s", rr.Code, rr.Body.String())
	}
}

func TestUserFaucetRelayHandler_wrongChain(t *testing.T) {
	reg := &registry.Registry{ChainID: 1}
	h := UserFaucetRelayHandler(&config.Config{FaucetRelayEnabled: true}, nil, reg)
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{}`))
	rr := httptest.NewRecorder()
	h(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status %d", rr.Code)
	}
}

func TestUserFaucetRelayHandler_methodNotAllowed(t *testing.T) {
	reg := &registry.Registry{ChainID: 84532}
	h := UserFaucetRelayHandler(&config.Config{FaucetRelayEnabled: true}, nil, reg)
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rr := httptest.NewRecorder()
	h(rr, req)
	if rr.Code != http.StatusMethodNotAllowed {
		t.Fatalf("status %d", rr.Code)
	}
}

func TestUserFaucetRelayHandler_invalidJSON(t *testing.T) {
	reg := &registry.Registry{ChainID: 84532}
	h := UserFaucetRelayHandler(&config.Config{FaucetRelayEnabled: true}, nil, reg)
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`not-json`))
	rr := httptest.NewRecorder()
	h(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status %d", rr.Code)
	}
}
