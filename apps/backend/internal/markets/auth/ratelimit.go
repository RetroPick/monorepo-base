package auth

import (
	"strings"
	"sync"
	"time"
)

type rateLimitEntry struct {
	count     int
	windowEnd time.Time
}

// RateLimiter is a bounded in-memory per-key rate limiter.
type RateLimiter struct {
	limit  int
	window time.Duration
	now    func() time.Time
	mu     sync.Mutex
	items  map[string]rateLimitEntry
}

func NewRateLimiter(limit int, window time.Duration, now func() time.Time) *RateLimiter {
	if now == nil {
		now = time.Now
	}
	if limit < 1 {
		limit = defaultAuthRateLimit
	}
	if window <= 0 {
		window = time.Minute
	}
	return &RateLimiter{
		limit:  limit,
		window: window,
		now:    now,
		items:  make(map[string]rateLimitEntry),
	}
}

func (l *RateLimiter) Allow(key string) bool {
	key = strings.TrimSpace(key)
	if key == "" {
		return false
	}
	now := l.now().UTC()
	l.mu.Lock()
	defer l.mu.Unlock()
	entry, ok := l.items[key]
	if !ok || now.After(entry.windowEnd) {
		l.items[key] = rateLimitEntry{count: 1, windowEnd: now.Add(l.window)}
		return true
	}
	if entry.count >= l.limit {
		return false
	}
	entry.count++
	l.items[key] = entry
	return true
}