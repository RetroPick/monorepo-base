package api

import (
	"net"
	"net/http"
	"net/netip"
	"strings"
	"sync"
	"time"
)

type RateLimitOptions struct {
	TrustForwardedFor bool
	TrustedProxyCIDRs []string
}

type ipWindowCounter struct {
	count    int
	start    time.Time
	lastSeen time.Time
}

type rateBudget struct {
	name   string
	limit  int
	window time.Duration
}

var (
	rateMu          sync.Mutex
	rateCounters    = map[string]map[string]ipWindowCounter{}
	rateLastSweep   time.Time
	rateMaxEntries  = 10_000
	publicGETBudget = rateBudget{name: "public_get", limit: 60, window: time.Minute}
	wsConnectBudget = rateBudget{name: "ws_connect", limit: 30, window: time.Minute}
	watchlistBudget = rateBudget{name: "watchlist_write", limit: 20, window: time.Minute}
	fundingBudget   = rateBudget{name: "funding_write", limit: 20, window: time.Minute}
	opsBudget       = rateBudget{name: "ops", limit: 15, window: time.Minute}
)

func RateLimitMiddleware(next http.Handler, opts RateLimitOptions) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := requestIP(r, opts)
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
	sweepExpiredRateCounters(now, window)
	bucket := rateCounters[bucketName]
	if bucket == nil {
		bucket = map[string]ipWindowCounter{}
		rateCounters[bucketName] = bucket
	}
	c := bucket[key]
	if c.start.IsZero() || now.Sub(c.start) >= window {
		if len(bucket) >= rateMaxEntries {
			evictOldestRateCounter(bucket)
		}
		bucket[key] = ipWindowCounter{count: 1, start: now, lastSeen: now}
		return true
	}
	if c.count >= limit {
		c.lastSeen = now
		bucket[key] = c
		return false
	}
	c.count++
	c.lastSeen = now
	bucket[key] = c
	return true
}

func sweepExpiredRateCounters(now time.Time, window time.Duration) {
	if !rateLastSweep.IsZero() && now.Sub(rateLastSweep) < window {
		return
	}
	for bucketName, bucket := range rateCounters {
		for key, counter := range bucket {
			if now.Sub(counter.lastSeen) >= window {
				delete(bucket, key)
			}
		}
		if len(bucket) == 0 {
			delete(rateCounters, bucketName)
		}
	}
	rateLastSweep = now
}

func evictOldestRateCounter(bucket map[string]ipWindowCounter) {
	var oldestKey string
	var oldest time.Time
	for key, counter := range bucket {
		if oldestKey == "" || counter.lastSeen.Before(oldest) {
			oldestKey = key
			oldest = counter.lastSeen
		}
	}
	if oldestKey != "" {
		delete(bucket, oldestKey)
	}
}

func requestIP(r *http.Request, opts RateLimitOptions) string {
	remoteIP := remoteAddrIP(r.RemoteAddr)
	if opts.TrustForwardedFor && proxyTrusted(remoteIP, opts.TrustedProxyCIDRs) {
		if ip := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); ip != "" {
			parts := strings.Split(ip, ",")
			return strings.TrimSpace(parts[0])
		}
	}
	return remoteIP
}

func remoteAddrIP(remoteAddr string) string {
	remoteAddr = strings.TrimSpace(remoteAddr)
	host, _, err := net.SplitHostPort(remoteAddr)
	if err == nil && host != "" {
		return host
	}
	return remoteAddr
}

func proxyTrusted(remoteIP string, cidrs []string) bool {
	addr, err := netip.ParseAddr(strings.TrimSpace(remoteIP))
	if err != nil {
		return false
	}
	for _, raw := range cidrs {
		prefix, err := netip.ParsePrefix(strings.TrimSpace(raw))
		if err == nil && prefix.Contains(addr) {
			return true
		}
	}
	return false
}
