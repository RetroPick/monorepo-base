package marketdata

import (
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/clob"
)

// ReconcilerPhase describes order-book synchronization state.
type ReconcilerPhase string

const (
	PhaseUninitialized    ReconcilerPhase = "UNINITIALIZED"
	PhaseSnapshotLoading  ReconcilerPhase = "SNAPSHOT_LOADING"
	PhaseSynchronized     ReconcilerPhase = "SYNCHRONIZED"
	PhaseDegraded         ReconcilerPhase = "DEGRADED"
	PhaseResyncRequired   ReconcilerPhase = "RESYNC_REQUIRED"
)

var (
	ErrWrongToken       = errors.New("event token mismatch")
	ErrNoBaseline       = errors.New("no snapshot baseline")
	ErrInvalidEvent     = errors.New("invalid market event")
	ErrStaleObservation = errors.New("stale observation")
)

// PriceChange is an absolute price-level replacement from upstream.
type PriceChange struct {
	TokenID   string
	Price     markets.DecimalString
	Size      markets.DecimalString
	Side      Side
	Hash      string
	Timestamp time.Time
}

// Reconciler maintains snapshot-first order-book state for one token.
type Reconciler struct {
	mu          sync.RWMutex
	marketID    string
	tokenID     string
	phase       ReconcilerPhase
	streamEpoch uint64
	snapshot    markets.OrderBookSnapshot
	lastTrade   *markets.DecimalString
	lastTradeAt time.Time
	tickSize    markets.DecimalString
	maxAge      time.Duration
	now         func() time.Time
}

type ReconcilerConfig struct {
	MarketID string
	TokenID  string
	MaxAge   time.Duration
	Now      func() time.Time
}

func NewReconciler(cfg ReconcilerConfig) (*Reconciler, error) {
	if strings.TrimSpace(cfg.MarketID) == "" || strings.TrimSpace(cfg.TokenID) == "" {
		return nil, fmt.Errorf("%w: identity required", ErrInvalidBook)
	}
	now := time.Now
	if cfg.Now != nil {
		now = cfg.Now
	}
	maxAge := cfg.MaxAge
	if maxAge <= 0 {
		maxAge = 10 * time.Second
	}
	return &Reconciler{
		marketID: cfg.MarketID,
		tokenID:  cfg.TokenID,
		phase:    PhaseUninitialized,
		maxAge:   maxAge,
		now:      now,
	}, nil
}

func (r *Reconciler) Phase() ReconcilerPhase {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.phase
}

func (r *Reconciler) StreamEpoch() uint64 {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.streamEpoch
}

func (r *Reconciler) Snapshot() markets.OrderBookSnapshot {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.snapshot
}

func (r *Reconciler) BeginResync() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.streamEpoch++
	r.phase = PhaseSnapshotLoading
	if r.snapshot.MarketID != "" {
		r.snapshot.Freshness = markets.MarketFreshness{
			State:      markets.FreshnessResyncing,
			ObservedAt: r.now().UTC(),
			Reason:     "resync_required",
			BookHash:   r.snapshot.Hash,
		}
	}
}

func (r *Reconciler) ApplyRESTSnapshot(upstream clob.OrderBook, observedAt time.Time) (markets.OrderBookSnapshot, error) {
	if upstream.TokenID != "" && upstream.TokenID != r.tokenID {
		return markets.OrderBookSnapshot{}, ErrWrongToken
	}
	snapshot, err := BuildSnapshot(r.marketID, upstream, observedAt, r.maxAge)
	if err != nil {
		return markets.OrderBookSnapshot{}, err
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.applySnapshotLocked(snapshot, observedAt)
	return snapshot, nil
}

func (r *Reconciler) ApplyBookEvent(book clob.OrderBook, observedAt time.Time) (markets.OrderBookSnapshot, error) {
	if book.TokenID != "" && book.TokenID != r.tokenID {
		return markets.OrderBookSnapshot{}, ErrWrongToken
	}
	snapshot, err := BuildSnapshot(r.marketID, book, observedAt, r.maxAge)
	if err != nil {
		return markets.OrderBookSnapshot{}, err
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.applySnapshotLocked(snapshot, observedAt)
	return snapshot, nil
}

func (r *Reconciler) ApplyPriceChanges(changes []PriceChange, observedAt time.Time) (markets.OrderBookSnapshot, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.phase != PhaseSynchronized && r.phase != PhaseDegraded {
		return markets.OrderBookSnapshot{}, ErrNoBaseline
	}
	for _, change := range changes {
		if change.TokenID != "" && change.TokenID != r.tokenID {
			return markets.OrderBookSnapshot{}, ErrWrongToken
		}
		if !probability(change.Price) || decimalSign(change.Size) < 0 {
			r.phase = PhaseResyncRequired
			r.snapshot.Freshness.State = markets.FreshnessInvalid
			r.snapshot.Freshness.Reason = "invalid_price_change"
			return markets.OrderBookSnapshot{}, ErrInvalidEvent
		}
		switch change.Side {
		case SideBid:
			r.snapshot.Bids = applyLevel(r.snapshot.Bids, change.Price, change.Size, SideBid)
		case SideAsk:
			r.snapshot.Asks = applyLevel(r.snapshot.Asks, change.Price, change.Size, SideAsk)
		default:
			r.phase = PhaseResyncRequired
			return markets.OrderBookSnapshot{}, ErrInvalidEvent
		}
		if change.Hash != "" {
			r.snapshot.Hash = change.Hash
		}
		if !change.Timestamp.IsZero() {
			r.snapshot.Timestamp = change.Timestamp.UTC()
		}
	}
	if err := setQuotes(&r.snapshot); err != nil {
		r.phase = PhaseResyncRequired
		r.snapshot.Freshness.State = markets.FreshnessInvalid
		r.snapshot.Freshness.Reason = "crossed_book"
		return markets.OrderBookSnapshot{}, err
	}
	r.snapshot.Freshness = markets.MarketFreshness{
		State:      markets.FreshnessFresh,
		ObservedAt: observedAt.UTC(),
		BookHash:   r.snapshot.Hash,
	}
	if r.phase == PhaseDegraded {
		r.phase = PhaseSynchronized
	}
	return r.snapshot, nil
}

func (r *Reconciler) ApplyLastTrade(price markets.DecimalString, observedAt time.Time) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if !probability(price) {
		return
	}
	r.lastTrade = &price
	r.lastTradeAt = observedAt.UTC()
	r.snapshot.LastTradePrice = &price
}

func (r *Reconciler) ApplyTickSize(newTick markets.DecimalString, observedAt time.Time) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if decimalSign(newTick) <= 0 {
		return
	}
	r.tickSize = newTick
	r.snapshot.TickSize = newTick
	r.snapshot.Freshness.ObservedAt = observedAt.UTC()
}

func (r *Reconciler) MarkDisconnected(observedAt time.Time) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.phase = PhaseResyncRequired
	r.snapshot.Freshness = markets.MarketFreshness{
		State:      markets.FreshnessResyncing,
		ObservedAt: observedAt.UTC(),
		Reason:     "realtime_disconnected",
		BookHash:   r.snapshot.Hash,
	}
}

func (r *Reconciler) NeedsResnapshot() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	switch r.phase {
	case PhaseResyncRequired, PhaseSnapshotLoading, PhaseUninitialized:
		return true
	default:
		return r.snapshot.Freshness.State == markets.FreshnessResyncing ||
			r.snapshot.Freshness.State == markets.FreshnessInvalid
	}
}

func (r *Reconciler) IsSynchronized() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.phase == PhaseSynchronized || r.phase == PhaseDegraded
}

func (r *Reconciler) MidpointOrLastTrade(freshnessBound time.Duration) (*markets.DecimalString, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if r.snapshot.Midpoint != nil && r.snapshot.BestBid != nil && r.snapshot.BestAsk != nil {
		if compareDecimal(*r.snapshot.BestBid, *r.snapshot.BestAsk) < 0 {
			return r.snapshot.Midpoint, nil
		}
	}
	if r.lastTrade != nil && !r.lastTradeAt.IsZero() && r.now().Sub(r.lastTradeAt) <= freshnessBound {
		return r.lastTrade, nil
	}
	return nil, ErrStaleObservation
}

func (r *Reconciler) applySnapshotLocked(snapshot markets.OrderBookSnapshot, observedAt time.Time) {
	if snapshot.TokenID != "" && snapshot.TokenID != r.tokenID {
		return
	}
	wasUninitialized := r.phase == PhaseUninitialized || r.phase == PhaseSnapshotLoading || r.phase == PhaseResyncRequired
	if wasUninitialized && r.phase == PhaseResyncRequired {
		// epoch already bumped in BeginResync
	} else if wasUninitialized && r.snapshot.Hash == "" {
		r.streamEpoch = 1
	}
	r.snapshot = snapshot
	r.snapshot.MarketID = r.marketID
	r.snapshot.TokenID = r.tokenID
	r.phase = PhaseSynchronized
	if r.tickSize != "" {
		r.snapshot.TickSize = r.tickSize
	}
	if r.lastTrade != nil {
		r.snapshot.LastTradePrice = r.lastTrade
	}
	r.snapshot.Freshness = markets.MarketFreshness{
		State:      markets.FreshnessFresh,
		ObservedAt: observedAt.UTC(),
		BookHash:   snapshot.Hash,
	}
}

func (r *Reconciler) MarkDegraded(reason string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.phase == PhaseSynchronized {
		r.phase = PhaseDegraded
	}
	r.snapshot.Freshness.State = markets.FreshnessStale
	r.snapshot.Freshness.Reason = reason
}

func (r *Reconciler) ValidateAgainstREST(upstream clob.OrderBook) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if r.snapshot.Hash == "" || upstream.Hash == "" {
		return false
	}
	return r.snapshot.Hash == upstream.Hash
}
