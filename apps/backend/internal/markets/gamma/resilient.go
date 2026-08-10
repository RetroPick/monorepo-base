package gamma

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"
)

const (
	defaultCacheTTL            = 45 * time.Second
	defaultFailureThreshold    = 5
	defaultCircuitCooldown     = 30 * time.Second
	defaultMax429Retries       = 2
	defaultInitial429Backoff   = 200 * time.Millisecond
)

type ResilientConfig struct {
	CacheTTL          time.Duration
	FailureThreshold  int
	CircuitCooldown   time.Duration
	Max429Retries     int
	Initial429Backoff time.Duration
	Now               func() time.Time
}

type ResilientClient struct {
	inner *Client
	cfg   ResilientConfig

	mu              sync.Mutex
	cache           map[string]cacheEntry
	consecutiveFail int
	circuitOpenUntil time.Time
}

type cacheEntry struct {
	value     any
	expiresAt time.Time
}

func NewResilientClient(baseURL string, cfg ResilientConfig) *ResilientClient {
	if cfg.CacheTTL <= 0 {
		cfg.CacheTTL = defaultCacheTTL
	}
	if cfg.FailureThreshold <= 0 {
		cfg.FailureThreshold = defaultFailureThreshold
	}
	if cfg.CircuitCooldown <= 0 {
		cfg.CircuitCooldown = defaultCircuitCooldown
	}
	if cfg.Max429Retries <= 0 {
		cfg.Max429Retries = defaultMax429Retries
	}
	if cfg.Initial429Backoff <= 0 {
		cfg.Initial429Backoff = defaultInitial429Backoff
	}
	if cfg.Now == nil {
		cfg.Now = time.Now
	}
	return &ResilientClient{
		inner: NewClient(baseURL),
		cfg:   cfg,
		cache: make(map[string]cacheEntry),
	}
}

func (c *ResilientClient) ListEvents(ctx context.Context, limit, offset int) ([]Event, error) {
	key := fmt.Sprintf("list:%d:%d", limit, offset)
	var cached []Event
	if c.loadCache(key, &cached, false) {
		return cached, nil
	}
	if err := c.circuitBlocked(); err != nil {
		if c.loadCache(key, &cached, true) {
			return cached, nil
		}
		return nil, err
	}
	rows, err := c.listEventsWith429Retry(ctx, limit, offset)
	if err != nil {
		c.recordFailure()
		if c.loadCache(key, &cached, true) {
			return cached, nil
		}
		return nil, err
	}
	c.recordSuccess()
	c.storeCache(key, rows)
	return rows, nil
}

func (c *ResilientClient) GetEvent(ctx context.Context, eventID string) (Event, error) {
	key := "event:" + eventID
	var cached Event
	if c.loadCache(key, &cached, false) {
		return cached, nil
	}
	if err := c.circuitBlocked(); err != nil {
		if c.loadCache(key, &cached, true) {
			return cached, nil
		}
		return Event{}, err
	}
	row, err := c.getEventWith429Retry(ctx, eventID)
	if err != nil {
		c.recordFailure()
		if c.loadCache(key, &cached, true) {
			return cached, nil
		}
		return Event{}, err
	}
	c.recordSuccess()
	c.storeCache(key, row)
	return row, nil
}

func (c *ResilientClient) GetMarket(ctx context.Context, marketID string) (Market, error) {
	key := "market:" + marketID
	var cached Market
	if c.loadCache(key, &cached, false) {
		return cached, nil
	}
	if err := c.circuitBlocked(); err != nil {
		if c.loadCache(key, &cached, true) {
			return cached, nil
		}
		return Market{}, err
	}
	row, err := c.getMarketWith429Retry(ctx, marketID)
	if err != nil {
		c.recordFailure()
		if c.loadCache(key, &cached, true) {
			return cached, nil
		}
		return Market{}, err
	}
	c.recordSuccess()
	c.storeCache(key, row)
	return row, nil
}

func (c *ResilientClient) listEventsWith429Retry(ctx context.Context, limit, offset int) ([]Event, error) {
	backoff := c.cfg.Initial429Backoff
	for attempt := 0; attempt <= c.cfg.Max429Retries; attempt++ {
		rows, err := c.inner.ListEvents(ctx, limit, offset)
		if err == nil {
			return rows, nil
		}
		wait, retryable := c.rateLimitWait(err, backoff)
		if !retryable || attempt == c.cfg.Max429Retries {
			return nil, err
		}
		if err := sleepContext(ctx, wait); err != nil {
			return nil, err
		}
		backoff *= 2
	}
	return nil, ErrRateLimited
}

func (c *ResilientClient) getEventWith429Retry(ctx context.Context, eventID string) (Event, error) {
	backoff := c.cfg.Initial429Backoff
	for attempt := 0; attempt <= c.cfg.Max429Retries; attempt++ {
		row, err := c.inner.GetEvent(ctx, eventID)
		if err == nil {
			return row, nil
		}
		wait, retryable := c.rateLimitWait(err, backoff)
		if !retryable || attempt == c.cfg.Max429Retries {
			return Event{}, err
		}
		if err := sleepContext(ctx, wait); err != nil {
			return Event{}, err
		}
		backoff *= 2
	}
	return Event{}, ErrRateLimited
}

func (c *ResilientClient) getMarketWith429Retry(ctx context.Context, marketID string) (Market, error) {
	backoff := c.cfg.Initial429Backoff
	for attempt := 0; attempt <= c.cfg.Max429Retries; attempt++ {
		row, err := c.inner.GetMarket(ctx, marketID)
		if err == nil {
			return row, nil
		}
		wait, retryable := c.rateLimitWait(err, backoff)
		if !retryable || attempt == c.cfg.Max429Retries {
			return Market{}, err
		}
		if err := sleepContext(ctx, wait); err != nil {
			return Market{}, err
		}
		backoff *= 2
	}
	return Market{}, ErrRateLimited
}

func (c *ResilientClient) rateLimitWait(err error, fallback time.Duration) (time.Duration, bool) {
	var upstream *UpstreamError
	if !errors.As(err, &upstream) || !errors.Is(upstream.Kind, ErrRateLimited) {
		return 0, false
	}
	wait := fallback
	if upstream.RetryAfter > 0 {
		wait = upstream.RetryAfter
	}
	return wait, true
}

func sleepContext(ctx context.Context, wait time.Duration) error {
	timer := time.NewTimer(wait)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return nil
	}
}

func (c *ResilientClient) circuitBlocked() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	now := c.cfg.Now()
	if c.circuitOpenUntil.IsZero() || now.After(c.circuitOpenUntil) {
		return nil
	}
	return fmt.Errorf("%w: circuit open", ErrUpstream)
}

func (c *ResilientClient) recordFailure() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.consecutiveFail++
	if c.consecutiveFail >= c.cfg.FailureThreshold {
		c.circuitOpenUntil = c.cfg.Now().Add(c.cfg.CircuitCooldown)
	}
}

func (c *ResilientClient) recordSuccess() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.consecutiveFail = 0
	c.circuitOpenUntil = time.Time{}
}

func (c *ResilientClient) storeCache(key string, value any) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.cache[key] = cacheEntry{
		value:     value,
		expiresAt: c.cfg.Now().Add(c.cfg.CacheTTL),
	}
}

func (c *ResilientClient) loadCache(key string, dst any, allowStale bool) bool {
	c.mu.Lock()
	entry, ok := c.cache[key]
	c.mu.Unlock()
	if !ok {
		return false
	}
	now := c.cfg.Now()
	if !allowStale && now.After(entry.expiresAt) {
		return false
	}
	switch target := dst.(type) {
	case *[]Event:
		*target = entry.value.([]Event)
	case *Event:
		*target = entry.value.(Event)
	case *Market:
		*target = entry.value.(Market)
	default:
		return false
	}
	return true
}
