package funding

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/realtime"
)

type CreditWorker struct {
	pool   *pgxpool.Pool
	logger *slog.Logger
	ticker *time.Ticker
}

func NewCreditWorker(pool *pgxpool.Pool, logger *slog.Logger, interval time.Duration) *CreditWorker {
	if interval <= 0 {
		interval = 2 * time.Second
	}
	if logger == nil {
		logger = slog.Default()
	}
	return &CreditWorker{
		pool:   pool,
		logger: logger,
		ticker: time.NewTicker(interval),
	}
}

func (w *CreditWorker) Run(ctx context.Context) error {
	defer w.ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-w.ticker.C:
			if err := w.processOne(ctx); err != nil && err != pgx.ErrNoRows {
				w.logger.Warn("credit worker tick", "err", err)
			}
		}
	}
}

func (w *CreditWorker) processOne(ctx context.Context) error {
	tx, err := w.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var intentID string
	var transferID string
	var userAddress string
	var amount string
	err = tx.QueryRow(ctx, `
SELECT fi.id::text, dut.id::text, fi.user_address, dut.amount::text
FROM destination_usdc_transfers dut
JOIN funding_intents fi ON fi.id = dut.matched_funding_intent_id
WHERE dut.credit_status = 'UNMATCHED'
  AND fi.status IN ('BRIDGING', 'SOURCE_TX_SUBMITTED', 'EXECUTION_STARTED')
ORDER BY dut.created_at ASC
FOR UPDATE SKIP LOCKED
LIMIT 1
`).Scan(&intentID, &transferID, &userAddress, &amount)
	if err != nil {
		return err
	}

	idem := fmt.Sprintf("deposit-credit:%s", intentID)
	ledgerTag, err := tx.Exec(ctx, `
INSERT INTO balance_ledger (
    user_address, delta_available, delta_locked, reason, reference_type, reference_id, idempotency_key
) VALUES ($1, $2::numeric, 0, 'CROSS_CHAIN_DEPOSIT_CREDIT', 'funding_intent', $3, $4)
ON CONFLICT (idempotency_key) DO NOTHING
`, userAddress, amount, intentID, idem)
	if err != nil {
		return err
	}
	if ledgerTag.RowsAffected() == 0 {
		_, err = tx.Exec(ctx, `
UPDATE destination_usdc_transfers
SET credit_status = 'CREDITED'
WHERE id::text = $1
`, transferID)
		return err
	}

	_, err = tx.Exec(ctx, `
INSERT INTO user_balances (user_address, usdc_available, usdc_locked, updated_at)
VALUES ($1, $2::numeric, 0, NOW())
ON CONFLICT (user_address) DO UPDATE
SET usdc_available = user_balances.usdc_available + EXCLUDED.usdc_available,
    updated_at = NOW()
`, userAddress, amount)
	if err != nil {
		return err
	}

	_, err = tx.Exec(ctx, `
UPDATE destination_usdc_transfers
SET credit_status = 'CREDITED'
WHERE id::text = $1
`, transferID)
	if err != nil {
		return err
	}
	var remaining int64
	err = tx.QueryRow(ctx, `
SELECT COUNT(*)::bigint
FROM destination_usdc_transfers
WHERE matched_funding_intent_id::text = $1
  AND credit_status = 'UNMATCHED'
`, intentID).Scan(&remaining)
	if err != nil {
		return err
	}
	if remaining == 0 {
		_, err = tx.Exec(ctx, `
UPDATE funding_intents SET status = 'CREDITED', updated_at = NOW() WHERE id::text = $1
`, intentID)
		if err != nil {
			return err
		}
	}

	seqA, insertedA, err := realtime.Insert(ctx, tx, realtime.InsertEvent{
		Channel:     "deposit:" + intentID,
		Type:        "deposit_credited",
		Scope:       "private",
		UserAddress: userAddress,
		Payload: map[string]any{
			"intentId":       intentID,
			"creditedAmount": amount,
		},
		DedupeKey: "deposit_credited:" + intentID,
	})
	if err != nil {
		return err
	}
	seqB, insertedB, err := realtime.Insert(ctx, tx, realtime.InsertEvent{
		Channel:     "user:" + userAddress,
		Type:        "balance_update",
		Scope:       "private",
		UserAddress: userAddress,
		Payload: map[string]any{
			"delta":  amount,
			"reason": "CROSS_CHAIN_DEPOSIT_CREDIT",
		},
		DedupeKey: "balance_update_credit:" + intentID,
	})
	if err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return err
	}
	if insertedA {
		_ = realtime.Notify(ctx, w.pool, seqA)
	}
	if insertedB {
		_ = realtime.Notify(ctx, w.pool, seqB)
	}
	return nil
}
