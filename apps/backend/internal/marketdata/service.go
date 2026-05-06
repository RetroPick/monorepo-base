package marketdata

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"math"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/realtime"
)

var defaultIntervals = []int32{60, 300, 900, 3600, 86400}

type Tick struct {
	FeedID  string
	PriceE8 int64
	Source  string
	SeenAt  time.Time
}

type Service struct {
	pool      *pgxpool.Pool
	logger    *slog.Logger
	intervals []int32
}

type ProjectionSnapshot struct {
	TemplateID          []byte
	Slug                string
	MarketType          int16
	Initialized         bool
	ExecutionMode       int16
	RollingPhase        int16
	RollingHaltReason   int16
	ActiveEpochID       int64
	LastResolvedEpochID *int64
	RollingNextEpochID  *int64
	HaltedAtEpochID     *int64
	Status              string
	TotalPool           string
	Volume              string
	OutcomeCount        int16
	LastEventSeq        *int64
	LastIndexedBlock    int64
	UpdatedAt           time.Time
	Outcomes            []map[string]any
}

func NewService(pool *pgxpool.Pool, logger *slog.Logger) *Service {
	if logger == nil {
		logger = slog.Default()
	}
	return &Service{pool: pool, logger: logger, intervals: defaultIntervals}
}

func (s *Service) IngestTick(ctx context.Context, tick Tick) error {
	if tick.FeedID == "" || tick.PriceE8 <= 0 {
		return fmt.Errorf("invalid tick")
	}
	if tick.SeenAt.IsZero() {
		tick.SeenAt = time.Now().UTC()
	}
	for _, interval := range s.intervals {
		bucket := bucketStart(tick.SeenAt, interval)
		tx, err := s.pool.Begin(ctx)
		if err != nil {
			return err
		}
		_, err = tx.Exec(ctx, `
INSERT INTO price_candles (feed_id, interval_sec, bucket_start, open_e8, high_e8, low_e8, close_e8, source, sample_count)
VALUES ($1,$2,$3,$4,$4,$4,$4,$5,1)
ON CONFLICT (feed_id, interval_sec, bucket_start) DO UPDATE
SET high_e8 = GREATEST(price_candles.high_e8, EXCLUDED.high_e8),
    low_e8 = LEAST(price_candles.low_e8, EXCLUDED.low_e8),
    close_e8 = EXCLUDED.close_e8,
    source = EXCLUDED.source,
    sample_count = price_candles.sample_count + 1,
    updated_at = NOW()
`, tick.FeedID, interval, bucket, tick.PriceE8, tick.Source)
		if err != nil {
			tx.Rollback(ctx)
			return err
		}
		seq, inserted, err := realtime.Insert(ctx, tx, realtime.InsertEvent{
			Channel: fmt.Sprintf("chart:%s:%d", tick.FeedID, interval),
			Type:    "candle_updated",
			Scope:   "public",
			Payload: map[string]any{
				"feedId":      tick.FeedID,
				"intervalSec": interval,
				"bucketStart": bucket.UTC().Format(time.RFC3339),
				"closeE8":     fmt.Sprintf("%d", tick.PriceE8),
				"source":      tick.Source,
			},
			DedupeKey: candleEventDedupeKey(tick.FeedID, interval, tick.SeenAt),
		})
		if err != nil {
			tx.Rollback(ctx)
			return err
		}
		if _, _, err := realtime.Insert(ctx, tx, realtime.InsertEvent{
			Channel: fmt.Sprintf("chart:%s", tick.FeedID),
			Type:    "price_tick",
			Scope:   "public",
			Payload: map[string]any{
				"feedId":   tick.FeedID,
				"priceE8":  fmt.Sprintf("%d", tick.PriceE8),
				"seenAt":   tick.SeenAt.UTC().Format(time.RFC3339),
				"source":   tick.Source,
				"interval": interval,
			},
			DedupeKey: fmt.Sprintf("tick:%s:%d:%d", tick.FeedID, interval, tick.SeenAt.UTC().UnixNano()),
		}); err != nil {
			tx.Rollback(ctx)
			return err
		}
		if err := tx.Commit(ctx); err != nil {
			return err
		}
		if inserted {
			_ = realtime.Notify(ctx, s.pool, seq)
		}
	}
	return nil
}

func candleEventDedupeKey(feedID string, interval int32, seenAt time.Time) string {
	return fmt.Sprintf("candle:%s:%d:%d", feedID, interval, seenAt.UTC().UnixNano())
}

func bucketStart(ts time.Time, intervalSec int32) time.Time {
	unix := ts.UTC().Unix()
	step := int64(math.Max(1, float64(intervalSec)))
	bucketUnix := unix - (unix % step)
	return time.Unix(bucketUnix, 0).UTC()
}

func (s *Service) ListProjectionSnapshots(ctx context.Context) (map[string]ProjectionSnapshot, error) {
	rows, err := s.pool.Query(ctx, `
SELECT
    template_id, slug, market_type, initialized, execution_mode, rolling_phase, rolling_halt_reason,
    active_epoch_id, last_resolved_epoch_id, rolling_next_epoch_id, halted_at_epoch_id,
    status, total_pool::text, volume::text, outcome_count, outcomes_json::text, last_event_seq,
    last_indexed_block, updated_at
FROM market_read_models
`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]ProjectionSnapshot{}
	for rows.Next() {
		snap, err := scanProjectionSnapshot(rows)
		if err != nil {
			return nil, err
		}
		out[fmt.Sprintf("%x", snap.TemplateID)] = snap
	}
	return out, rows.Err()
}

func (s *Service) GetProjectionSnapshot(ctx context.Context, templateID []byte) (ProjectionSnapshot, error) {
	rows, err := s.pool.Query(ctx, `
SELECT
    template_id, slug, market_type, initialized, execution_mode, rolling_phase, rolling_halt_reason,
    active_epoch_id, last_resolved_epoch_id, rolling_next_epoch_id, halted_at_epoch_id,
    status, total_pool::text, volume::text, outcome_count, outcomes_json::text, last_event_seq,
    last_indexed_block, updated_at
FROM market_read_models
WHERE template_id = $1
`, templateID)
	if err != nil {
		return ProjectionSnapshot{}, err
	}
	defer rows.Close()
	if !rows.Next() {
		return ProjectionSnapshot{}, pgx.ErrNoRows
	}
	return scanProjectionSnapshot(rows)
}

func (s *Service) LoadProjectionOutcomes(ctx context.Context, templateID []byte, epochID int64) ([]map[string]any, int64, error) {
	rows, err := s.pool.Query(ctx, `
SELECT outcome_index, pool_amount::text, probability_bps, multiplier_bps, updated_block
FROM market_epoch_outcomes
WHERE template_id = $1 AND epoch_id = $2
ORDER BY outcome_index
`, templateID, epochID)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	outcomes := []map[string]any{}
	var maxBlock int64
	for rows.Next() {
		var idx int16
		var amount string
		var prob, mult int32
		var updatedBlock int64
		if err := rows.Scan(&idx, &amount, &prob, &mult, &updatedBlock); err != nil {
			return nil, 0, err
		}
		if updatedBlock > maxBlock {
			maxBlock = updatedBlock
		}
		outcomes = append(outcomes, map[string]any{
			"outcomeIndex":         idx,
			"poolSize":             amount,
			"impliedProbabilityE6": fmt.Sprintf("%d", prob*100),
			"displayPercentE4":     fmt.Sprintf("%d", prob),
			"multiplierBps":        fmt.Sprintf("%d", mult),
			"grossPayoutXe6":       fmt.Sprintf("%d", mult*100),
			"updatedBlock":         updatedBlock,
		})
	}
	return outcomes, maxBlock, rows.Err()
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanProjectionSnapshot(row rowScanner) (ProjectionSnapshot, error) {
	var snap ProjectionSnapshot
	var outcomesText string
	var lastResolved, rollingNext, haltedAt, lastEvent pgtype.Int8
	if err := row.Scan(
		&snap.TemplateID,
		&snap.Slug,
		&snap.MarketType,
		&snap.Initialized,
		&snap.ExecutionMode,
		&snap.RollingPhase,
		&snap.RollingHaltReason,
		&snap.ActiveEpochID,
		&lastResolved,
		&rollingNext,
		&haltedAt,
		&snap.Status,
		&snap.TotalPool,
		&snap.Volume,
		&snap.OutcomeCount,
		&outcomesText,
		&lastEvent,
		&snap.LastIndexedBlock,
		&snap.UpdatedAt,
	); err != nil {
		return ProjectionSnapshot{}, err
	}
	if lastResolved.Valid {
		snap.LastResolvedEpochID = &lastResolved.Int64
	}
	if rollingNext.Valid {
		snap.RollingNextEpochID = &rollingNext.Int64
	}
	if haltedAt.Valid {
		snap.HaltedAtEpochID = &haltedAt.Int64
	}
	if lastEvent.Valid {
		snap.LastEventSeq = &lastEvent.Int64
	}
	if outcomesText != "" {
		if err := json.Unmarshal([]byte(outcomesText), &snap.Outcomes); err != nil {
			return ProjectionSnapshot{}, err
		}
	}
	if snap.Outcomes == nil {
		snap.Outcomes = []map[string]any{}
	}
	return snap, nil
}
