-- name: InsertFeeEvent :one
INSERT INTO fee_events (tx_hash, log_index, market_id, trader_wallet, token_address, fee_amount, block_number)
VALUES ($1, $2, $3, $4, $5, $6::numeric, $7)
ON CONFLICT (tx_hash, log_index) DO UPDATE SET fee_amount = fee_events.fee_amount
RETURNING id;

-- name: InsertReferralRewardEvent :exec
INSERT INTO referral_reward_events (fee_event_id, referrer_wallet, trader_wallet, level, amount, status)
VALUES ($1, $2, $3, $4, $5::numeric, 'claimable')
ON CONFLICT (fee_event_id, referrer_wallet, level) DO NOTHING;

-- name: ListFeeRouteBatches :many
SELECT id, batch_id, token_address, gross_amount::text, treasury_amount::text,
       rewards_amount::text, community_amount::text, tx_hash, log_index, block_number, created_at
FROM fee_route_batches
ORDER BY created_at DESC
LIMIT $1;

-- name: ListReporterSubmissionsPending :many
SELECT id, template_id, epoch_id, outcome, evidence, status
FROM reporter_submissions
WHERE status = 'pending'
ORDER BY created_at ASC
LIMIT 100;

-- name: ListReferralEarnings :many
SELECT level, amount::text, status, created_at
FROM referral_reward_events
WHERE referrer_wallet = $1
ORDER BY created_at DESC
LIMIT $2;
