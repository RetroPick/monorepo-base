package postgres

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/signals"
)

func newLiveCommitter(t *testing.T, pool *pgxpool.Pool, now time.Time) *LiveSignalCommitter {
	t.Helper()
	engine := signals.NewEngine(signals.EngineConfig{Now: func() time.Time { return now }})
	committer, err := NewLiveSignalCommitter(pool, engine, time.Minute, func() time.Time { return now })
	if err != nil {
		t.Fatal(err)
	}
	return committer
}

func countPriceObservations(t *testing.T, pool *pgxpool.Pool, marketID, tokenID string) int {
	t.Helper()
	var n int
	err := pool.QueryRow(context.Background(),
		`SELECT COUNT(*) FROM markets_price_observations WHERE market_id = $1 AND token_id = $2`,
		marketID, tokenID,
	).Scan(&n)
	if err != nil {
		t.Fatal(err)
	}
	return n
}

func countLiquidityObservations(t *testing.T, pool *pgxpool.Pool, marketID, tokenID string) int {
	t.Helper()
	var n int
	err := pool.QueryRow(context.Background(),
		`SELECT COUNT(*) FROM markets_liquidity_observations WHERE market_id = $1 AND token_id = $2`,
		marketID, tokenID,
	).Scan(&n)
	if err != nil {
		t.Fatal(err)
	}
	return n
}

func countSignalsForMarket(t *testing.T, pool *pgxpool.Pool, marketID, signalType string) int {
	t.Helper()
	var n int
	err := pool.QueryRow(context.Background(),
		`SELECT COUNT(*) FROM markets_market_signals WHERE market_id = $1 AND signal_type = $2`,
		marketID, signalType,
	).Scan(&n)
	if err != nil {
		t.Fatal(err)
	}
	return n
}

func countEvidenceForMarketSignals(t *testing.T, pool *pgxpool.Pool, marketID string) int {
	t.Helper()
	var n int
	err := pool.QueryRow(context.Background(),
		`SELECT COUNT(*) FROM markets_signal_evidence e
		 JOIN markets_market_signals s ON s.signal_id = e.signal_id
		 WHERE s.market_id = $1`,
		marketID,
	).Scan(&n)
	if err != nil {
		t.Fatal(err)
	}
	return n
}

func priceBucket(marketID, tokenID string, start, end time.Time, price string) signals.PriceBucket {
	p := markets.DecimalString(price)
	bid := markets.DecimalString("0.40")
	ask := markets.DecimalString("0.42")
	switch price {
	case "0.40":
		bid = markets.DecimalString("0.39")
		ask = markets.DecimalString("0.41")
	case "0.42":
		bid = markets.DecimalString("0.41")
		ask = markets.DecimalString("0.43")
	case "0.50":
		bid = markets.DecimalString("0.49")
		ask = markets.DecimalString("0.51")
	case "0.519":
		bid = markets.DecimalString("0.518")
		ask = markets.DecimalString("0.520")
	case "0.52":
		bid = markets.DecimalString("0.519")
		ask = markets.DecimalString("0.521")
	case "0.55":
		bid = markets.DecimalString("0.54")
		ask = markets.DecimalString("0.56")
	}
	bucket := signals.PriceBucket{
		MarketID:     marketID,
		TokenID:      tokenID,
		BucketStart:  start,
		BucketEnd:    end,
		Price:        p,
		BestBid:      &bid,
		BestAsk:      &ask,
		SnapshotHash: "hash-" + price,
		RuleVersion:  signals.RuleVersionP13,
	}
	return bucket
}

func liquidityBucket(marketID, tokenID string, start, end time.Time, totalDepth string) signals.LiquidityBucket {
	epsilon, _ := signals.ParseMicroDecimal("0.01")
	bid := markets.DecimalString(totalDepth)
	ask := markets.DecimalString("0")
	if totalDepth == "100" {
		bid = markets.DecimalString("60")
		ask = markets.DecimalString("40")
	} else if totalDepth == "200" {
		bid = markets.DecimalString("120")
		ask = markets.DecimalString("80")
	}
	return signals.LiquidityBucket{
		MarketID:     marketID,
		TokenID:      tokenID,
		BucketStart:  start,
		BucketEnd:    end,
		TotalDepth:   markets.DecimalString(totalDepth),
		BidDepth:     bid,
		AskDepth:     ask,
		Epsilon:      epsilon,
		SnapshotHash: "liq-hash-" + totalDepth,
		RuleVersion:  signals.RuleVersionP13,
	}
}

func TestLiveSignalCommitRollbackOnEvidenceFailure(t *testing.T) {
	pool := integrationPool(t)
	now := time.Date(2026, 7, 31, 12, 0, 0, 0, time.UTC)
	committer := newLiveCommitter(t, pool, now)
	marketID := "live-signal-market"
	tokenID := "live-signal-token"
	seedCatalogTokenMapping(t, pool, marketID, tokenID)

	seedPriceBucket(t, committer, marketID, tokenID, now.Add(-3*time.Minute), now.Add(-2*time.Minute), "0.40")
	seedPriceBucket(t, committer, marketID, tokenID, now.Add(-2*time.Minute), now.Add(-time.Minute), "0.42")
	beforeObs := countPriceObservations(t, pool, marketID, tokenID)
	beforeSignals := countSignalsForMarket(t, pool, marketID, signals.TypePriceMove)

	committer.TestHook = func(_ context.Context, phase string) error {
		if phase == "before_evidence" {
			return errors.New("injected failure")
		}
		return nil
	}
	bucket := priceBucket(marketID, tokenID, now.Add(-time.Minute), now, "0.55")
	_, err := committer.CommitPriceBucket(context.Background(), bucket)
	if err == nil {
		t.Fatal("expected injected failure")
	}
	if countPriceObservations(t, pool, marketID, tokenID) != beforeObs {
		t.Fatal("rollback must not persist failed bucket observation")
	}
	if countSignalsForMarket(t, pool, marketID, signals.TypePriceMove) != beforeSignals {
		t.Fatal("rollback must not persist partial signal")
	}
	if countEvidenceForMarketSignals(t, pool, marketID) != 0 {
		t.Fatal("rollback must not persist orphan evidence")
	}
}

func TestLiveSignalCommitPersistsObservationOnlyWhenNoSignal(t *testing.T) {
	pool := integrationPool(t)
	now := time.Date(2026, 7, 31, 12, 0, 0, 0, time.UTC)
	committer := newLiveCommitter(t, pool, now)
	marketID := "live-signal-market-obs"
	tokenID := "live-signal-token-obs"
	seedCatalogTokenMapping(t, pool, marketID, tokenID)

	bucket := priceBucket(marketID, tokenID, now.Add(-time.Minute), now, "0.51")
	envelope, err := committer.CommitPriceBucket(context.Background(), bucket)
	if err != nil {
		t.Fatal(err)
	}
	if envelope != nil {
		t.Fatal("expected no signal without reference window")
	}
	store, err := NewObservationStore(pool)
	if err != nil {
		t.Fatal(err)
	}
	rows, err := store.ListPriceObservations(context.Background(), marketID, tokenID, now.Add(-2*time.Minute), 5)
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 1 {
		t.Fatalf("expected one observation row, got %d", len(rows))
	}
	if countSignalsForMarket(t, pool, marketID, signals.TypePriceMove) != 0 {
		t.Fatal("expected no price_move signal")
	}
}

func TestLiveSignalCommitPriceMoveAtomic(t *testing.T) {
	pool := integrationPool(t)
	now := time.Date(2026, 7, 31, 13, 0, 0, 0, time.UTC)
	committer := newLiveCommitter(t, pool, now)
	marketID := "p13c002-price-signal"
	tokenID := "p13c002-price-token"
	seedCatalogTokenMapping(t, pool, marketID, tokenID)

	seedPriceBucket(t, committer, marketID, tokenID, now.Add(-3*time.Minute), now.Add(-2*time.Minute), "0.40")
	seedPriceBucket(t, committer, marketID, tokenID, now.Add(-2*time.Minute), now.Add(-time.Minute), "0.42")
	bucket := priceBucket(marketID, tokenID, now.Add(-time.Minute), now, "0.55")
	envelope, err := committer.CommitPriceBucket(context.Background(), bucket)
	if err != nil {
		t.Fatal(err)
	}
	if envelope == nil {
		t.Fatal("expected price_move signal")
	}
	if envelope.Type != signals.TypePriceMove {
		t.Fatalf("signal type %s", envelope.Type)
	}
	if len(envelope.Evidence) < 2 {
		t.Fatalf("expected evidence rows, got %d", len(envelope.Evidence))
	}
	if countPriceObservations(t, pool, marketID, tokenID) != 3 {
		t.Fatalf("expected 3 price observations")
	}
	if countSignalsForMarket(t, pool, marketID, signals.TypePriceMove) != 1 {
		t.Fatalf("expected one price_move signal")
	}
	if countEvidenceForMarketSignals(t, pool, marketID) != len(envelope.Evidence) {
		t.Fatalf("expected evidence persisted")
	}
}

func TestLiveSignalCommitPriceMoveIdempotentReplay(t *testing.T) {
	pool := integrationPool(t)
	now := time.Date(2026, 7, 31, 14, 0, 0, 0, time.UTC)
	committer := newLiveCommitter(t, pool, now)
	marketID := "p13c002-price-replay"
	tokenID := "p13c002-price-replay-token"
	seedCatalogTokenMapping(t, pool, marketID, tokenID)

	seedPriceBucket(t, committer, marketID, tokenID, now.Add(-3*time.Minute), now.Add(-2*time.Minute), "0.40")
	seedPriceBucket(t, committer, marketID, tokenID, now.Add(-2*time.Minute), now.Add(-time.Minute), "0.42")
	bucket := priceBucket(marketID, tokenID, now.Add(-time.Minute), now, "0.55")
	first, err := committer.CommitPriceBucket(context.Background(), bucket)
	if err != nil || first == nil {
		t.Fatalf("first commit: envelope=%v err=%v", first, err)
	}
	second, err := committer.CommitPriceBucket(context.Background(), bucket)
	if err != nil {
		t.Fatal(err)
	}
	if second == nil {
		t.Fatal("replay should return existing signal envelope")
	}
	if first.IdempotencyKey != second.IdempotencyKey {
		t.Fatalf("idempotency keys differ: %s vs %s", first.IdempotencyKey, second.IdempotencyKey)
	}
	if countSignalsForMarket(t, pool, marketID, signals.TypePriceMove) != 1 {
		t.Fatal("replay must not create duplicate effective signal")
	}
	if countEvidenceForMarketSignals(t, pool, marketID) != len(first.Evidence) {
		t.Fatal("replay must not duplicate evidence rows")
	}
}

func TestLiveSignalCommitPriceMoveConcurrentDuplicate(t *testing.T) {
	pool := integrationPool(t)
	now := time.Date(2026, 7, 31, 15, 0, 0, 0, time.UTC)
	committer := newLiveCommitter(t, pool, now)
	marketID := "p13c002-price-concurrent"
	tokenID := "p13c002-price-concurrent-token"
	seedCatalogTokenMapping(t, pool, marketID, tokenID)

	seedPriceBucket(t, committer, marketID, tokenID, now.Add(-3*time.Minute), now.Add(-2*time.Minute), "0.40")
	seedPriceBucket(t, committer, marketID, tokenID, now.Add(-2*time.Minute), now.Add(-time.Minute), "0.42")
	bucket := priceBucket(marketID, tokenID, now.Add(-time.Minute), now, "0.55")

	var wg sync.WaitGroup
	errs := make([]error, 8)
	envelopes := make([]*markets.SignalEnvelope, 8)
	for i := range errs {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			envelopes[idx], errs[idx] = committer.CommitPriceBucket(context.Background(), bucket)
		}(i)
	}
	wg.Wait()
	for i, err := range errs {
		if err != nil {
			t.Fatalf("goroutine %d: %v", i, err)
		}
		if envelopes[i] == nil {
			t.Fatalf("goroutine %d: nil envelope", i)
		}
	}
	key := envelopes[0].IdempotencyKey
	for i := 1; i < len(envelopes); i++ {
		if envelopes[i].IdempotencyKey != key {
			t.Fatalf("idempotency key mismatch at %d", i)
		}
	}
	if countSignalsForMarket(t, pool, marketID, signals.TypePriceMove) != 1 {
		t.Fatal("concurrent commits must yield one logical signal")
	}
}

func TestLiveSignalCommitPriceThresholdBoundary(t *testing.T) {
	pool := integrationPool(t)
	now := time.Date(2026, 7, 31, 16, 0, 0, 0, time.UTC)
	committer := newLiveCommitter(t, pool, now)
	marketID := "p13c002-price-boundary"
	tokenID := "p13c002-price-boundary-token"
	seedCatalogTokenMapping(t, pool, marketID, tokenID)

	seedPriceBucket(t, committer, marketID, tokenID, now.Add(-3*time.Minute), now.Add(-2*time.Minute), "0.50")
	seedPriceBucket(t, committer, marketID, tokenID, now.Add(-2*time.Minute), now.Add(-time.Minute), "0.50")

	below := priceBucket(marketID, tokenID, now.Add(-time.Minute), now, "0.519")
	envelope, err := committer.CommitPriceBucket(context.Background(), below)
	if err != nil {
		t.Fatal(err)
	}
	if envelope != nil {
		t.Fatal("sub-threshold move must not emit signal")
	}
	if countSignalsForMarket(t, pool, marketID, signals.TypePriceMove) != 0 {
		t.Fatal("unexpected signal below threshold")
	}

	exactNow := now.Add(2 * time.Minute)
	exactStart := exactNow.Add(-time.Minute)
	seedPriceBucket(t, committer, marketID, tokenID, now.Add(-time.Minute), now, "0.50")
	seedPriceBucket(t, committer, marketID, tokenID, now, exactStart, "0.50")
	exact := priceBucket(marketID, tokenID, exactStart, exactNow, "0.52")
	envelope, err = committer.CommitPriceBucket(context.Background(), exact)
	if err != nil {
		t.Fatal(err)
	}
	if envelope == nil {
		t.Fatal("exact threshold move must emit signal")
	}
}

func TestLiveSignalCommitLiquidityChangeAtomic(t *testing.T) {
	pool := integrationPool(t)
	now := time.Date(2026, 7, 31, 17, 0, 0, 0, time.UTC)
	committer := newLiveCommitter(t, pool, now)
	marketID := "p13c002-liq-signal"
	tokenID := "p13c002-liq-token"
	seedCatalogTokenMapping(t, pool, marketID, tokenID)

	seedLiquidityBucket(t, committer, marketID, tokenID, now.Add(-3*time.Minute), now.Add(-2*time.Minute), "100")
	seedLiquidityBucket(t, committer, marketID, tokenID, now.Add(-2*time.Minute), now.Add(-time.Minute), "100")
	bucket := liquidityBucket(marketID, tokenID, now.Add(-time.Minute), now, "200")
	envelope, err := committer.CommitLiquidityBucket(context.Background(), bucket)
	if err != nil {
		t.Fatal(err)
	}
	if envelope == nil {
		t.Fatal("expected liquidity_change signal")
	}
	if envelope.Type != signals.TypeLiquidityChange {
		t.Fatalf("signal type %s", envelope.Type)
	}
	if countLiquidityObservations(t, pool, marketID, tokenID) != 3 {
		t.Fatalf("expected 3 liquidity observations")
	}
	if countSignalsForMarket(t, pool, marketID, signals.TypeLiquidityChange) != 1 {
		t.Fatal("expected one liquidity_change signal")
	}
	if countEvidenceForMarketSignals(t, pool, marketID) != len(envelope.Evidence) {
		t.Fatal("expected evidence persisted")
	}
}

func TestLiveSignalCommitLiquidityIdempotentReplay(t *testing.T) {
	pool := integrationPool(t)
	now := time.Date(2026, 7, 31, 18, 0, 0, 0, time.UTC)
	committer := newLiveCommitter(t, pool, now)
	marketID := "p13c002-liq-replay"
	tokenID := "p13c002-liq-replay-token"
	seedCatalogTokenMapping(t, pool, marketID, tokenID)

	seedLiquidityBucket(t, committer, marketID, tokenID, now.Add(-3*time.Minute), now.Add(-2*time.Minute), "100")
	seedLiquidityBucket(t, committer, marketID, tokenID, now.Add(-2*time.Minute), now.Add(-time.Minute), "100")
	bucket := liquidityBucket(marketID, tokenID, now.Add(-time.Minute), now, "200")
	first, err := committer.CommitLiquidityBucket(context.Background(), bucket)
	if err != nil || first == nil {
		t.Fatalf("first commit: envelope=%v err=%v", first, err)
	}
	second, err := committer.CommitLiquidityBucket(context.Background(), bucket)
	if err != nil {
		t.Fatal(err)
	}
	if second == nil || second.IdempotencyKey != first.IdempotencyKey {
		t.Fatal("replay must return same idempotency key")
	}
	if countSignalsForMarket(t, pool, marketID, signals.TypeLiquidityChange) != 1 {
		t.Fatal("replay must not duplicate liquidity signal")
	}
}

func seedPriceBucket(t *testing.T, committer *LiveSignalCommitter, marketID, tokenID string, start, end time.Time, price string) {
	t.Helper()
	bucket := priceBucket(marketID, tokenID, start, end, price)
	if _, err := committer.CommitPriceBucket(context.Background(), bucket); err != nil {
		t.Fatalf("seed price bucket %s: %v", price, err)
	}
}

func seedLiquidityBucket(t *testing.T, committer *LiveSignalCommitter, marketID, tokenID string, start, end time.Time, totalDepth string) {
	t.Helper()
	bucket := liquidityBucket(marketID, tokenID, start, end, totalDepth)
	if _, err := committer.CommitLiquidityBucket(context.Background(), bucket); err != nil {
		t.Fatalf("seed liquidity bucket %s: %v", totalDepth, err)
	}
}
