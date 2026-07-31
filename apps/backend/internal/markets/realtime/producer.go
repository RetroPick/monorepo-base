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
	signals     *SignalPipeline
	status      *StatusProvider
	mu          sync.RWMutex
	logger      *slog.Logger
	bookMaxAge  time.Duration
	now         func() time.Time
	resnapMu    sync.Mutex
	resnapDue   map[string]time.Time
	restMu      sync.Mutex
	restDue     map[string]time.Time
}

type ProducerConfig struct {
	Hub            *Hub
	REST           RESTSnapshotter
	Registry       TokenRegistry
	Signals        *SignalPipeline
	Status         *StatusProvider
	BookMaxAge     time.Duration
	RESTValidate   time.Duration
	Logger         *slog.Logger
	Now            func() time.Time
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
		signals:     cfg.Signals,
		status:      cfg.Status,
		reconcilers: make(map[string]*marketdata.Reconciler),
		logger:      logger,
		bookMaxAge:  maxAge,
		now:         now,
		resnapDue:   make(map[string]time.Time),
		restDue:     make(map[string]time.Time),
	}
}

func (p *Producer) SetOperational(_ bool) {}

func (p *Producer) Operational() bool {
	if p.status == nil {
		return false
	}
	return p.status.Operational()
}

func (p *Producer) HandleUpstream(events []upstreamws.RawEvent) {
	for _, event := range events {
		if p.status != nil {
			ts := event.Timestamp
			if ts.IsZero() {
				ts = p.now()
			}
			p.status.MarkUpstreamMessage(ts)
		}
		switch event.Type {
		case upstreamws.EventBook:
			if event.Book != nil {
				p.handleBook(*event.Book, event.Timestamp)
			}
		case upstreamws.EventPriceChange:
			p.handlePriceChangeNotification(event.Changes, event.Timestamp)
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
				p.publishSnapshot(marketID, tokenID, snapshot, true)
				return
			}
		}
	}
	if rec.IsSynchronized() {
		p.publishSnapshot(marketID, tokenID, rec.Snapshot(), false)
	}
}

func (p *Producer) OnUpstreamShardDisconnect(_ int, tokens []string) {
	now := p.now()
	for _, tokenID := range tokens {
		p.mu.RLock()
		rec, ok := p.reconcilers[tokenID]
		p.mu.RUnlock()
		if !ok {
			continue
		}
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
	phase := rec.Phase()
	snapshot, err := rec.ApplyBookEvent(book, observedAt)
	if err != nil {
		p.logger.Warn("book event", "token", tokenID, "err", err)
		return
	}
	bumpEpoch := phase == marketdata.PhaseUninitialized || phase == marketdata.PhaseSnapshotLoading || phase == marketdata.PhaseResyncRequired
	p.publishSnapshot(marketID, tokenID, snapshot, bumpEpoch)
	if p.signals != nil {
		p.signals.ObserveSnapshot(marketID, tokenID, snapshot)
	}
}

// handlePriceChangeNotification uses price_change as notification only; authoritative state via REST.
func (p *Producer) handlePriceChangeNotification(changes []marketdata.PriceChange, observedAt time.Time) {
	if len(changes) == 0 {
		return
	}
	byToken := make(map[string]struct{})
	for _, c := range changes {
		byToken[c.TokenID] = struct{}{}
	}
	for tokenID := range byToken {
		marketID, ok := p.registry.MarketForToken(tokenID)
		if !ok {
			continue
		}
		p.scheduleRESTResnapshot(marketID, tokenID, observedAt)
	}
}

func (p *Producer) scheduleRESTResnapshot(marketID, tokenID string, observedAt time.Time) {
	if observedAt.IsZero() {
		observedAt = p.now()
	}
	p.resnapMu.Lock()
	if due, ok := p.resnapDue[tokenID]; ok && p.now().Before(due) {
		p.resnapMu.Unlock()
		return
	}
	p.resnapDue[tokenID] = p.now().Add(500 * time.Millisecond)
	p.resnapMu.Unlock()
	go p.fetchRESTSnapshot(marketID, tokenID, false)
}

func (p *Producer) fetchRESTSnapshot(marketID, tokenID string, bumpEpoch bool) {
	if p.rest == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	book, err := p.rest.GetOrderBook(ctx, tokenID)
	if err != nil {
		p.logger.Warn("rest resnapshot", "token", tokenID, "err", err)
		return
	}
	rec, err := p.ensureReconciler(marketID, tokenID)
	if err != nil {
		return
	}
	snapshot, err := rec.ApplyRESTSnapshot(book, p.now())
	if err != nil {
		return
	}
	p.publishSnapshot(marketID, tokenID, snapshot, bumpEpoch)
	if p.signals != nil {
		p.signals.ObserveSnapshot(marketID, tokenID, snapshot)
	}
	p.resnapMu.Lock()
	delete(p.resnapDue, tokenID)
	p.resnapMu.Unlock()
}

func (p *Producer) StartRESTValidation(ctx context.Context, interval time.Duration) {
	if interval <= 0 {
		interval = 30 * time.Second
	}
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				p.validateSubscribedTokens(ctx)
			}
		}
	}()
}

func (p *Producer) validateSubscribedTokens(ctx context.Context) {
	p.mu.RLock()
	tokens := make([]string, 0, len(p.reconcilers))
	for tokenID, rec := range p.reconcilers {
		if rec.IsSynchronized() {
			tokens = append(tokens, tokenID)
		}
	}
	p.mu.RUnlock()
	for _, tokenID := range tokens {
		marketID, ok := p.registry.MarketForToken(tokenID)
		if !ok {
			continue
		}
		p.restMu.Lock()
		if due, ok := p.restDue[tokenID]; ok && p.now().Before(due) {
			p.restMu.Unlock()
			continue
		}
		p.restDue[tokenID] = p.now().Add(intervalWithJitter(intervalFromContext(ctx), 5*time.Second))
		p.restMu.Unlock()

		restCtx, cancel := context.WithTimeout(ctx, 8*time.Second)
		book, err := p.rest.GetOrderBook(restCtx, tokenID)
		cancel()
		if err != nil {
			continue
		}
		rec, _ := p.ReconcilerForToken(tokenID)
		if rec == nil {
			continue
		}
		if !rec.ValidateAgainstREST(book) {
			rec.BeginResync()
			p.tracker.BumpEpoch(tokenID)
			p.publishResyncRequired(marketID, tokenID)
			p.fetchRESTSnapshot(marketID, tokenID, true)
			continue
		}
	}
}

func intervalFromContext(_ context.Context) time.Duration {
	return 30 * time.Second
}

func intervalWithJitter(base, maxJitter time.Duration) time.Duration {
	jitter := time.Duration(time.Now().UnixNano() % int64(maxJitter))
	return base + jitter
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

func (p *Producer) publishSnapshot(marketID, tokenID string, snapshot markets.OrderBookSnapshot, bumpEpoch bool) {
	var epoch, counter uint64
	if bumpEpoch {
		epoch = p.tracker.BumpEpoch(tokenID)
		_, counter = p.tracker.Next(tokenID)
	} else {
		epoch, counter = p.tracker.Next(tokenID)
	}
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

func (p *Producer) AttachSignals(pipeline *SignalPipeline) {
	p.signals = pipeline
}

func (p *Producer) PublishSignal(marketID, tokenID string, envelope markets.RealtimeEnvelope) {
	p.publishEnvelope(marketID, tokenID, envelope)
}

func (p *Producer) NextDelivery(tokenID string) (epoch, counter uint64) {
	return p.tracker.Next(tokenID)
}
