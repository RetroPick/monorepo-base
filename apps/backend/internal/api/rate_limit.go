package api

import (
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

type RateLimitOptions struct {
	TrustForwardedFor bool
}

type ipWindowCounter struct {
	count int
	start time.Time
}

type rateBudget struct {
	name   string
	limit  int
	window time.Duration
}

var (
	rateMu         sync.Mutex
	rateCounters   = map[string]map[string]ipWindowCounter{}
	publicGETBudget = rateBudget{name: "public_get", limit: 60, window: time.Minute}
	wsConnectBudget = rateBudget{name: "ws_connect", limit: 30, window: time.Minute}
	watchlistBudget = rateBudget{name: "watchlist_write", limit: 20, window: time.Minute}
	fundingBudget   = rateBudget{name: "funding_write", limit: 20, window: time.Minute}
	opsBudget       = rateBudget{name: "ops", limit: 15, window: time.Minute}
)

func RateLimitMiddleware(next http.Handler, opts RateLimitOptions) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := requestIP(r, opts.TrustForwardedFor)
		if ip == "" {
			ip = "unknown"
		}
		budget := classifyRateLimitBudget(r)
		if !allowIP(budget.name, ip, budget.limit, budget.window) {
			writeAPIError(w, http.StatusTooManyRequests, "RATE_LIMITED", "rate limit exceeded", map[string]any{
				"budget": budget.name,
			})
			return
		}
		next.ServeHTTP(w, r)
	})
}

func classifyRateLimitBudget(r *http.Request) rateBudget {
	switch {
	case strings.HasPrefix(r.URL.Path, "/api/v1/ops/"):
		return opsBudget
	case r.URL.Path == "/ws":
		return wsConnectBudget
	case r.Method == http.MethodPost && (strings.HasPrefix(r.URL.Path, "/api/v1/user/watchlist") || strings.HasPrefix(r.URL.Path, "/api/v1/me/watchlist")):
		return watchlistBudget
	case r.Method == http.MethodPost && (strings.HasPrefix(r.URL.Path, "/api/v1/funding/") || strings.HasPrefix(r.URL.Path, "/api/funding/")):
		return fundingBudget
	default:
		return publicGETBudget
	}
}

func allowIP(bucketName, key string, limit int, window time.Duration) bool {
	now := time.Now()
	rateMu.Lock()
	defer rateMu.Unlock()
	bucket := rateCounters[bucketName]
	if bucket == nil {
		bucket = map[string]ipWindowCounter{}
		rateCounters[bucketName] = bucket
	}
	c := bucket[key]
	if c.start.IsZero() || now.Sub(c.start) >= window {
		bucket[key] = ipWindowCounter{count: 1, start: now}
		return true
	}
	if c.count >= limit {
		return false
	}
	c.count++
	bucket[key] = c
	return true
}

func requestIP(r *http.Request, trustForwardedFor bool) string {
	if trustForwardedFor {
		if ip := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); ip != "" {
			parts := strings.Split(ip, ",")
			return strings.TrimSpace(parts[0])
		}
	}
	host, _, err := net.SplitHostPort(strings.TrimSpace(r.RemoteAddr))
	if err == nil && host != "" {
		return host
	}
	return strings.TrimSpace(r.RemoteAddr)
}
