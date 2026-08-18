package keeper

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) ClaimDueJob(ctx context.Context, workerID string, now time.Time) (*Job, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	row := tx.QueryRow(ctx, `
SELECT id, action, template_id, epoch_id, scheduled_at, window_end_at, attempt_count
FROM keeper_schedule
WHERE status = 'pending' AND scheduled_at <= $1
ORDER BY scheduled_at ASC, id ASC
FOR UPDATE SKIP LOCKED
LIMIT 1
`, now)

	var job Job
	var action string
	var epochID pgtype.Int8
	var scheduledAt pgtype.Timestamptz
	var windowEndAt pgtype.Timestamptz
	if err := row.Scan(&job.ID, &action, &job.TemplateID, &epochID, &scheduledAt, &windowEndAt, &job.AttemptCount); err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	job.Action = Action(action)
	job.ScheduledAt = scheduledAt.Time.UTC()
	job.WindowEndAt = windowEndAt.Time.UTC()
	if epochID.Valid {
		value := epochID.Int64
		job.EpochID = &value
	}

	if _, err := tx.Exec(ctx, `
UPDATE keeper_schedule
SET status = 'claimed',
    claimed_by = $2,
    claimed_at = $3,
    attempt_count = attempt_count + 1
WHERE id = $1
`, job.ID, workerID, now); err != nil {
		return nil, err
	}
	job.AttemptCount++
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &job, nil
}

func (r *PostgresRepository) InsertExecution(ctx context.Context, record ExecutionRecord) error {
	_, err := r.pool.Exec(ctx, `
INSERT INTO keeper_executions (
    schedule_id, action, template_id, epoch_id, result, tx_hash, error_message,
    started_at, submitted_at, mined_at, gas_used, receipt_json, chain_id, nonce, preflight_snapshot
)
VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), NULLIF($7, ''), NULLIF($8, TIMESTAMPTZ '0001-01-01'),
        NULLIF($9, TIMESTAMPTZ '0001-01-01'), NULLIF($10, TIMESTAMPTZ '0001-01-01'), NULLIF($11, 0),
        $12::jsonb, NULLIF($13, 0), NULLIF($14, 0), $15::jsonb)
`, record.ScheduleID, string(record.Action), record.TemplateID, nullableInt64(record.EpochID), string(record.Result), record.TxHash,
		record.ErrorMessage, nullableTime(record.StartedAt), nullableTime(record.SubmittedAt), nullableTime(record.MinedAt),
		nullableUint64(record.GasUsed), defaultJSON(record.ReceiptJSON), nullableInt64Value(record.ChainID), nullableUint64(record.Nonce), defaultJSON(record.PreflightSnapshot))
	return err
}

func (r *PostgresRepository) MarkCompleted(ctx context.Context, params CompleteParams) error {
	_, err := r.pool.Exec(ctx, `
UPDATE keeper_schedule
SET status = 'completed',
    tx_hash = $2,
    last_error = NULL,
    claimed_by = NULL,
    claimed_at = NULL
WHERE id = $1
`, params.JobID, params.TxHash)
	return err
}

func (r *PostgresRepository) MarkRetry(ctx context.Context, params RetryParams) error {
	_, err := r.pool.Exec(ctx, `
UPDATE keeper_schedule
SET status = 'pending',
    scheduled_at = $2,
    last_error = $3,
    claimed_by = NULL,
    claimed_at = NULL
WHERE id = $1
`, params.JobID, params.NextScheduledAt, params.LastError)
	return err
}

func (r *PostgresRepository) MarkExpired(ctx context.Context, params ExpireParams) error {
	_, err := r.pool.Exec(ctx, `
UPDATE keeper_schedule
SET status = 'failed',
    last_error = $2,
    claimed_by = NULL,
    claimed_at = NULL
WHERE id = $1
`, params.JobID, params.LastError)
	return err
}

func (r *PostgresRepository) InsertIncident(ctx context.Context, record IncidentRecord) error {
	_, err := r.pool.Exec(ctx, `
INSERT INTO incidents (title, severity, template_id, payload)
VALUES ($1, $2, $3, $4::jsonb)
`, record.Title, record.Severity, nilIfEmptyBytes(record.TemplateID), defaultJSON(record.Payload))
	return err
}

type ScheduleParams struct {
	TemplateID  []byte
	EpochID     *int64
	Action      Action
	ScheduledAt time.Time
	WindowEndAt time.Time
}

func ScheduleIfAbsent(ctx context.Context, tx pgx.Tx, params ScheduleParams) error {
	tag, err := tx.Exec(ctx, `
INSERT INTO keeper_schedule (template_id, epoch_id, action, scheduled_at, window_end_at, status)
SELECT $1::bytea, $2::bigint, $3::varchar, $4::timestamptz, $5::timestamptz, 'pending'
WHERE NOT EXISTS (
    SELECT 1
    FROM keeper_schedule
    WHERE action = $3::varchar
      AND template_id IS NOT DISTINCT FROM $1::bytea
      AND epoch_id IS NOT DISTINCT FROM $2::bigint
      AND status IN ('pending', 'claimed', 'completed')
)
`, nilIfEmptyBytes(params.TemplateID), nullableInt64(params.EpochID), string(params.Action), params.ScheduledAt.UTC(), params.WindowEndAt.UTC())
	if err != nil {
		return fmt.Errorf("schedule keeper job: %w", err)
	}
	_ = tag
	return nil
}

func nilIfEmptyBytes(v []byte) any {
	if len(v) == 0 {
		return nil
	}
	return v
}

func nullableInt64(v *int64) any {
	if v == nil {
		return nil
	}
	return *v
}

func nullableInt64Value(v int64) any {
	if v == 0 {
		return nil
	}
	return v
}

func nullableUint64(v uint64) any {
	if v == 0 {
		return nil
	}
	return int64(v)
}

func nullableTime(v time.Time) any {
	if v.IsZero() {
		return nil
	}
	return v.UTC()
}

func defaultJSON(v string) string {
	if v == "" {
		return "{}"
	}
	return v
}
