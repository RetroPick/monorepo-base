package orders

import (
	"sync"
	"time"
)

// PreviewStore retains issued previews until expiry (in-memory v1).
type PreviewStore struct {
	mu      sync.Mutex
	records map[string]previewRecord
	now     func() time.Time
}

func NewPreviewStore() *PreviewStore {
	return &PreviewStore{
		records: make(map[string]previewRecord),
		now:     time.Now,
	}
}

func (s *PreviewStore) Put(rec previewRecord) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.evictLocked()
	s.records[rec.PreviewID] = rec
}

func (s *PreviewStore) Get(previewID string) (previewRecord, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	rec, ok := s.records[previewID]
	return rec, ok
}

func (s *PreviewStore) Delete(previewID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.records, previewID)
}

func (s *PreviewStore) evictLocked() {
	now := s.now().UTC()
	for id, rec := range s.records {
		if !rec.ExpiresAt.After(now) {
			delete(s.records, id)
		}
	}
}
