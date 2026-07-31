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
	committer.TestHook = func(_ context.Context, phase string) error {
		if phase == "before_evidence" {
			return errors.New("injected failure")
		}
		return nil
	}
	marketID := "live-signal-market"
	tokenID := "live-signal-token"
	seedCatalogTokenMapping(t, pool, marketID, tokenID)
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
