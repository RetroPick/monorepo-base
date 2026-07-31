package realtime

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/clob"
	"retropick/apps/backend/internal/markets/marketdata"
	upstreamws "retropick/apps/backend/internal/markets/upstream/ws"
)

// RESTSnapshotter fetches authoritative CLOB REST snapshots.
type RESTSnapshotter interface {
	GetOrderBook(ctx context.Context, tokenID string) (clob.OrderBook, error)
}

// TokenRegistry maps token IDs to market IDs.
type TokenRegistry interface {
	MarketForToken(tokenID string) (marketID string, ok bool)
}

// Producer orchestrates upstream events, reconciliation, and hub fan-out.
type Producer struct {
	hub         *Hub
	tracker     *DeliveryTracker
	rest        RESTSnapshotter
	registry    TokenRegistry
	reconcilers map[string]*marketdata.Reconciler
	mu          sync.RWMutex
	logger      *slog.Logger
	bookMaxAge  time.Duration
	now         func() time.Time
	operational bool
}

type ProducerConfig struct {
	Hub        *Hub
	REST       RESTSnapshotter
	Registry   TokenRegistry
	BookMaxAge time.Duration
	Logger     *slog.Logger
	Now        func() time.Time
}

func NewProducer(cfg ProducerConfig) *Producer {
	now := time.Now
	if cfg.Now != nil {
		now = cfg.Now
	}
	maxAge := cfg.BookMaxAge
	if maxAge <= 0 {
		maxAge = 10 * time.Second
	}
	logger := cfg.Logger
	if logger == nil {
		logger = slog.Default()
	}
	return &Producer{
		hub:         cfg.Hub,
		tracker:     NewDeliveryTracker(),
		rest:        cfg.REST,
		registry:    cfg.Registry,
		reconcilers: make(map[string]*marketdata.Reconciler),
		logger:      logger,
		bookMaxAge:  maxAge,
		now:         now,
	}
}

func (p *Producer) SetOperational(ok bool) {
	p.operational = ok
}

func (p *Producer) Operational() bool {
	return p.operational
}

func (p *Producer) HandleUpstream(events []upstreamws.RawEvent) {
	for _, event := range events {
		switch event.Type {
		case upstreamws.EventBook:
			if event.Book != nil {
				p.handleBook(*event.Book, event.Timestamp)
			}
		case upstreamws.EventPriceChange:
			p.handlePriceChanges(event.Changes, event.Timestamp)
		case upstreamws.EventLastTradePrice:
			if event.Trade != nil {
				p.handleTrade(*event.Trade, event.Timestamp)
			}
		case upstreamws.EventTickSizeChange:
			if event.TickSize != nil {
				p.handleTickSize(*event.TickSize, event.Timestamp)
			}
		}
	}
}

func (p *Producer) OnClientSubscribe(marketID, tokenID string) {
	rec, err := p.ensureReconciler(marketID, tokenID)
	if err != nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if p.rest != nil {
		book, err := p.rest.GetOrderBook(ctx, tokenID)
		if err == nil {
			snapshot, err := rec.ApplyRESTSnapshot(book, p.now())
			if err == nil {
				p.publishSnapshot(marketID, tokenID, snapshot)
				return
			}
		}
	}
	if rec.IsSynchronized() {
		p.publishSnapshot(marketID, tokenID, rec.Snapshot())
	}
}

func (p *Producer) OnUpstreamDisconnect() {
	p.mu.RLock()
	defer p.mu.RUnlock()
	now := p.now()
	for tokenID, rec := range p.reconcilers {
		rec.MarkDisconnected(now)
		p.tracker.BumpEpoch(tokenID)
		marketID, _ := p.registry.MarketForToken(tokenID)
		p.publishResyncRequired(marketID, tokenID)
	}
}

func (p *Producer) handleBook(book clob.OrderBook, observedAt time.Time) {
	tokenID := book.TokenID
	marketID, ok := p.registry.MarketForToken(tokenID)
	if !ok {
		return
	}
	rec, err := p.ensureReconciler(marketID, tokenID)
	if err != nil {
		return
	}
	if observedAt.IsZero() {
		observedAt = p.now()
	}
	snapshot, err := rec.ApplyBookEvent(book, observedAt)
	if err != nil {
		p.logger.Warn("book event", "token", tokenID, "err", err)
		return
	}
	p.publishSnapshot(marketID, tokenID, snapshot)
}

func (p *Producer) handlePriceChanges(changes []marketdata.PriceChange, observedAt time.Time) {
	if len(changes) == 0 {
		return
	}
	byToken := make(map[string][]marketdata.PriceChange)
	for _, c := range changes {
		byToken[c.TokenID] = append(byToken[c.TokenID], c)
	}
	for tokenID, batch := range byToken {
		marketID, ok := p.registry.MarketForToken(tokenID)
		if !ok {
			continue
		}
		rec, err := p.ensureReconciler(marketID, tokenID)
		if err != nil {
			continue
		}
		if observedAt.IsZero() {
			observedAt = p.now()
		}
		snapshot, err := rec.ApplyPriceChanges(batch, observedAt)
		if err != nil {
			rec.BeginResync()
			p.tracker.BumpEpoch(tokenID)
			p.publishResyncRequired(marketID, tokenID)
			continue
		}
		epoch, counter := p.tracker.Next(tokenID)
		envelope, err := NewEnvelope(
			TypeOrderBookDelta,
			marketID, tokenID, tokenID,
			snapshot.Hash, epoch, counter,
			observedAt, p.now(), snapshot,
		)
		if err != nil {
			continue
		}
		p.publishEnvelope(marketID, tokenID, envelope)
	}
}

func (p *Producer) handleTrade(trade upstreamws.TradeEvent, observedAt time.Time) {
	tokenID := trade.TokenID
	marketID, ok := p.registry.MarketForToken(tokenID)
	if !ok {
		return
	}
	rec, err := p.ensureReconciler(marketID, tokenID)
	if err != nil {
		return
	}
	price, err := markets.ParseDecimalString(trade.Price)
	if err != nil {
		return
	}
	if observedAt.IsZero() {
		observedAt = p.now()
	}
	rec.ApplyLastTrade(price, observedAt)
	epoch, counter := p.tracker.Next(tokenID)
	envelope, err := NewEnvelope(
		TypeTradeExecuted,
		marketID, tokenID, tokenID,
		"", epoch, counter,
		observedAt, p.now(), trade,
	)
	if err != nil {
		return
	}
	p.publishEnvelope(marketID, tokenID, envelope)
}

func (p *Producer) handleTickSize(tick upstreamws.TickSizeEvent, observedAt time.Time) {
	tokenID := tick.TokenID
	marketID, ok := p.registry.MarketForToken(tokenID)
	if !ok {
		return
	}
	rec, err := p.ensureReconciler(marketID, tokenID)
	if err != nil {
		return
	}
	newTick, err := markets.ParseDecimalString(tick.NewTickSize)
	if err != nil {
		return
	}
	if observedAt.IsZero() {
		observedAt = p.now()
	}
	rec.ApplyTickSize(newTick, observedAt)
	epoch, counter := p.tracker.Next(tokenID)
	envelope, err := NewEnvelope(
		TypeTickSizeChanged,
		marketID, tokenID, tokenID,
		"", epoch, counter,
		observedAt, p.now(), tick,
	)
	if err != nil {
		return
	}
	p.publishEnvelope(marketID, tokenID, envelope)
}

func (p *Producer) publishSnapshot(marketID, tokenID string, snapshot markets.OrderBookSnapshot) {
	epoch := p.tracker.BumpEpoch(tokenID)
	_, counter := p.tracker.Next(tokenID)
	envelope, err := NewEnvelope(
		TypeOrderBookSnapshot,
		marketID, tokenID, tokenID,
		snapshot.Hash, epoch, counter,
		snapshot.Timestamp, p.now(), snapshot,
	)
	if err != nil {
		return
	}
	p.publishEnvelope(marketID, tokenID, envelope)
}

func (p *Producer) publishResyncRequired(marketID, tokenID string) {
	epoch := p.tracker.Epoch(tokenID)
	envelope, err := NewEnvelope(
		TypeResyncRequired,
		marketID, tokenID, tokenID,
		"", epoch, 0,
		p.now(), p.now(),
		map[string]string{"reason": "resync_required"},
	)
	if err != nil {
		return
	}
	p.publishEnvelope(marketID, tokenID, envelope)
}

func (p *Producer) publishEnvelope(marketID, tokenID string, envelope markets.RealtimeEnvelope) {
	if p.hub == nil {
		return
	}
	payload, err := MarshalEnvelope(envelope)
	if err != nil {
		return
	}
	p.hub.PublishToToken(marketID, tokenID, payload)
}

func (p *Producer) ensureReconciler(marketID, tokenID string) (*marketdata.Reconciler, error) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if rec, ok := p.reconcilers[tokenID]; ok {
		return rec, nil
	}
	rec, err := marketdata.NewReconciler(marketdata.ReconcilerConfig{
		MarketID: marketID,
		TokenID:  tokenID,
		MaxAge:   p.bookMaxAge,
		Now:      p.now,
	})
	if err != nil {
		return nil, err
	}
	p.reconcilers[tokenID] = rec
	return rec, nil
}

func (p *Producer) ReconcilerForToken(tokenID string) (*marketdata.Reconciler, bool) {
	p.mu.RLock()
	defer p.mu.RUnlock()
	rec, ok := p.reconcilers[tokenID]
	return rec, ok
}

func (p *Producer) SynchronizedBookCount() int {
	p.mu.RLock()
	defer p.mu.RUnlock()
	count := 0
	for _, rec := range p.reconcilers {
		if rec.IsSynchronized() {
			count++
		}
	}
	return count
}
