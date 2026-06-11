package readcache

import (
	"sync"
	"time"
)

type Stats struct {
	Hits          uint64
	Misses        uint64
	Evictions     uint64
	Invalidations uint64
}

type entry[V any] struct {
	value     V
	createdAt time.Time
	lastSeen  time.Time
}

type Cache[K comparable, V any] struct {
	mu         sync.Mutex
	maxEntries int
	ttl        time.Duration
	now        func() time.Time
	entries    map[K]entry[V]
	stats      Stats
}

func New[K comparable, V any](maxEntries int, ttl time.Duration) *Cache[K, V] {
	if maxEntries < 1 {
		maxEntries = 1
	}
	if ttl <= 0 {
		ttl = time.Second
	}
	return &Cache[K, V]{
		maxEntries: maxEntries,
		ttl:        ttl,
		now:        time.Now,
		entries:    make(map[K]entry[V]),
	}
}

func (c *Cache[K, V]) Get(key K) (V, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	now := c.now()
	item, ok := c.entries[key]
	if !ok || now.Sub(item.createdAt) >= c.ttl {
		if ok {
			delete(c.entries, key)
		}
		c.stats.Misses++
		var zero V
		return zero, false
	}
	item.lastSeen = now
	c.entries[key] = item
	c.stats.Hits++
	return item.value, true
}

func (c *Cache[K, V]) Set(key K, value V) {
	c.mu.Lock()
	defer c.mu.Unlock()
	now := c.now()
	if _, exists := c.entries[key]; !exists && len(c.entries) >= c.maxEntries {
		c.evictOldest()
	}
	c.entries[key] = entry[V]{value: value, createdAt: now, lastSeen: now}
}

func (c *Cache[K, V]) Clear() {
	c.mu.Lock()
	defer c.mu.Unlock()
	if len(c.entries) > 0 {
		clear(c.entries)
		c.stats.Invalidations++
	}
}

func (c *Cache[K, V]) Stats() Stats {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.stats
}

func (c *Cache[K, V]) evictOldest() {
	var oldestKey K
	var oldest time.Time
	found := false
	for key, item := range c.entries {
		if !found || item.lastSeen.Before(oldest) {
			oldestKey, oldest, found = key, item.lastSeen, true
		}
	}
	if found {
		delete(c.entries, oldestKey)
		c.stats.Evictions++
	}
}
