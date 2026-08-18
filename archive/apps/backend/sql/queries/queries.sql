-- name: GetIndexerState :one
SELECT id, last_block, last_block_hash, last_indexed_at, reorg_depth
FROM indexer_state
WHERE id = 1;

-- name: UpdateIndexerState :exec
UPDATE indexer_state
SET
    last_block = $1,
    last_block_hash = $2,
    last_indexed_at = NOW(),
    reorg_depth = $3
WHERE id = 1;

-- name: InsertChainEvent :exec
INSERT INTO chain_events (
    block_number,
    tx_hash,
    log_index,
    contract_addr,
    event_name,
    template_id,
    epoch_id,
    user_address,
    payload
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
ON CONFLICT (tx_hash, log_index) DO NOTHING;

-- name: UpsertTemplateFromUpsert :exec
INSERT INTO templates (
    template_id,
    slug,
    market_type,
    outcome_count,
    oracle_max_delay_seconds,
    oracle_max_confidence_bps
) VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (template_id) DO UPDATE SET
    slug = EXCLUDED.slug,
    market_type = EXCLUDED.market_type,
    outcome_count = EXCLUDED.outcome_count,
    oracle_max_delay_seconds = EXCLUDED.oracle_max_delay_seconds,
    oracle_max_confidence_bps = EXCLUDED.oracle_max_confidence_bps,
    updated_at = NOW();

-- name: SetTemplateInitialized :exec
UPDATE templates
SET initialized = TRUE, updated_at = NOW()
WHERE template_id = $1;

-- name: UpsertLedgerRow :exec
INSERT INTO ledgers (template_id)
VALUES ($1)
ON CONFLICT (template_id) DO NOTHING;

-- name: UpsertEpochOpened :exec
INSERT INTO epochs (
    template_id,
    epoch_id,
    status,
    open_at,
    lock_at,
    resolve_at,
    open_tx_hash
) VALUES ($1, $2, 'open', $3, $4, $5, $6)
ON CONFLICT (template_id, epoch_id) DO UPDATE SET
    status = 'open',
    open_at = EXCLUDED.open_at,
    lock_at = EXCLUDED.lock_at,
    resolve_at = EXCLUDED.resolve_at,
    open_tx_hash = EXCLUDED.open_tx_hash,
    updated_at = NOW();

-- name: UpdateLedgerActiveEpoch :exec
UPDATE ledgers
SET active_epoch_id = $2, updated_at = NOW()
WHERE template_id = $1;

-- name: UpdateEpochLocked :exec
UPDATE epochs
SET
    status = 'locked',
    lock_tx_hash = $3,
    updated_at = NOW()
WHERE template_id = $1 AND epoch_id = $2;

-- name: UpdateEpochResolved :exec
UPDATE epochs
SET
    status = 'resolved',
    resolve_tx_hash = $3,
    claimable = TRUE,
    winning_outcome_mask = $4,
    ref_mode = $5,
    updated_at = NOW()
WHERE template_id = $1 AND epoch_id = $2;

-- name: UpdateEpochResolvedCheckpointOnly :exec
UPDATE epochs
SET
    status = 'resolved',
    resolve_tx_hash = $3,
    claimable = TRUE,
    updated_at = NOW()
WHERE template_id = $1 AND epoch_id = $2;

-- name: UpdateLedgerAfterResolve :exec
UPDATE ledgers
SET last_resolved_epoch_id = $2, updated_at = NOW()
WHERE template_id = $1;

-- name: UpdateRollingHalted :exec
UPDATE templates
SET
    rolling_phase = 3,
    rolling_halt_reason = $2,
    updated_at = NOW()
WHERE template_id = $1;

-- name: ListTemplates :many
SELECT
    template_id,
    slug,
    market_type,
    outcome_count,
    initialized,
    execution_mode,
    rolling_phase,
    rolling_halt_reason,
    updated_at
FROM templates
ORDER BY slug;

-- name: GetTemplateLedgerEpoch :one
SELECT
    t.template_id,
    t.slug,
    t.market_type,
    t.outcome_count,
    t.initialized,
    t.execution_mode,
    t.rolling_phase,
    t.rolling_halt_reason,
    l.active_epoch_id,
    l.last_resolved_epoch_id
FROM templates t
LEFT JOIN ledgers l ON l.template_id = t.template_id
WHERE t.template_id = $1;

-- name: UpdateLedgerHaltedAt :exec
UPDATE ledgers
SET halted_at_epoch_id = $2, updated_at = NOW()
WHERE template_id = $1;

-- name: ListKeeperSchedule :many
SELECT
    id,
    template_id,
    epoch_id,
    action,
    scheduled_at,
    window_end_at,
    status,
    created_at
FROM keeper_schedule
ORDER BY scheduled_at DESC
LIMIT $1;

-- name: ListKeeperExecutions :many
SELECT
    id,
    action,
    template_id,
    epoch_id,
    result,
    tx_hash,
    error_message,
    executed_at
FROM keeper_executions
ORDER BY executed_at DESC
LIMIT $1;

-- name: ListIncidents :many
SELECT
    id,
    title,
    severity,
    status,
    template_id,
    payload,
    opened_at
FROM incidents
ORDER BY opened_at DESC
LIMIT $1;

-- name: CountOpenIncidents :one
SELECT COUNT(*)::bigint AS n
FROM incidents
WHERE status = 'open';

-- name: CountTemplatesRollingHalted :one
SELECT COUNT(*)::bigint AS n
FROM templates
WHERE rolling_phase = 3;

-- name: CountTemplates :one
SELECT COUNT(*)::bigint AS n
FROM templates;

-- name: GetEpoch :one
SELECT
    template_id,
    epoch_id,
    status,
    open_at,
    lock_at,
    resolve_at,
    open_tx_hash,
    lock_tx_hash,
    resolve_tx_hash,
    claimable,
    winning_outcome_mask,
    ref_mode,
    updated_at
FROM epochs
WHERE template_id = $1 AND epoch_id = $2;

-- name: ListTemplatesWithLedger :many
SELECT
    t.template_id,
    t.slug,
    t.market_type,
    t.outcome_count,
    t.initialized,
    t.execution_mode,
    t.rolling_phase,
    t.rolling_halt_reason,
    t.updated_at,
    l.active_epoch_id,
    l.last_resolved_epoch_id,
    l.rolling_next_epoch_id,
    l.halted_at_epoch_id
FROM templates t
LEFT JOIN ledgers l ON l.template_id = t.template_id
ORDER BY t.slug;

-- name: GetTemplateLedgerDetail :one
SELECT
    t.template_id,
    t.slug,
    t.market_type,
    t.outcome_count,
    t.oracle_max_delay_seconds,
    t.oracle_max_confidence_bps,
    t.initialized,
    t.execution_mode,
    t.rolling_phase,
    t.rolling_halt_reason,
    t.updated_at,
    l.active_epoch_id,
    l.last_resolved_epoch_id,
    l.rolling_next_epoch_id,
    l.halted_at_epoch_id,
    l.updated_at AS ledger_updated_at
FROM templates t
LEFT JOIN ledgers l ON l.template_id = t.template_id
WHERE t.template_id = $1;

-- name: ListEpochsByTemplate :many
SELECT
    template_id,
    epoch_id,
    status,
    open_at,
    lock_at,
    resolve_at,
    open_tx_hash,
    lock_tx_hash,
    resolve_tx_hash,
    claimable,
    winning_outcome_mask,
    ref_mode,
    updated_at
FROM epochs
WHERE template_id = $1
ORDER BY epoch_id DESC
LIMIT $2;

-- name: ListUserChainEvents :many
SELECT
    id,
    block_number,
    tx_hash,
    log_index,
    contract_addr,
    event_name,
    template_id,
    epoch_id,
    user_address,
    payload,
    block_hash,
    indexed_at
FROM chain_events
WHERE user_address IS NOT NULL
  AND LOWER(user_address::text) = LOWER(sqlc.arg(user_address)::text)
ORDER BY block_number DESC, log_index DESC
LIMIT sqlc.arg(row_limit);

-- name: ListUserTemplateEpochPairs :many
SELECT DISTINCT template_id, epoch_id
FROM chain_events
WHERE user_address IS NOT NULL
  AND LOWER(user_address::text) = LOWER(sqlc.arg(user_address)::text)
  AND event_name IN ('PositionDeposited', 'SideSwitched', 'Claimed')
  AND template_id IS NOT NULL
  AND epoch_id IS NOT NULL
ORDER BY template_id, epoch_id DESC
LIMIT sqlc.arg(row_limit);

-- name: ListUserClaimedEvents :many
SELECT
    id,
    block_number,
    tx_hash,
    log_index,
    template_id,
    epoch_id,
    payload,
    indexed_at
FROM chain_events
WHERE user_address IS NOT NULL
  AND LOWER(user_address::text) = LOWER(sqlc.arg(user_address)::text)
  AND event_name = 'Claimed'
  AND template_id IS NOT NULL
  AND epoch_id IS NOT NULL
ORDER BY block_number DESC, log_index DESC
LIMIT sqlc.arg(row_limit);

-- name: IsTemplateFrontendHidden :one
SELECT EXISTS (
    SELECT 1
    FROM frontend_hidden_templates
    WHERE template_id = $1
) AS hidden;

-- name: AddFrontendHidden :exec
INSERT INTO frontend_hidden_templates (template_id)
VALUES ($1)
ON CONFLICT (template_id) DO NOTHING;

-- name: RemoveFrontendHidden :exec
DELETE FROM frontend_hidden_templates
WHERE template_id = $1;

-- name: ListFrontendHidden :many
SELECT
    template_id,
    hidden_at
FROM frontend_hidden_templates
ORDER BY hidden_at DESC;

-- name: ListUserChainEventsForTemplateEpoch :many
SELECT
    id,
    block_number,
    tx_hash,
    log_index,
    contract_addr,
    event_name,
    template_id,
    epoch_id,
    user_address,
    payload,
    block_hash,
    indexed_at
FROM chain_events
WHERE user_address IS NOT NULL
  AND LOWER(user_address::text) = LOWER(sqlc.arg(user_address)::text)
  AND template_id = sqlc.arg(template_id)
  AND epoch_id IS NOT NULL
  AND epoch_id = sqlc.arg(epoch_id)
  AND event_name IN ('PositionDeposited', 'SideSwitched', 'Claimed')
ORDER BY block_number ASC, log_index ASC, id ASC;

-- name: ListUserWatchlist :many
SELECT
    template_id,
    created_at
FROM user_watchlist
WHERE LOWER(user_address) = LOWER(sqlc.arg(user_address))
ORDER BY created_at DESC;

-- name: UpsertUserWatchlist :exec
INSERT INTO user_watchlist (user_address, template_id)
VALUES (sqlc.arg(user_address), sqlc.arg(template_id))
ON CONFLICT (user_address, template_id) DO NOTHING;

-- name: DeleteUserWatchlist :exec
DELETE FROM user_watchlist
WHERE LOWER(user_address) = LOWER(sqlc.arg(user_address)) AND template_id = sqlc.arg(template_id);

-- name: GetUserWatchlistNonce :one
SELECT nonce
FROM user_watchlist_nonce
WHERE LOWER(user_address) = LOWER(sqlc.arg(user_address));

-- name: CreateUserWatchlistNonceIfMissing :exec
INSERT INTO user_watchlist_nonce (user_address, nonce)
VALUES (sqlc.arg(user_address), 0)
ON CONFLICT (user_address) DO NOTHING;

-- name: IncrementUserWatchlistNonce :one
UPDATE user_watchlist_nonce
SET nonce = nonce + 1,
    updated_at = NOW()
WHERE LOWER(user_address) = LOWER(sqlc.arg(user_address))
RETURNING nonce;
