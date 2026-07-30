-- name: UpsertMarketsCatalogEvent :one
INSERT INTO markets_catalog_events (
    event_id, slug, title, description, status, start_at, end_at, source,
    upstream_updated_at, content_hash, payload, observed_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
)
ON CONFLICT (event_id) DO UPDATE SET
    slug = EXCLUDED.slug,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    start_at = EXCLUDED.start_at,
    end_at = EXCLUDED.end_at,
    source = EXCLUDED.source,
    upstream_updated_at = EXCLUDED.upstream_updated_at,
    content_hash = EXCLUDED.content_hash,
    payload = EXCLUDED.payload,
    observed_at = EXCLUDED.observed_at,
    updated_at = NOW()
RETURNING *;

-- name: ListMarketsCatalogEvents :many
SELECT *
FROM markets_catalog_events
WHERE ($1::TEXT = '' OR status = $1)
ORDER BY COALESCE(end_at, 'infinity'::TIMESTAMPTZ), event_id
LIMIT $2 OFFSET $3;

-- name: ListMarketsCatalogEventSummaries :many
SELECT
    e.event_id,
    e.slug,
    e.title,
    e.description,
    e.status,
    e.start_at,
    e.end_at,
    e.source,
    e.upstream_updated_at,
    e.content_hash,
    e.payload,
    e.observed_at,
    e.created_at,
    e.updated_at,
    COALESCE(m.market_count, 0)::INT AS market_count
FROM markets_catalog_events e
LEFT JOIN (
    SELECT event_id, COUNT(*)::INT AS market_count
    FROM markets_catalog_markets
    WHERE event_id IS NOT NULL AND event_id <> ''
    GROUP BY event_id
) m ON m.event_id = e.event_id
WHERE ($1::TEXT = '' OR e.status = $1)
ORDER BY COALESCE(e.end_at, 'infinity'::TIMESTAMPTZ), e.event_id
LIMIT $2 OFFSET $3;

-- name: GetMarketsCatalogEvent :one
SELECT *
FROM markets_catalog_events
WHERE event_id = $1;

-- name: UpsertMarketsCatalogMarket :one
INSERT INTO markets_catalog_markets (
    market_id, event_id, condition_id, slug, question, description, status,
    end_at, enable_order_book, neg_risk, source, upstream_updated_at,
    content_hash, payload, observed_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
)
ON CONFLICT (market_id) DO UPDATE SET
    event_id = EXCLUDED.event_id,
    condition_id = EXCLUDED.condition_id,
    slug = EXCLUDED.slug,
    question = EXCLUDED.question,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    end_at = EXCLUDED.end_at,
    enable_order_book = EXCLUDED.enable_order_book,
    neg_risk = EXCLUDED.neg_risk,
    source = EXCLUDED.source,
    upstream_updated_at = EXCLUDED.upstream_updated_at,
    content_hash = EXCLUDED.content_hash,
    payload = EXCLUDED.payload,
    observed_at = EXCLUDED.observed_at,
    updated_at = NOW()
RETURNING *;

-- name: GetMarketsCatalogMarket :one
SELECT *
FROM markets_catalog_markets
WHERE market_id = $1 OR condition_id = $1;

-- name: ListMarketsForEvent :many
SELECT *
FROM markets_catalog_markets
WHERE event_id = $1
ORDER BY market_id;

-- name: UpsertMarketsCatalogOutcome :one
INSERT INTO markets_catalog_outcomes (
    outcome_id, market_id, upstream_token_id, outcome_index, name, price,
    winner, observed_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
)
ON CONFLICT (outcome_id) DO UPDATE SET
    upstream_token_id = EXCLUDED.upstream_token_id,
    outcome_index = EXCLUDED.outcome_index,
    name = EXCLUDED.name,
    price = EXCLUDED.price,
    winner = EXCLUDED.winner,
    observed_at = EXCLUDED.observed_at,
    updated_at = NOW()
RETURNING *;

-- name: ListMarketsOutcomes :many
SELECT *
FROM markets_catalog_outcomes
WHERE market_id = $1
ORDER BY outcome_index;

-- name: UpsertMarketsCatalogRule :one
INSERT INTO markets_catalog_rules (
    market_id, description, resolution_source_name, resolution_source_url,
    content_hash, upstream_updated_at, observed_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7
)
ON CONFLICT (market_id) DO UPDATE SET
    description = EXCLUDED.description,
    resolution_source_name = EXCLUDED.resolution_source_name,
    resolution_source_url = EXCLUDED.resolution_source_url,
    content_hash = EXCLUDED.content_hash,
    upstream_updated_at = EXCLUDED.upstream_updated_at,
    observed_at = EXCLUDED.observed_at,
    updated_at = NOW()
RETURNING *;

-- name: GetMarketsCatalogRule :one
SELECT *
FROM markets_catalog_rules
WHERE market_id = $1;

-- name: UpsertMarketsLatestBook :one
INSERT INTO markets_market_data_latest (
    token_id, market_id, condition_id, freshness_state, freshness_reason,
    book_hash, upstream_timestamp, observed_at, snapshot
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
)
ON CONFLICT (token_id) DO UPDATE SET
    market_id = EXCLUDED.market_id,
    condition_id = EXCLUDED.condition_id,
    freshness_state = EXCLUDED.freshness_state,
    freshness_reason = EXCLUDED.freshness_reason,
    book_hash = EXCLUDED.book_hash,
    upstream_timestamp = EXCLUDED.upstream_timestamp,
    observed_at = EXCLUDED.observed_at,
    snapshot = EXCLUDED.snapshot,
    updated_at = NOW()
RETURNING *;

-- name: GetMarketsLatestBook :one
SELECT *
FROM markets_market_data_latest
WHERE token_id = $1;

-- name: InsertMarketsHistoryPoint :exec
INSERT INTO markets_market_data_history (
    token_id, market_id, observed_at, price, derived, source
) VALUES (
    $1, $2, $3, $4, $5, $6
)
ON CONFLICT (token_id, observed_at) DO UPDATE SET
    price = EXCLUDED.price,
    derived = EXCLUDED.derived,
    source = EXCLUDED.source;

-- name: ListMarketsHistory :many
SELECT *
FROM markets_market_data_history
WHERE token_id = $1 AND observed_at >= $2 AND observed_at <= $3
ORDER BY observed_at
LIMIT $4;

-- name: InsertMarketsHealthSnapshot :exec
INSERT INTO markets_market_health_snapshots (
    market_id, token_id, algorithm_version, observed_at, freshness_state,
    components
) VALUES (
    $1, $2, $3, $4, $5, $6
)
ON CONFLICT (market_id, token_id, algorithm_version, observed_at) DO NOTHING;

-- name: GetLatestMarketsHealth :one
SELECT *
FROM markets_market_health_snapshots
WHERE market_id = $1 AND token_id = $2
ORDER BY observed_at DESC
LIMIT 1;

-- name: InsertMarketsRawUpstreamEvent :exec
INSERT INTO markets_raw_upstream_events (
    source, upstream_event_id, entity_type, entity_id, schema_version, payload,
    observed_at, expires_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
)
ON CONFLICT (source, upstream_event_id) DO NOTHING;

-- name: DeleteExpiredMarketsRawUpstreamEvents :execrows
DELETE FROM markets_raw_upstream_events
WHERE expires_at < $1;

-- name: GetMarketsSyncCheckpoint :one
SELECT *
FROM markets_sync_checkpoints
WHERE source = $1 AND stream = $2;

-- name: UpsertMarketsSyncCheckpoint :one
INSERT INTO markets_sync_checkpoints (
    source, stream, cursor, high_watermark, last_success_at, metadata
) VALUES (
    $1, $2, $3, $4, $5, $6
)
ON CONFLICT (source, stream) DO UPDATE SET
    cursor = EXCLUDED.cursor,
    high_watermark = EXCLUDED.high_watermark,
    last_success_at = EXCLUDED.last_success_at,
    metadata = EXCLUDED.metadata,
    updated_at = NOW()
RETURNING *;

-- name: UpsertMarketsSignal :one
INSERT INTO markets_market_signals (
    signal_id, signal_type, market_id, state, rule_version, reason_codes,
    idempotency_key, created_at, expires_at, retracted_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
)
ON CONFLICT (idempotency_key) DO UPDATE SET
    state = EXCLUDED.state,
    reason_codes = EXCLUDED.reason_codes,
    expires_at = EXCLUDED.expires_at,
    retracted_at = EXCLUDED.retracted_at,
    updated_at = NOW()
RETURNING *;

-- name: InsertMarketsSignalEvidence :exec
INSERT INTO markets_signal_evidence (
    signal_id, evidence_index, kind, reference_id, observed_at, content_hash
) VALUES (
    $1, $2, $3, $4, $5, $6
)
ON CONFLICT (signal_id, evidence_index) DO NOTHING;

-- name: RetractMarketsSignal :exec
WITH updated AS (
    UPDATE markets_market_signals
    SET state = 'retracted', retracted_at = $2, updated_at = NOW()
    WHERE signal_id = $1
)
INSERT INTO markets_signal_retractions (
    signal_id, reason_code, evidence_reference_id, retracted_at
) VALUES (
    $1, $3, $4, $2
)
ON CONFLICT (signal_id) DO UPDATE SET
    reason_code = EXCLUDED.reason_code,
    evidence_reference_id = EXCLUDED.evidence_reference_id,
    retracted_at = EXCLUDED.retracted_at;

-- name: ListMarketsSignals :many
SELECT *
FROM markets_market_signals
WHERE ($1::TEXT = '' OR market_id = $1)
ORDER BY created_at DESC, signal_id DESC
LIMIT $2 OFFSET $3;

-- name: CountMarketsCatalogEvents :one
SELECT COUNT(*)::BIGINT AS count
FROM markets_catalog_events;

-- name: GetLatestCatalogProjectionObservedAt :one
SELECT COALESCE(MAX(observed_at), TIMESTAMPTZ '1970-01-01 00:00:00+00')::TIMESTAMPTZ AS observed_at
FROM markets_catalog_events;

-- name: ListMarketsSignalEvidenceForSignal :many
SELECT *
FROM markets_signal_evidence
WHERE signal_id = $1
ORDER BY evidence_index;

-- name: TryMarketsAdvisoryLock :one
SELECT pg_try_advisory_lock($1::BIGINT) AS acquired;

-- name: ReleaseMarketsAdvisoryLock :one
SELECT pg_advisory_unlock($1::BIGINT) AS released;
