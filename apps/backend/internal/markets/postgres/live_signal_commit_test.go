package postgres

import (
	"context"
	"errors"
	"testing"
	"time"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/signals"
)

func TestLiveSignalCommitRollbackOnEvidenceFailure(t *testing.T) {
	pool := integrationPool(t)
	now := time.Date(2026, 7, 31, 12, 0, 0, 0, time.UTC)
	engine := signals.NewEngine(signals.EngineConfig{Now: func() time.Time { return now }})
	committer, err := NewLiveSignalCommitter(pool, engine, time.Minute, func() time.Time { return now })
	if err != nil {
		t.Fatal(err)
	}
	marketID := "live-signal-market"
	tokenID := "live-signal-token"
	seedCatalogTokenMapping(t, pool, marketID, tokenID)
	committer.TestHook = nil
	seedPriceBucket(t, committer, marketID, tokenID, now.Add(-3*time.Minute), now.Add(-2*time.Minute), "0.40")
	seedPriceBucket(t, committer, marketID, tokenID, now.Add(-2*time.Minute), now.Add(-time.Minute), "0.42")
	committer.TestHook = func(_ context.Context, phase string) error {
		if phase == "before_evidence" {
			return errors.New("injected failure")
		}
		return nil
	}
	bucket := signals.PriceBucket{
		MarketID:     marketID,
		TokenID:      tokenID,
		BucketStart:  now.Add(-time.Minute),
		BucketEnd:    now,
		Price:        markets.DecimalString("0.55"),
		SnapshotHash: "hash-1",
		RuleVersion:  signals.RuleVersionP13,
	}
	bid := markets.DecimalString("0.54")
	ask := markets.DecimalString("0.56")
	bucket.BestBid = &bid
	bucket.BestAsk = &ask
	_, err = committer.CommitPriceBucket(context.Background(), bucket)
	if err == nil {
		t.Fatal("expected injected failure")
	}
}

func TestLiveSignalCommitPersistsObservationOnlyWhenNoSignal(t *testing.T) {
	pool := integrationPool(t)
	now := time.Date(2026, 7, 31, 12, 0, 0, 0, time.UTC)
	engine := signals.NewEngine(signals.EngineConfig{Now: func() time.Time { return now }})
	committer, err := NewLiveSignalCommitter(pool, engine, time.Minute, func() time.Time { return now })
	if err != nil {
		t.Fatal(err)
	}
	marketID := "live-signal-market-obs"
	tokenID := "live-signal-token-obs"
	seedCatalogTokenMapping(t, pool, marketID, tokenID)
	bucket := signals.PriceBucket{
		MarketID:     marketID,
		TokenID:      tokenID,
		BucketStart:  now.Add(-time.Minute),
		BucketEnd:    now,
		Price:        markets.DecimalString("0.51"),
		SnapshotHash: "hash-only",
		RuleVersion:  signals.RuleVersionP13,
	}
	bid := markets.DecimalString("0.50")
	ask := markets.DecimalString("0.52")
	bucket.BestBid = &bid
	bucket.BestAsk = &ask
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
}

func seedPriceBucket(t *testing.T, committer *LiveSignalCommitter, marketID, tokenID string, start, end time.Time, price string) {
	t.Helper()
	p := markets.DecimalString(price)
	bid := markets.DecimalString("0.40")
	ask := markets.DecimalString("0.42")
	if price == "0.40" {
		bid = markets.DecimalString("0.39")
		ask = markets.DecimalString("0.41")
	} else if price == "0.42" {
		bid = markets.DecimalString("0.41")
		ask = markets.DecimalString("0.43")
	} else if price == "0.55" {
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
	if _, err := committer.CommitPriceBucket(context.Background(), bucket); err != nil {
		t.Fatalf("seed bucket %s: %v", price, err)
	}
}
