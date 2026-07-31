package realtime

import (
	"context"
	"log/slog"
	"sync"
	"sync/atomic"
	"time"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/signals"
)

const (
	defaultObservationQueue = 256
	defaultWorkerCount      = 2
)

// LiveSignalCommitter atomically persists closed buckets and optional signals.
type LiveSignalCommitter interface {
	CommitPriceBucket(ctx context.Context, bucket signals.PriceBucket) (*markets.SignalEnvelope, error)
	CommitLiquidityBucket(ctx context.Context, bucket signals.LiquidityBucket) (*markets.SignalEnvelope, error)
}

// DeliveryPublisher assigns stream metadata and fans out committed signals.
type DeliveryPublisher interface {
	NextDelivery(tokenID string) (epoch, counter uint64)
	PublishSignal(marketID, tokenID string, envelope markets.RealtimeEnvelope)
}

type bucketCloseJob struct {
	marketID string
	tokenID  string
	start    time.Time
	snapshot markets.OrderBookSnapshot
}

// SignalPipeline closes observation buckets and emits deterministic live signals.
type SignalPipeline struct {
	committer LiveSignalCommitter
	publisher DeliveryPublisher
	logger    *slog.Logger
	now       func() time.Time
	bucket    time.Duration
	priceCfg  signals.PriceRuleConfig
	liqCfg    signals.LiquidityRuleConfig

	mu      sync.Mutex
	open    map[string]*openBucketState
	queue   chan bucketCloseJob
	cancel  context.CancelFunc
	wg      sync.WaitGroup
	running atomic.Bool
	queued  atomic.Uint64
	dropped atomic.Uint64
}

type openBucketState struct {
	marketID string
	tokenID  string
	start    time.Time
	last     markets.OrderBookSnapshot
}

type SignalPipelineConfig struct {
	Committer LiveSignalCommitter
	Publisher DeliveryPublisher
	Logger    *slog.Logger
	Now       func() time.Time
	Bucket    time.Duration
	QueueSize int
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
	queueSize := cfg.QueueSize
	if queueSize <= 0 {
		queueSize = defaultObservationQueue
	}
	logger := cfg.Logger
	if logger == nil {
		logger = slog.Default()
	}
	return &SignalPipeline{
		committer: cfg.Committer,
		publisher: cfg.Publisher,
		logger:    logger,
		now:       now,
		bucket:    bucket,
		priceCfg:  signals.DefaultPriceRuleConfig(bucket),
		liqCfg:    signals.DefaultLiquidityRuleConfig(bucket),
		open:      make(map[string]*openBucketState),
		queue:     make(chan bucketCloseJob, queueSize),
	}
}

func (p *SignalPipeline) Operational() bool {
	return p.running.Load()
}

func (p *SignalPipeline) Start(ctx context.Context) {
	if p.running.Swap(true) {
		return
	}
	runCtx, cancel := context.WithCancel(ctx)
	p.cancel = cancel
	for i := 0; i < defaultWorkerCount; i++ {
		p.wg.Add(1)
		go p.worker(runCtx)
	}
	p.wg.Add(1)
	go p.bucketCloser(runCtx)
}

func (p *SignalPipeline) Stop(ctx context.Context) {
	if !p.running.Load() {
		return
	}
	if p.cancel != nil {
		p.cancel()
	}
	done := make(chan struct{})
	go func() {
		p.wg.Wait()
		close(done)
	}()
	select {
	case <-done:
	case <-ctx.Done():
	}
	p.flushOpenBuckets(context.Background())
	p.running.Store(false)
}

func (p *SignalPipeline) ObserveSnapshot(marketID, tokenID string, snapshot markets.OrderBookSnapshot) {
	if p.committer == nil || !p.running.Load() {
		return
	}
	if snapshot.Freshness.State != markets.FreshnessFresh {
		return
	}
	key := marketID + ":" + tokenID
	now := p.now()
	bucketStart := now.Truncate(p.bucket)
	var closeJob *bucketCloseJob
	p.mu.Lock()
	existing, ok := p.open[key]
	if ok && !existing.start.Equal(bucketStart) {
		closeJob = &bucketCloseJob{
			marketID: existing.marketID,
			tokenID:  existing.tokenID,
			start:    existing.start,
			snapshot: existing.last,
		}
		ok = false
	}
	if !ok {
		p.open[key] = &openBucketState{marketID: marketID, tokenID: tokenID, start: bucketStart, last: snapshot}
	} else {
		existing.last = snapshot
	}
	p.mu.Unlock()
	if closeJob != nil {
		p.enqueue(*closeJob)
	}
}

func (p *SignalPipeline) bucketCloser(ctx context.Context) {
	defer p.wg.Done()
	ticker := time.NewTicker(p.bucket / 2)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			p.closeExpiredBuckets()
		}
	}
}

func (p *SignalPipeline) closeExpiredBuckets() {
	now := p.now()
	cutoff := now.Truncate(p.bucket)
	var jobs []bucketCloseJob
	p.mu.Lock()
	for key, state := range p.open {
		if state.start.Before(cutoff) {
			jobs = append(jobs, bucketCloseJob{
				marketID: state.marketID,
				tokenID:  state.tokenID,
				start:    state.start,
				snapshot: state.last,
			})
			delete(p.open, key)
		}
	}
	p.mu.Unlock()
	for _, job := range jobs {
		p.enqueue(job)
	}
}

func (p *SignalPipeline) flushOpenBuckets(ctx context.Context) {
	p.mu.Lock()
	jobs := make([]bucketCloseJob, 0, len(p.open))
	for _, state := range p.open {
		jobs = append(jobs, bucketCloseJob{
			marketID: state.marketID,
			tokenID:  state.tokenID,
			start:    state.start,
			snapshot: state.last,
		})
	}
	p.open = make(map[string]*openBucketState)
	p.mu.Unlock()
	for _, job := range jobs {
		p.processJob(ctx, job)
	}
}

func (p *SignalPipeline) enqueue(job bucketCloseJob) {
	select {
	case p.queue <- job:
		p.queued.Add(1)
	default:
		p.dropped.Add(1)
		p.logger.Warn("observation queue overflow", "market", job.marketID, "token", job.tokenID)
	}
}

func (p *SignalPipeline) worker(ctx context.Context) {
	defer p.wg.Done()
	for {
		select {
		case <-ctx.Done():
			return
		case job := <-p.queue:
			p.processJob(ctx, job)
		}
	}
}

func (p *SignalPipeline) processJob(ctx context.Context, job bucketCloseJob) {
	if p.committer == nil {
		return
	}
	snapshot := job.snapshot
	mid, err := signals.ComputeMidpointPrice(snapshot.BestBid, snapshot.BestAsk)
	if err != nil || mid == nil {
		return
	}
	bucketEnd := job.start.Add(p.bucket)
	priceBucket := signals.PriceBucket{
		MarketID:     job.marketID,
		TokenID:      job.tokenID,
		BucketStart:  job.start,
		BucketEnd:    bucketEnd,
		Price:        *mid,
		BestBid:      snapshot.BestBid,
		BestAsk:      snapshot.BestAsk,
		Spread:       snapshot.Spread,
		SnapshotHash: snapshot.Hash,
		RuleVersion:  signals.RuleVersionP13,
	}
	jobCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	envelope, err := p.committer.CommitPriceBucket(jobCtx, priceBucket)
	if err != nil {
		p.logger.Warn("commit price bucket", "err", err)
	}
	if envelope != nil {
		p.fanout(job.marketID, job.tokenID, snapshot.Hash, bucketEnd, envelope)
	}

	bid, ask, total, err := signals.ComputeLiquidityDepths(snapshot, p.liqCfg.EpsilonMicro)
	if err != nil {
		return
	}
	liqBucket := signals.LiquidityBucket{
		MarketID:     job.marketID,
		TokenID:      job.tokenID,
		BucketStart:  job.start,
		BucketEnd:    bucketEnd,
		TotalDepth:   total,
		BidDepth:     bid,
		AskDepth:     ask,
		Spread:       snapshot.Spread,
		Epsilon:      p.liqCfg.EpsilonMicro,
		SnapshotHash: snapshot.Hash,
		RuleVersion:  signals.RuleVersionP13,
	}
	liqEnvelope, err := p.committer.CommitLiquidityBucket(jobCtx, liqBucket)
	if err != nil {
		p.logger.Warn("commit liquidity bucket", "err", err)
	}
	if liqEnvelope != nil {
		p.fanout(job.marketID, job.tokenID, snapshot.Hash, bucketEnd, liqEnvelope)
	}
}

func (p *SignalPipeline) fanout(marketID, tokenID, snapshotHash string, observedAt time.Time, envelope *markets.SignalEnvelope) {
	if p.publisher == nil || envelope == nil {
		return
	}
	epoch, counter := p.publisher.NextDelivery(tokenID)
	rt, err := NewEnvelope(
		TypeSignalCreated,
		marketID, tokenID, tokenID,
		snapshotHash, epoch, counter,
		observedAt, p.now(), envelope,
	)
	if err != nil {
		return
	}
	p.publisher.PublishSignal(marketID, tokenID, rt)
}
