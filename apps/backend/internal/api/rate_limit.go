package api

import (
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

type ipWindowCounter struct {
	count int
	start time.Time
}

var (
	rateMu      sync.Mutex
	publicByIP  = map[string]ipWindowCounter{}
	fundingByIP = map[string]ipWindowCounter{}
)

func RateLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := requestIP(r)
		if ip == "" {
			ip = "unknown"
		}
		limit := 60
		bucket := &publicByIP
		if strings.HasPrefix(r.URL.Path, "/api/v1/funding/") {
			limit = 20
			bucket = &fundingByIP
		}
		if !allowIP(bucket, ip, limit, time.Minute) {
			http.Error(w, `{"error":"rate_limited"}`, http.StatusTooManyRequests)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func allowIP(bucket *map[string]ipWindowCounter, key string, limit int, window time.Duration) bool {
	now := time.Now()
	rateMu.Lock()
	defer rateMu.Unlock()
	c := (*bucket)[key]
	if c.start.IsZero() || now.Sub(c.start) >= window {
		(*bucket)[key] = ipWindowCounter{count: 1, start: now}
		return true
	}
	if c.count >= limit {
		return false
	}
	c.count++
	(*bucket)[key] = c
	return true
}

func requestIP(r *http.Request) string {
	ip := strings.TrimSpace(r.Header.Get("X-Forwarded-For"))
	if ip != "" {
		parts := strings.Split(ip, ",")
		return strings.TrimSpace(parts[0])
	}
	host, _, err := net.SplitHostPort(strings.TrimSpace(r.RemoteAddr))
	if err == nil && host != "" {
		return host
	}
	return strings.TrimSpace(r.RemoteAddr)
}
