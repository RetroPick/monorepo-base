package realtime

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/signals"
)

// ObservationStore persists closed observation buckets.
type ObservationStore interface {
	UpsertPriceObservation(ctx context.Context, bucket signals.PriceBucket, expiresAt time.Time) error
	ListPriceObservations(ctx context.Context, marketID, tokenID string, since time.Time, limit int32) ([]signals.PriceBucket, error)
}

// SignalWriter persists evaluated signals idempotently.
type SignalWriter interface {
	UpsertSignal(ctx context.Context, envelope markets.SignalEnvelope) error
}

// SignalPipeline closes observation buckets and emits deterministic signals.
type SignalPipeline struct {
	store    ObservationStore
	writer   SignalWriter
	hub      *Producer
	logger   *slog.Logger
	now      func() time.Time
	mu       sync.Mutex
	open     map[string]*openBucket
	priceCfg signals.PriceRuleConfig
}

type openBucket struct {
	marketID string
	tokenID  string
	start    time.Time
	last     markets.OrderBookSnapshot
}

type SignalPipelineConfig struct {
	Store    ObservationStore
	Writer   SignalWriter
	Producer *Producer
	Logger   *slog.Logger
	Now      func() time.Time
	Bucket   time.Duration
}

func NewSignalPipeline(cfg SignalPipelineConfig) *SignalPipeline {
	now := time.Now
	if cfg.Now != nil {
		now = cfg.Now
	}
	bucket := cfg.Bucket
	if bucket <= 0 {
		bucket = time.Minute
	}
	logger := cfg.Logger
	if logger == nil {
		logger = slog.Default()
	}
	return &SignalPipeline{
		store:  cfg.Store,
		writer: cfg.Writer,
		hub:    cfg.Producer,
		logger: logger,
		now:    now,
		open:   make(map[string]*openBucket),
		priceCfg: signals.PriceRuleConfig{
			ObservationBucket: bucket,
			ReferenceWindow:   5 * bucket,
			ThresholdOnPP:     2.0,
			ThresholdOffPP:    1.0,
			Cooldown:          bucket,
			Expiry:            24 * time.Hour,
			MinObservations:   2,
		},
	}
}

func (p *SignalPipeline) ObserveSnapshot(marketID, tokenID string, snapshot markets.OrderBookSnapshot) {
	if p.store == nil || p.writer == nil {
		return
	}
	key := marketID + ":" + tokenID
	now := p.now()
	p.mu.Lock()
	defer p.mu.Unlock()
	bucketStart := now.Truncate(p.priceCfg.ObservationBucket)
	existing, ok := p.open[key]
	if ok && !existing.start.Equal(bucketStart) {
		p.closeBucketLocked(context.Background(), existing)
		ok = false
	}
	if !ok {
		p.open[key] = &openBucket{
			marketID: marketID,
			tokenID:  tokenID,
			start:    bucketStart,
			last:     snapshot,
		}
		return
	}
	existing.last = snapshot
}

func (p *SignalPipeline) closeBucketLocked(ctx context.Context, bucket *openBucket) {
	snapshot := bucket.last
	mid, err := signals.ComputeMidpointPrice(snapshot.BestBid, snapshot.BestAsk)
	if err != nil || mid == nil {
		return
	}
	bucketEnd := bucket.start.Add(p.priceCfg.ObservationBucket)
	priceBucket := signals.PriceBucket{
		MarketID:     bucket.marketID,
		TokenID:      bucket.tokenID,
		BucketStart:  bucket.start,
		BucketEnd:    bucketEnd,
		Price:        *mid,
		BestBid:      snapshot.BestBid,
		BestAsk:      snapshot.BestAsk,
		Spread:       snapshot.Spread,
		SnapshotHash: snapshot.Hash,
		RuleVersion:  signals.RuleVersionP13,
	}
	expiresAt := p.now().Add(7 * 24 * time.Hour)
	if err := p.store.UpsertPriceObservation(ctx, priceBucket, expiresAt); err != nil {
		p.logger.Warn("persist price observation", "err", err)
		return
	}
	refBuckets, err := p.store.ListPriceObservations(ctx, bucket.marketID, bucket.tokenID, bucket.start.Add(-p.priceCfg.ReferenceWindow), 10)
	if err != nil || len(refBuckets) < p.priceCfg.MinObservations {
		return
	}
	reference := refBuckets[0]
	deltaPP, err := signals.DeltaProbabilityPoints(priceBucket.Price, reference.Price)
	if err != nil {
		return
	}
	emit, direction := signals.EvaluatePriceMove(deltaPP, p.priceCfg, "")
	if !emit {
		return
	}
	threshold, _ := markets.ParseDecimalString(fmt.Sprintf("%.4f", p.priceCfg.ThresholdOnPP))
	observation, err := signals.BuildPriceMoveObservation(priceBucket, reference, threshold, deltaPP, direction)
	if err != nil {
		return
	}
	engine := signals.NewEngine(signals.EngineConfig{Now: p.now})
	envelope, err := engine.Evaluate(observation)
	if err != nil || envelope == nil {
		return
	}
	envelope.IdempotencyKey = signals.PriceMoveIdempotencyKey(
		signals.RuleVersionP13,
		bucket.marketID,
		bucket.tokenID,
		bucketEnd,
		direction,
		p.priceCfg.ThresholdOnPP,
	)
	envelope.ID = "signal:" + envelope.IdempotencyKey
	if err := p.writer.UpsertSignal(ctx, *envelope); err != nil {
		p.logger.Warn("persist signal", "err", err)
		return
	}
	if p.hub != nil {
		rt, err := NewEnvelope(
			TypeSignalCreated,
			bucket.marketID,
			bucket.tokenID,
			bucket.tokenID,
			snapshot.Hash,
			0, 0,
			bucketEnd, p.now(),
			envelope,
		)
		if err == nil {
			p.hub.PublishSignal(bucket.marketID, bucket.tokenID, rt)
		}
	}
}
