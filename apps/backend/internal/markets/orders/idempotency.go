package orders

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"sync"
	"time"
)

type idempotencyEntry struct {
	BodyHash   string
	Response   SubmitResponse
	StatusCode int
	ExpiresAt  time.Time
}

// IdempotencyStore deduplicates submit requests by Idempotency-Key header (in-memory v1).
type IdempotencyStore struct {
	mu      sync.Mutex
	entries map[string]idempotencyEntry
	now     func() time.Time
}

func NewIdempotencyStore() *IdempotencyStore {
	return &IdempotencyStore{
		entries: make(map[string]idempotencyEntry),
		now:     time.Now,
	}
}

func (s *IdempotencyStore) Lookup(key string) (idempotencyEntry, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.evictLocked()
	entry, ok := s.entries[key]
	return entry, ok
}

func (s *IdempotencyStore) Put(key, bodyHash string, statusCode int, resp SubmitResponse) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.evictLocked()
	s.entries[key] = idempotencyEntry{
		BodyHash:   bodyHash,
		Response:   resp,
		StatusCode: statusCode,
		ExpiresAt:  s.now().UTC().Add(idempotencyTTL),
	}
}

func (s *IdempotencyStore) evictLocked() {
	now := s.now().UTC()
	for key, entry := range s.entries {
		if !entry.ExpiresAt.After(now) {
			delete(s.entries, key)
		}
	}
}

func hashSubmitBody(req SubmitRequest) string {
	raw, _ := json.Marshal(req)
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:])
}
