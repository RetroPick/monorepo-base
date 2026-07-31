package postgres

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/dbqueries"
	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/signals"
)

// LiveSignalCommitter atomically persists observations, signals, and evidence.
type LiveSignalCommitter struct {
	pool     *pgxpool.Pool
	engine   *signals.Engine
	priceCfg signals.PriceRuleConfig
	liqCfg   signals.LiquidityRuleConfig
	now      func() time.Time
	// TestHook runs inside the transaction before evidence insert; return error to force rollback.
	TestHook func(ctx context.Context, phase string) error
}

func NewLiveSignalCommitter(pool *pgxpool.Pool, engine *signals.Engine, bucket time.Duration, now func() time.Time) (*LiveSignalCommitter, error) {
	if pool == nil || engine == nil {
		return nil, fmt.Errorf("live signal committer: pool and engine required")
	}
	if now == nil {
		now = time.Now
	}
	return &LiveSignalCommitter{
		pool:     pool,
		engine:   engine,
		priceCfg: signals.DefaultPriceRuleConfig(bucket),
		liqCfg:   signals.DefaultLiquidityRuleConfig(bucket),
		now:      now,
	}, nil
}

func (c *LiveSignalCommitter) CommitPriceBucket(ctx context.Context, bucket signals.PriceBucket) (*markets.SignalEnvelope, error) {
	tx, err := c.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	q := dbqueries.New(tx)
	expiresAt := c.now().Add(7 * 24 * time.Hour)
	if err := upsertPriceObservation(ctx, q, bucket, expiresAt); err != nil {
		return nil, err
	}
	refRows, err := q.ListMarketsPriceObservations(ctx, dbqueries.ListMarketsPriceObservationsParams{
		MarketID:  bucket.MarketID,
		TokenID:   bucket.TokenID,
		BucketEnd: requiredTimestamptz(bucket.BucketStart.Add(-c.priceCfg.ReferenceWindow)),
		Limit:     int32(c.priceCfg.MinObservations + 2),
	})
	if err != nil {
		return nil, err
	}
	priorRows := priorPriceRows(refRows, bucket.BucketEnd)
	if len(priorRows) < c.priceCfg.MinObservations {
		if err := tx.Commit(ctx); err != nil {
			return nil, err
		}
		return nil, nil
	}
	reference := priceRowToBucket(priorRows[0])
	deltaPP, err := signals.DeltaProbabilityPoints(bucket.Price, reference.Price)
	if err != nil {
		if err := tx.Commit(ctx); err != nil {
			return nil, err
		}
		return nil, nil
	}
	emit, direction := signals.EvaluatePriceMove(deltaPP, c.priceCfg, "")
	if !emit {
		if err := tx.Commit(ctx); err != nil {
			return nil, err
		}
		return nil, nil
	}
	threshold := markets.DecimalString(c.priceCfg.ThresholdOnMicroPP.CanonicalString())
	observation, err := signals.BuildPriceMoveObservation(bucket, reference, threshold, deltaPP, direction)
	if err != nil {
		return nil, err
	}
	envelope, err := c.engine.Evaluate(observation)
	if err != nil || envelope == nil {
		return nil, err
	}
	envelope.IdempotencyKey = signals.PriceMoveIdempotencyKey(
		signals.RuleVersionP13, bucket.MarketID, bucket.TokenID, bucket.BucketEnd, direction, c.priceCfg.ThresholdOnMicroPP,
	)
	envelope.ID = "signal:" + envelope.IdempotencyKey
	if c.TestHook != nil {
		if err := c.TestHook(ctx, "before_evidence"); err != nil {
			return nil, err
		}
	}
	if err := upsertSignalTx(ctx, q, *envelope); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return envelope, nil
}

func (c *LiveSignalCommitter) CommitLiquidityBucket(ctx context.Context, bucket signals.LiquidityBucket) (*markets.SignalEnvelope, error) {
	tx, err := c.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	q := dbqueries.New(tx)
	expiresAt := c.now().Add(7 * 24 * time.Hour)
	if err := upsertLiquidityObservation(ctx, q, bucket, expiresAt); err != nil {
		return nil, err
	}
	refRows, err := q.ListMarketsLiquidityObservations(ctx, dbqueries.ListMarketsLiquidityObservationsParams{
		MarketID:  bucket.MarketID,
		TokenID:   bucket.TokenID,
		BucketEnd: requiredTimestamptz(bucket.BucketStart.Add(-c.liqCfg.ReferenceWindow)),
		Limit:     int32(c.liqCfg.MinObservations + 2),
	})
	if err != nil {
		return nil, err
	}
	priorRows := priorLiquidityRows(refRows, bucket.BucketEnd)
	if len(priorRows) < c.liqCfg.MinObservations {
		if err := tx.Commit(ctx); err != nil {
			return nil, err
		}
		return nil, nil
	}
	reference := liquidityRowToBucket(priorRows[0])
	change, err := signals.RelativeDepthChange(bucket.TotalDepth, reference.TotalDepth, c.liqCfg.DepthFloorMicro)
	if err != nil {
		if err := tx.Commit(ctx); err != nil {
			return nil, err
		}
		return nil, nil
	}
	emit, direction := signals.EvaluateLiquidityChange(change, c.liqCfg, "")
	if !emit {
		if err := tx.Commit(ctx); err != nil {
			return nil, err
		}
		return nil, nil
	}
	threshold := markets.DecimalString(c.liqCfg.ThresholdOnMicro.CanonicalString())
	observation, err := signals.BuildLiquidityChangeObservation(bucket, reference, threshold, change, direction)
	if err != nil {
		return nil, err
	}
	envelope, err := c.engine.Evaluate(observation)
	if err != nil || envelope == nil {
		return nil, err
	}
	envelope.IdempotencyKey = signals.LiquidityChangeIdempotencyKey(
		signals.RuleVersionP13, bucket.MarketID, bucket.TokenID, bucket.BucketEnd, direction, c.liqCfg.ThresholdOnMicro, bucket.Epsilon,
	)
	envelope.ID = "signal:" + envelope.IdempotencyKey
	if c.TestHook != nil {
		if err := c.TestHook(ctx, "before_evidence"); err != nil {
			return nil, err
		}
	}
	if err := upsertSignalTx(ctx, q, *envelope); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return envelope, nil
}

func upsertPriceObservation(ctx context.Context, q *dbqueries.Queries, bucket signals.PriceBucket, expiresAt time.Time) error {
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
	return q.UpsertMarketsPriceObservation(ctx, dbqueries.UpsertMarketsPriceObservationParams{
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

func upsertLiquidityObservation(ctx context.Context, q *dbqueries.Queries, bucket signals.LiquidityBucket, expiresAt time.Time) error {
	var spread pgtype.Text
	if bucket.Spread != nil {
		spread = pgtype.Text{String: string(*bucket.Spread), Valid: true}
	}
	return q.UpsertMarketsLiquidityObservation(ctx, dbqueries.UpsertMarketsLiquidityObservationParams{
		MarketID:     bucket.MarketID,
		TokenID:      bucket.TokenID,
		BucketStart:  requiredTimestamptz(bucket.BucketStart),
		BucketEnd:    requiredTimestamptz(bucket.BucketEnd),
		TotalDepth:   string(bucket.TotalDepth),
		BidDepth:     string(bucket.BidDepth),
		AskDepth:     string(bucket.AskDepth),
		Spread:       spread,
		Epsilon:      bucket.Epsilon.CanonicalString(),
		SnapshotHash: bucket.SnapshotHash,
		RuleVersion:  bucket.RuleVersion,
		ExpiresAt:    requiredTimestamptz(expiresAt),
	})
}

func upsertSignalTx(ctx context.Context, q *dbqueries.Queries, envelope markets.SignalEnvelope) error {
	var expiresAt pgtype.Timestamptz
	if envelope.ExpiresAt != nil {
		expiresAt = requiredTimestamptz(*envelope.ExpiresAt)
	}
	var retractedAt pgtype.Timestamptz
	if envelope.RetractedAt != nil {
		retractedAt = requiredTimestamptz(*envelope.RetractedAt)
	}
	reasonCodes, err := json.Marshal(envelope.ReasonCodes)
	if err != nil {
		return err
	}
	row, err := q.UpsertMarketsSignal(ctx, dbqueries.UpsertMarketsSignalParams{
		SignalID:       envelope.ID,
		SignalType:     envelope.Type,
		MarketID:       envelope.MarketID,
		State:          envelope.State,
		RuleVersion:    envelope.RuleVersion,
		ReasonCodes:    reasonCodes,
		IdempotencyKey: envelope.IdempotencyKey,
		CreatedAt:      requiredTimestamptz(envelope.CreatedAt),
		ExpiresAt:      expiresAt,
		RetractedAt:    retractedAt,
	})
	if err != nil {
		return err
	}
	for index, evidence := range envelope.Evidence {
		if err := q.InsertMarketsSignalEvidence(ctx, dbqueries.InsertMarketsSignalEvidenceParams{
			SignalID:      row.SignalID,
			EvidenceIndex: int32(index),
			Kind:          evidence.Kind,
			ReferenceID:   evidence.ReferenceID,
			ObservedAt:    requiredTimestamptz(evidence.ObservedAt),
			ContentHash:   evidence.ContentHash,
		}); err != nil {
			return err
		}
	}
	return nil
}

func priceRowToBucket(row dbqueries.ListMarketsPriceObservationsRow) signals.PriceBucket {
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
	return bucket
}

func priorPriceRows(rows []dbqueries.ListMarketsPriceObservationsRow, currentEnd time.Time) []dbqueries.ListMarketsPriceObservationsRow {
	out := make([]dbqueries.ListMarketsPriceObservationsRow, 0, len(rows))
	for _, row := range rows {
		if timestamptzValue(row.BucketEnd).Equal(currentEnd) {
			continue
		}
		out = append(out, row)
	}
	return out
}

func priorLiquidityRows(rows []dbqueries.ListMarketsLiquidityObservationsRow, currentEnd time.Time) []dbqueries.ListMarketsLiquidityObservationsRow {
	out := make([]dbqueries.ListMarketsLiquidityObservationsRow, 0, len(rows))
	for _, row := range rows {
		if timestamptzValue(row.BucketEnd).Equal(currentEnd) {
			continue
		}
		out = append(out, row)
	}
	return out
}

func liquidityRowToBucket(row dbqueries.ListMarketsLiquidityObservationsRow) signals.LiquidityBucket {
	epsilon, _ := signals.ParseMicroDecimal(row.Epsilon)
	bucket := signals.LiquidityBucket{
		MarketID:     row.MarketID,
		TokenID:      row.TokenID,
		BucketStart:  timestamptzValue(row.BucketStart),
		BucketEnd:    timestamptzValue(row.BucketEnd),
		TotalDepth:   markets.DecimalString(row.TotalDepth),
		BidDepth:     markets.DecimalString(row.BidDepth),
		AskDepth:     markets.DecimalString(row.AskDepth),
		Epsilon:      epsilon,
		SnapshotHash: row.SnapshotHash,
		RuleVersion:  row.RuleVersion,
	}
	if row.Spread.Valid {
		v := markets.DecimalString(row.Spread.String)
		bucket.Spread = &v
	}
	return bucket
}
