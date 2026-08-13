package realtime_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/gorilla/websocket"
	"retropick/apps/backend/internal/markets/realtime"
)

func TestHandlerEmptyAllowlistRejectsArbitraryBrowserOrigin(t *testing.T) {
	_, response, err := dialHandler(t, nil, "https://attacker.example")
	assertHandshakeRejected(t, response, err)
}

func TestHandlerAllowsExactNormalizedOrigin(t *testing.T) {
	conn, response, err := dialHandler(t, []string{"HTTPS://App.Example:8443"}, "https://app.example:8443")
	if err != nil {
		t.Fatalf("expected exact normalized origin to upgrade, status=%v err=%v", responseStatus(response), err)
	}
	if conn == nil {
		t.Fatal("expected WebSocket connection")
	}
}

func TestHandlerRejectsUnknownMalformedAndMissingOrigins(t *testing.T) {
	for _, tc := range []struct {
		name   string
		origin string
	}{
		{name: "unknown", origin: "https://other.example"},
		{name: "malformed", origin: "://bad-origin"},
		{name: "missing", origin: ""},
	} {
		t.Run(tc.name, func(t *testing.T) {
			_, response, err := dialHandler(t, []string{"https://app.example"}, tc.origin)
			assertHandshakeRejected(t, response, err)
		})
	}
}

func assertHandshakeRejected(t *testing.T, response *http.Response, err error) {
	t.Helper()
	if err == nil {
		t.Fatal("expected WebSocket handshake rejection")
	}
	if response == nil || response.StatusCode != http.StatusForbidden {
		t.Fatalf("status = %v, want 403", responseStatus(response))
	}
}

func dialHandler(t *testing.T, allowedOrigins []string, origin string) (*websocket.Conn, *http.Response, error) {
	t.Helper()
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	hub := realtime.NewHub(realtime.HubConfig{})
	hub.Start(ctx)
	t.Cleanup(hub.Stop)

	r := chi.NewRouter()
	realtime.NewHandler(realtime.HandlerConfig{Hub: hub, AllowedOrigins: allowedOrigins}).RegisterRoutes(r)
	server := httptest.NewServer(r)
	t.Cleanup(server.Close)

	headers := http.Header{}
	if origin != "" {
		headers.Set("Origin", origin)
	}
	conn, response, err := websocket.DefaultDialer.Dial(
		"ws"+strings.TrimPrefix(server.URL, "http")+"/api/v1/markets/realtime",
		headers,
	)
	if conn != nil {
		t.Cleanup(func() { _ = conn.Close() })
	}
	return conn, response, err
}

func responseStatus(response *http.Response) any {
	if response == nil {
		return nil
	}
	return response.StatusCode
}
