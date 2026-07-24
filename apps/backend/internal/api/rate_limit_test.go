package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
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
	req := httptest.NewRequest(http.MethodGet, "/api/v1/legacy/markets", nil)
	req.RemoteAddr = "10.0.0.9:1234"
	req.Header.Set("X-Forwarded-For", "198.51.100.9")
	if got := requestIP(req, RateLimitOptions{}); got != "10.0.0.9" {
		t.Fatalf("expected remote addr host, got %q", got)
	}
}

func TestRequestIPUsesForwardedHeaderWhenProxyNetworkTrusted(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/v1/legacy/markets", nil)
	req.RemoteAddr = "10.0.0.9:1234"
	req.Header.Set("X-Forwarded-For", "198.51.100.9, 10.0.0.9")
	if got := requestIP(req, RateLimitOptions{TrustForwardedFor: true, TrustedProxyCIDRs: []string{"10.0.0.0/8"}}); got != "198.51.100.9" {
		t.Fatalf("expected forwarded client ip, got %q", got)
	}
}

func TestRequestIPIgnoresForwardedHeaderFromUntrustedProxy(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/v1/legacy/markets", nil)
	req.RemoteAddr = "203.0.113.9:1234"
	req.Header.Set("X-Forwarded-For", "198.51.100.9")
	if got := requestIP(req, RateLimitOptions{TrustForwardedFor: true, TrustedProxyCIDRs: []string{"10.0.0.0/8"}}); got != "203.0.113.9" {
		t.Fatalf("expected untrusted proxy remote addr, got %q", got)
	}
}

func TestAllowIPEvictsOldestCounterAtBound(t *testing.T) {
	rateMu.Lock()
	previousCounters, previousMax, previousSweep := rateCounters, rateMaxEntries, rateLastSweep
	rateCounters = map[string]map[string]ipWindowCounter{}
	rateMaxEntries = 2
	rateLastSweep = time.Now()
	rateMu.Unlock()
	t.Cleanup(func() {
		rateMu.Lock()
		rateCounters, rateMaxEntries, rateLastSweep = previousCounters, previousMax, previousSweep
		rateMu.Unlock()
	})

	allowIP("bounded", "first", 10, time.Minute)
	time.Sleep(time.Millisecond)
	allowIP("bounded", "second", 10, time.Minute)
	time.Sleep(time.Millisecond)
	allowIP("bounded", "third", 10, time.Minute)

	rateMu.Lock()
	defer rateMu.Unlock()
	if _, ok := rateCounters["bounded"]["first"]; ok {
		t.Fatal("expected oldest rate counter to be evicted")
	}
	if got := len(rateCounters["bounded"]); got != 2 {
		t.Fatalf("counter count = %d, want 2", got)
	}
}

func TestRateLimitBudgetClassifiesWSAndOpsSeparately(t *testing.T) {
	tests := []struct {
		method string
		path   string
		want   string
	}{
		{method: http.MethodGet, path: "/api/v1/legacy/markets", want: "public_get"},
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
