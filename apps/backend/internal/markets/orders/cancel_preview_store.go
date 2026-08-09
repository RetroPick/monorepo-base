package orders

import (
	"sync"
	"time"
)

type cancelPreviewRecord struct {
	PreviewID       string
	UserID          string
	TargetOrderID   string
	ContentHash     string
	ExpiresAt       time.Time
	UnsignedPayload UnsignedCancelPayload
	Metadata        hashMetadata
}

// CancelPreviewStore retains cancel previews until expiry (in-memory v1).
type CancelPreviewStore struct {
	mu      sync.Mutex
	records map[string]cancelPreviewRecord
	now     func() time.Time
}

func NewCancelPreviewStore() *CancelPreviewStore {
	return &CancelPreviewStore{
		records: make(map[string]cancelPreviewRecord),
		now:     time.Now,
	}
}

func (s *CancelPreviewStore) Put(rec cancelPreviewRecord) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.evictLocked()
	s.records[rec.PreviewID] = rec
}

func (s *CancelPreviewStore) Get(previewID string) (cancelPreviewRecord, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	rec, ok := s.records[previewID]
	return rec, ok
}

func (s *CancelPreviewStore) Delete(previewID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.records, previewID)
}

func (s *CancelPreviewStore) evictLocked() {
	now := s.now().UTC()
	for id, rec := range s.records {
		if !rec.ExpiresAt.After(now) {
			delete(s.records, id)
		}
	}
}
