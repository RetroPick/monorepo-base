package funding

import (
	"context"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type MatcherWorker struct {
	pool     *pgxpool.Pool
	logger   *slog.Logger
	interval time.Duration
}

func NewMatcherWorker(pool *pgxpool.Pool, logger *slog.Logger, interval time.Duration) *MatcherWorker {
	if interval <= 0 {
		interval = 2 * time.Second
	}
	if logger == nil {
		logger = slog.Default()
	}
	return &MatcherWorker{pool: pool, logger: logger, interval: interval}
}

func (w *MatcherWorker) Run(ctx context.Context) error {
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			if err := w.matchOne(ctx); err != nil && w.logger != nil {
				w.logger.Warn("matcher worker tick", "err", err)
			}
		}
	}
}

func (w *MatcherWorker) matchOne(ctx context.Context) error {
	tx, err := w.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var transferID string
	var amount string
	var txHash string
	err = tx.QueryRow(ctx, `
SELECT id::text, amount::text, tx_hash
FROM destination_usdc_transfers
WHERE credit_status = 'UNMATCHED'
  AND matched_execution_id IS NULL
ORDER BY created_at ASC
FOR UPDATE SKIP LOCKED
LIMIT 1
`).Scan(&transferID, &amount, &txHash)
	if err != nil {
		return err
	}
	var executionID string
	var intentID string
	err = tx.QueryRow(ctx, `
SELECT id::text, funding_intent_id::text
FROM funding_executions
WHERE (
    (destination_tx_hash IS NOT NULL AND LOWER(destination_tx_hash) = LOWER($1))
    OR (
        destination_tx_hash IS NULL
        AND expected_usdc_amount::numeric <= $2::numeric
        AND status IN ('SOURCE_TX_SUBMITTED','BRIDGING','EXECUTION_STARTED')
    )
)
ORDER BY CASE WHEN destination_tx_hash IS NOT NULL THEN 0 ELSE 1 END, created_at DESC
LIMIT 1
`, txHash, amount).Scan(&executionID, &intentID)
	if err != nil {
		return tx.Commit(ctx)
	}
	_, err = tx.Exec(ctx, `
UPDATE destination_usdc_transfers
SET matched_execution_id = $2::uuid,
    matched_funding_intent_id = $3::uuid,
    match_confidence = $4::numeric,
    match_metadata = jsonb_build_object('matchedBy', CASE WHEN LOWER(tx_hash) = LOWER($5) THEN 'destinationTxHash' ELSE 'amountHeuristic' END),
    provenance = CASE WHEN provenance = 'WEBHOOK' THEN 'MERGED' ELSE provenance END
WHERE id::text = $1
`, transferID, executionID, intentID, "0.95", txHash)
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}
