package store

import (
	"sort"
	"strings"
	"sync"
	"time"

	"retropick/apps/backend/internal/markets/intelligence/model"
	"retropick/apps/backend/internal/markets/signals"
)

// WhaleEvent is a published large-trade projection row.
type WhaleEvent struct {
	ID              string
	TradeRef        string
	Fingerprint     string
	WalletAddress   string
	MarketID        string
	MarketTitle     string
	Outcome         string
	Side            model.Side
	NotionalMinor   int64
	SizeMinor       int64
	PriceMinor      int64
	TradedAt        time.Time
	IngestedAt      time.Time
	WhaleScore      float64
	ReasonCodes     []string
	DisplayName     string
	Envelope        signals.EvidenceEnvelope
	ParamsVersion   string
	LagSeconds      int64
}

// MemoryStore is an in-memory intel_trades / intel_whale_events projection.
type MemoryStore struct {
	mu sync.RWMutex

	trades          map[string]model.NormalizedTrade
	whaleByTradeRef map[string]WhaleEvent
	events          []WhaleEvent
	fingerprintSeen map[string]time.Time
	tradeKeyIndex   map[string]string
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		trades:          make(map[string]model.NormalizedTrade),
		whaleByTradeRef: make(map[string]WhaleEvent),
		fingerprintSeen: make(map[string]time.Time),
		tradeKeyIndex:   make(map[string]string),
	}
}

func tradeKey(source, upstreamID string) string {
	return source + "\x00" + upstreamID
}

// UpsertTrade stores a normalized trade idempotently.
func (s *MemoryStore) UpsertTrade(trade model.NormalizedTrade) (model.NormalizedTrade, bool, error) {
	if err := trade.Validate(); err != nil {
		return model.NormalizedTrade{}, false, err
	}
	key := tradeKey(trade.Source, trade.UpstreamTradeID)
	s.mu.Lock()
	defer s.mu.Unlock()
	_, exists := s.trades[key]
	s.trades[key] = trade
	return trade, !exists, nil
}

// GetTrade returns a stored trade by upstream id.
func (s *MemoryStore) GetTrade(source, upstreamID string) (model.NormalizedTrade, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	trade, ok := s.trades[tradeKey(source, upstreamID)]
	return trade, ok
}

// PriorWhaleEventID returns an existing whale event id for the trade ref if any.
func (s *MemoryStore) PriorWhaleEventID(tradeRef string) (string, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	ev, ok := s.whaleByTradeRef[tradeRef]
	if !ok {
		return "", false
	}
	return ev.ID, true
}

// FingerprintLastSeen returns when a fingerprint was last published.
func (s *MemoryStore) FingerprintLastSeen(fingerprint string) (time.Time, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	ts, ok := s.fingerprintSeen[fingerprint]
	return ts, ok
}

// InsertWhaleEvent appends a whale event when publish_new is true.
func (s *MemoryStore) InsertWhaleEvent(event WhaleEvent) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, exists := s.whaleByTradeRef[event.TradeRef]; exists {
		return nil
	}
	s.whaleByTradeRef[event.TradeRef] = event
	s.events = append(s.events, event)
	s.fingerprintSeen[event.Fingerprint] = event.IngestedAt
	s.tradeKeyIndex[tradeKey(model.SourceDataTrades, event.TradeRef)] = event.ID
	sort.SliceStable(s.events, func(i, j int) bool {
		if !s.events[i].TradedAt.Equal(s.events[j].TradedAt) {
			return s.events[i].TradedAt.After(s.events[j].TradedAt)
		}
		if s.events[i].WhaleScore != s.events[j].WhaleScore {
			return s.events[i].WhaleScore > s.events[j].WhaleScore
		}
		return s.events[i].NotionalMinor > s.events[j].NotionalMinor
	})
	return nil
}

// ListWhaleEvents returns a filtered page of whale events.
func (s *MemoryStore) ListWhaleEvents(filter ListFilter) ([]WhaleEvent, *string) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	matched := make([]WhaleEvent, 0, len(s.events))
	for _, event := range s.events {
		if !filter.matches(event) {
			continue
		}
		matched = append(matched, event)
	}

	start := 0
	if filter.Cursor != "" {
		for i, event := range matched {
			if cursorKey(event) == filter.Cursor {
				start = i + 1
				break
			}
		}
	}

	limit := filter.Limit
	if limit <= 0 {
		limit = 50
	}
	end := start + limit
	if end > len(matched) {
		end = len(matched)
	}
	page := matched[start:end]

	var next *string
	if end < len(matched) && len(page) > 0 {
		key := cursorKey(page[len(page)-1])
		next = &key
	}
	return page, next
}

func cursorKey(event WhaleEvent) string {
	return event.TradedAt.UTC().Format(time.RFC3339Nano) + "|" + event.Fingerprint
}

// ListFilter applies API query filters.
type ListFilter struct {
	MinScore      float64
	MinNotional   int64
	MarketID      string
	Wallet        string
	ReasonCode    string
	Cursor        string
	Limit         int
}

func (f ListFilter) matches(event WhaleEvent) bool {
	if f.MinScore > 0 && event.WhaleScore < f.MinScore {
		return false
	}
	if f.MinNotional > 0 && event.NotionalMinor < f.MinNotional {
		return false
	}
	if id := strings.TrimSpace(f.MarketID); id != "" && event.MarketID != id {
		return false
	}
	if w := strings.TrimSpace(f.Wallet); w != "" && !strings.EqualFold(event.WalletAddress, w) {
		return false
	}
	if rc := strings.TrimSpace(f.ReasonCode); rc != "" {
		found := false
		for _, code := range event.ReasonCodes {
			if code == rc {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}
	return true
}

// AllEvents returns all events for tests.
func (s *MemoryStore) AllEvents() []WhaleEvent {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]WhaleEvent, len(s.events))
	copy(out, s.events)
	return out
}
