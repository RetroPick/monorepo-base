package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRateLimitMiddlewareFunding(t *testing.T) {
	handler := RateLimitMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}), RateLimitOptions{})
	for i := 0; i < 20; i++ {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/funding/intents/abc/source-tx", nil)
		req.RemoteAddr = "10.0.0.1:1234"
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			t.Fatalf("request %d should pass, code=%d", i+1, rr.Code)
		}
	}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/funding/intents/abc/source-tx", nil)
	req.RemoteAddr = "10.0.0.1:1234"
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusTooManyRequests {
		t.Fatalf("expected rate limited, got %d", rr.Code)
	}
}

func TestRequestIPIgnoresForwardedHeaderByDefault(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets", nil)
	req.RemoteAddr = "10.0.0.9:1234"
	req.Header.Set("X-Forwarded-For", "198.51.100.9")
	if got := requestIP(req, false); got != "10.0.0.9" {
		t.Fatalf("expected remote addr host, got %q", got)
	}
}

func TestRequestIPUsesForwardedHeaderWhenTrusted(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets", nil)
	req.RemoteAddr = "10.0.0.9:1234"
	req.Header.Set("X-Forwarded-For", "198.51.100.9, 10.0.0.9")
	if got := requestIP(req, true); got != "198.51.100.9" {
		t.Fatalf("expected forwarded client ip, got %q", got)
	}
}

func TestRateLimitBudgetClassifiesWSAndOpsSeparately(t *testing.T) {
	tests := []struct {
		method string
		path   string
		want   string
	}{
		{method: http.MethodGet, path: "/api/v1/markets", want: "public_get"},
		{method: http.MethodGet, path: "/ws", want: "ws_connect"},
		{method: http.MethodPost, path: "/api/v1/user/watchlist", want: "watchlist_write"},
		{method: http.MethodPost, path: "/api/v1/me/watchlist", want: "watchlist_write"},
		{method: http.MethodPost, path: "/api/v1/funding/intents/x/source-tx", want: "funding_write"},
		{method: http.MethodGet, path: "/api/v1/ops/health", want: "ops"},
	}
	for _, tc := range tests {
		req := httptest.NewRequest(tc.method, tc.path, nil)
		if got := classifyRateLimitBudget(req); got.name != tc.want {
			t.Fatalf("%s %s: got %q want %q", tc.method, tc.path, got.name, tc.want)
		}
	}
}
