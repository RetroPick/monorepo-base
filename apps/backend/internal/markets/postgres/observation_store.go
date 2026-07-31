package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"retropick/apps/backend/internal/dbqueries"
	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/signals"
)

// ObservationStore persists price observation buckets.
type ObservationStore struct {
	queries *dbqueries.Queries
}

func NewObservationStore(database dbqueries.DBTX) (*ObservationStore, error) {
	if database == nil {
		return nil, fmt.Errorf("observation store: database required")
	}
	return &ObservationStore{queries: dbqueries.New(database)}, nil
}

func (s *ObservationStore) UpsertPriceObservation(ctx context.Context, bucket signals.PriceBucket, expiresAt time.Time) error {
	var bestBid, bestAsk, spread pgtype.Text
	if bucket.BestBid != nil {
		bestBid = pgtype.Text{String: string(*bucket.BestBid), Valid: true}
	}
	if bucket.BestAsk != nil {
		bestAsk = pgtype.Text{String: string(*bucket.BestAsk), Valid: true}
	}
	if bucket.Spread != nil {
		spread = pgtype.Text{String: string(*bucket.Spread), Valid: true}
	}
	return s.queries.UpsertMarketsPriceObservation(ctx, dbqueries.UpsertMarketsPriceObservationParams{
		MarketID:     bucket.MarketID,
		TokenID:      bucket.TokenID,
		BucketStart:  requiredTimestamptz(bucket.BucketStart),
		BucketEnd:    requiredTimestamptz(bucket.BucketEnd),
		Price:        string(bucket.Price),
		BestBid:      bestBid,
		BestAsk:      bestAsk,
		Spread:       spread,
		SnapshotHash: bucket.SnapshotHash,
		RuleVersion:  bucket.RuleVersion,
		ExpiresAt:    requiredTimestamptz(expiresAt),
	})
}

func (s *ObservationStore) ListPriceObservations(ctx context.Context, marketID, tokenID string, since time.Time, limit int32) ([]signals.PriceBucket, error) {
	rows, err := s.queries.ListMarketsPriceObservations(ctx, dbqueries.ListMarketsPriceObservationsParams{
		MarketID:  marketID,
		TokenID:   tokenID,
		BucketEnd: requiredTimestamptz(since),
		Limit:     limit,
	})
	if err != nil {
		return nil, err
	}
	out := make([]signals.PriceBucket, 0, len(rows))
	for _, row := range rows {
		bucket := signals.PriceBucket{
			MarketID:     row.MarketID,
			TokenID:      row.TokenID,
			BucketStart:  timestamptzValue(row.BucketStart),
			BucketEnd:    timestamptzValue(row.BucketEnd),
			Price:        markets.DecimalString(row.Price),
			SnapshotHash: row.SnapshotHash,
			RuleVersion:  row.RuleVersion,
		}
		if row.BestBid.Valid {
			v := markets.DecimalString(row.BestBid.String)
			bucket.BestBid = &v
		}
		if row.BestAsk.Valid {
			v := markets.DecimalString(row.BestAsk.String)
			bucket.BestAsk = &v
		}
		if row.Spread.Valid {
			v := markets.DecimalString(row.Spread.String)
			bucket.Spread = &v
		}
		out = append(out, bucket)
	}
	return out, nil
}
