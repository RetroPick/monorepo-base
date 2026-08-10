package auth

import (
	"crypto/rand"
	"encoding/hex"
	"strings"
	"sync"
	"time"
)

type nonceEntry struct {
	expiresAt time.Time
}

// NonceStore holds single-use SIWE nonces with TTL eviction.
type NonceStore struct {
	ttl   time.Duration
	now   func() time.Time
	mu    sync.Mutex
	items map[string]nonceEntry
}

func NewNonceStore(ttl time.Duration, now func() time.Time) *NonceStore {
	if now == nil {
		now = time.Now
	}
	return &NonceStore{
		ttl:   ttl,
		now:   now,
		items: make(map[string]nonceEntry),
	}
}

func (s *NonceStore) Issue() (string, time.Duration, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", 0, err
	}
	nonce := hex.EncodeToString(buf)
	now := s.now().UTC()
	s.mu.Lock()
	defer s.mu.Unlock()
	s.evictLocked(now)
	s.items[nonce] = nonceEntry{expiresAt: now.Add(s.ttl)}
	return nonce, s.ttl, nil
}

func (s *NonceStore) Consume(nonce string) bool {
	nonce = strings.TrimSpace(nonce)
	if nonce == "" {
		return false
	}
	now := s.now().UTC()
	s.mu.Lock()
	defer s.mu.Unlock()
	s.evictLocked(now)
	entry, ok := s.items[nonce]
	if !ok || now.After(entry.expiresAt) {
		return false
	}
	delete(s.items, nonce)
	return true
}

func (s *NonceStore) evictLocked(now time.Time) {
	for key, entry := range s.items {
		if now.After(entry.expiresAt) {
			delete(s.items, key)
		}
	}
}
