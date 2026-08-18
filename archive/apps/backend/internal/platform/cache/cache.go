package cache

import (
	"time"

	"retropick/apps/backend/internal/readcache"
)

// StringCache is a string-keyed read cache for API handlers.
type StringCache = readcache.Cache[string, any]

// NewStringCache creates a bounded TTL cache.
func NewStringCache(maxEntries int, ttl time.Duration) *StringCache {
	return readcache.New[string, any](maxEntries, ttl)
}
