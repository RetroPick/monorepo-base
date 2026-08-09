package orders

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"sync"
	"time"
)

type cancelIdempotencyEntry struct {
	BodyHash   string
	Response   CancelResponse
	StatusCode int
	ExpiresAt  time.Time
}

// CancelIdempotencyStore deduplicates cancel requests by Idempotency-Key header.
type CancelIdempotencyStore struct {
	mu      sync.Mutex
	entries map[string]cancelIdempotencyEntry
	now     func() time.Time
}

func NewCancelIdempotencyStore() *CancelIdempotencyStore {
	return &CancelIdempotencyStore{
		entries: make(map[string]cancelIdempotencyEntry),
		now:     time.Now,
	}
}

func (s *CancelIdempotencyStore) Lookup(key string) (cancelIdempotencyEntry, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.evictLocked()
	entry, ok := s.entries[key]
	return entry, ok
}

func (s *CancelIdempotencyStore) Put(key, bodyHash string, statusCode int, resp CancelResponse) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.evictLocked()
	s.entries[key] = cancelIdempotencyEntry{
		BodyHash:   bodyHash,
		Response:   resp,
		StatusCode: statusCode,
		ExpiresAt:  s.now().UTC().Add(idempotencyTTL),
	}
}

func (s *CancelIdempotencyStore) evictLocked() {
	now := s.now().UTC()
	for key, entry := range s.entries {
		if !entry.ExpiresAt.After(now) {
			delete(s.entries, key)
		}
	}
}

func hashCancelBody(req CancelRequest) string {
	raw, _ := json.Marshal(req)
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:])
}
