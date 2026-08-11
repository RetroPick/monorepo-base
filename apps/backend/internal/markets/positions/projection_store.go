package positions

import (
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

// ProjectionStore retains in-memory position projections (v1 until Postgres swap).
type ProjectionStore struct {
	mu        sync.Mutex
	positions map[string]PositionRecord // key: userID|tokenID
	now       func() time.Time
}

// NewProjectionStore builds an empty projection store.
func NewProjectionStore() *ProjectionStore {
	return &ProjectionStore{
		positions: make(map[string]PositionRecord),
		now:       time.Now,
	}
}

func positionKey(userID, tokenID string) string {
	return userID + "|" + tokenID
}

// Upsert writes or replaces a single position projection.
func (s *ProjectionStore) Upsert(rec PositionRecord) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if rec.PositionID == "" {
		rec.PositionID = uuid.NewString()
	}
	now := s.now().UTC()
	if rec.UpdatedAt.IsZero() {
		rec.UpdatedAt = now
	}
	if rec.ObservedAt.IsZero() {
		rec.ObservedAt = now
	}
	s.positions[positionKey(rec.UserID, rec.TokenID)] = rec
}

// List returns projections for a user (token holdings only).
func (s *ProjectionStore) List(userID string) []PositionRecord {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]PositionRecord, 0)
	for _, rec := range s.positions {
		if rec.UserID != userID {
			continue
		}
		if strings.TrimSpace(rec.TokenID) == "" {
			continue
		}
		out = append(out, rec)
	}
	return out
}

// ListUserIDs returns distinct user IDs with at least one projection.
func (s *ProjectionStore) ListUserIDs() []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	seen := make(map[string]struct{})
	out := make([]string, 0)
	for _, rec := range s.positions {
		if _, ok := seen[rec.UserID]; ok {
			continue
		}
		seen[rec.UserID] = struct{}{}
		out = append(out, rec.UserID)
	}
	return out
}

// RegisterUserAccount records a user/account pairing for reconcile when no positions exist yet.
func (s *ProjectionStore) RegisterUserAccount(userID, accountWallet string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	key := userID + "|@account"
	if existing, ok := s.positions[key]; ok && existing.AccountWallet == accountWallet {
		return
	}
	now := s.now().UTC()
	s.positions[key] = PositionRecord{
		PositionID:    uuid.NewString(),
		UserID:        userID,
		AccountWallet: accountWallet,
		TokenID:       "",
		SyncStatus:    SyncStatusSynced,
		UpdatedAt:     now,
		ObservedAt:    now,
	}
}

// AccountWalletForUser returns the last known account wallet for reconcile.
func (s *ProjectionStore) AccountWalletForUser(userID string) (string, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, rec := range s.positions {
		if rec.UserID == userID && rec.AccountWallet != "" {
			return rec.AccountWallet, true
		}
	}
	key := userID + "|@account"
	if rec, ok := s.positions[key]; ok {
		return rec.AccountWallet, rec.AccountWallet != ""
	}
	return "", false
}

// MarkUpdating sets all positions for a user to updating (reorg / reconcile in flight).
func (s *ProjectionStore) MarkUpdating(userID string) int {
	s.mu.Lock()
	defer s.mu.Unlock()
	count := 0
	now := s.now().UTC()
	for key, rec := range s.positions {
		if rec.UserID != userID {
			continue
		}
		if rec.TokenID == "" {
			continue
		}
		rec.SyncStatus = SyncStatusUpdating
		rec.UpdatedAt = now
		s.positions[key] = rec
		count++
	}
	return count
}

// MarkReconciling sets all positions for a user to reconciling.
func (s *ProjectionStore) MarkReconciling(userID string) int {
	s.mu.Lock()
	defer s.mu.Unlock()
	count := 0
	now := s.now().UTC()
	for key, rec := range s.positions {
		if rec.UserID != userID {
			continue
		}
		if rec.TokenID == "" {
			continue
		}
		rec.SyncStatus = SyncStatusReconciling
		rec.UpdatedAt = now
		s.positions[key] = rec
		count++
	}
	return count
}

// ApplyVenueRebuild applies a venue snapshot without deleting independent local
// evidence. Missing venue rows may be upstream lag, so local-only rows stay
// visible and move to reconciling until a stronger evidence source lands.
func (s *ProjectionStore) ApplyVenueRebuild(userID, accountWallet string, rows []VenuePosition, observedAt time.Time) int {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.now().UTC()
	if observedAt.IsZero() {
		observedAt = now
	}
	venueTokens := make(map[string]struct{}, len(rows))
	for _, row := range rows {
		tokenID := strings.TrimSpace(row.TokenID)
		if tokenID == "" {
			continue
		}
		venueTokens[tokenID] = struct{}{}
	}
	for key, rec := range s.positions {
		if rec.UserID != userID {
			continue
		}
		if rec.TokenID == "" {
			continue
		}
		if _, ok := venueTokens[rec.TokenID]; ok {
			continue
		}
		rec.SyncStatus = SyncStatusReconciling
		rec.UpdatedAt = now
		s.positions[key] = rec
	}
	written := 0
	for _, row := range rows {
		tokenID := strings.TrimSpace(row.TokenID)
		if tokenID == "" {
			continue
		}
		positionID := uuid.NewString()
		if existing, ok := s.positions[positionKey(userID, tokenID)]; ok && existing.PositionID != "" {
			positionID = existing.PositionID
		}
		rec := PositionRecord{
			PositionID:     positionID,
			UserID:         userID,
			AccountWallet:  accountWallet,
			TokenID:        tokenID,
			MarketID:       row.MarketID,
			ConditionID:    row.ConditionID,
			OutcomeLabel:   row.OutcomeLabel,
			Size:           row.Size,
			AvgPrice:       row.AvgPrice,
			SyncStatus:     SyncStatusSynced,
			UpstreamSource: upstreamSourceDataAPI,
			UpstreamID:     row.UpstreamID,
			ObservedAt:     observedAt.UTC(),
			UpdatedAt:      now,
		}
		s.positions[positionKey(userID, row.TokenID)] = rec
		written++
	}
	accountKey := userID + "|@account"
	s.positions[accountKey] = PositionRecord{
		PositionID:    uuid.NewString(),
		UserID:        userID,
		AccountWallet: accountWallet,
		SyncStatus:    SyncStatusSynced,
		UpdatedAt:     now,
		ObservedAt:    observedAt.UTC(),
	}
	return written
}
