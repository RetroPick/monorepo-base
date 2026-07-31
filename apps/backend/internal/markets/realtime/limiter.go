package realtime

import (
	"sync"
	"time"
)

// commandLimiter is a token-bucket rate limiter for client commands.
type commandLimiter struct {
	mu     sync.Mutex
	rate   float64
	tokens float64
	max    float64
	last   time.Time
	now    func() time.Time
}

func newCommandLimiter(ratePerSecond int, now func() time.Time) *commandLimiter {
	if ratePerSecond <= 0 {
		ratePerSecond = 10
	}
	if now == nil {
		now = time.Now
	}
	rate := float64(ratePerSecond)
	return &commandLimiter{
		rate:   rate,
		tokens: rate,
		max:    rate,
		last:   now(),
		now:    now,
	}
}

func (l *commandLimiter) Allow() bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := l.now()
	elapsed := now.Sub(l.last).Seconds()
	l.tokens += elapsed * l.rate
	if l.tokens > l.max {
		l.tokens = l.max
	}
	l.last = now
	if l.tokens >= 1 {
		l.tokens--
		return true
	}
	return false
}
