package marketdata

import (
	"context"
	"fmt"
	"log/slog"
	"math"
	"time"

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
				"source":      tick.Source,
			},
			DedupeKey: fmt.Sprintf("candle:%s:%d:%d", tick.FeedID, interval, bucket.Unix()),
		})
		if err != nil {
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

func bucketStart(ts time.Time, intervalSec int32) time.Time {
	unix := ts.UTC().Unix()
	step := int64(math.Max(1, float64(intervalSec)))
	bucketUnix := unix - (unix % step)
	return time.Unix(bucketUnix, 0).UTC()
}
