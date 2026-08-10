-- MKT-P1-003: expand-contract catalog conventions + watchlist foundation.
-- Keeps existing TEXT PKs (event_id, market_id); adds surrogate id + upstream tuple.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Catalog events
ALTER TABLE markets_catalog_events
    ADD COLUMN IF NOT EXISTS id UUID,
    ADD COLUMN IF NOT EXISTS upstream_id TEXT,
    ADD COLUMN IF NOT EXISTS upstream_source TEXT;

UPDATE markets_catalog_events
SET
    upstream_source = COALESCE(upstream_source, source),
    upstream_id = COALESCE(
        upstream_id,
        NULLIF(regexp_replace(event_id, '^polymarket:event:', ''), event_id),
        NULLIF(payload ->> 'upstreamId', ''),
        event_id
    ),
    id = COALESCE(id, gen_random_uuid())
WHERE upstream_source IS NULL
   OR upstream_id IS NULL
   OR id IS NULL;

ALTER TABLE markets_catalog_events
    ALTER COLUMN id SET NOT NULL,
    ALTER COLUMN upstream_id SET NOT NULL,
    ALTER COLUMN upstream_source SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_markets_catalog_events_row_id
    ON markets_catalog_events (id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_markets_catalog_events_upstream_tuple
    ON markets_catalog_events (upstream_source, upstream_id);

-- Catalog markets
ALTER TABLE markets_catalog_markets
    ADD COLUMN IF NOT EXISTS id UUID,
    ADD COLUMN IF NOT EXISTS upstream_id TEXT,
    ADD COLUMN IF NOT EXISTS upstream_source TEXT;

UPDATE markets_catalog_markets
SET
    upstream_source = COALESCE(upstream_source, source),
    upstream_id = COALESCE(
        upstream_id,
        NULLIF(regexp_replace(market_id, '^polymarket:market:', ''), market_id),
        NULLIF(payload ->> 'upstreamId', ''),
        market_id
    ),
    id = COALESCE(id, gen_random_uuid())
WHERE upstream_source IS NULL
   OR upstream_id IS NULL
   OR id IS NULL;

ALTER TABLE markets_catalog_markets
    ALTER COLUMN id SET NOT NULL,
    ALTER COLUMN upstream_id SET NOT NULL,
    ALTER COLUMN upstream_source SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_markets_catalog_markets_row_id
    ON markets_catalog_markets (id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_markets_catalog_markets_upstream_tuple
    ON markets_catalog_markets (upstream_source, upstream_id);

-- Catalog outcomes
ALTER TABLE markets_catalog_outcomes
    ADD COLUMN IF NOT EXISTS id UUID,
    ADD COLUMN IF NOT EXISTS upstream_id TEXT,
    ADD COLUMN IF NOT EXISTS upstream_source TEXT;

UPDATE markets_catalog_outcomes o
SET
    upstream_source = COALESCE(o.upstream_source, m.upstream_source, m.source),
    upstream_id = COALESCE(o.upstream_id, o.upstream_token_id),
    id = COALESCE(o.id, gen_random_uuid())
FROM markets_catalog_markets m
WHERE m.market_id = o.market_id
  AND (o.upstream_source IS NULL OR o.upstream_id IS NULL OR o.id IS NULL);

UPDATE markets_catalog_outcomes
SET
    upstream_source = COALESCE(upstream_source, 'unknown'),
    upstream_id = COALESCE(upstream_id, upstream_token_id, outcome_id),
    id = COALESCE(id, gen_random_uuid())
WHERE upstream_source IS NULL
   OR upstream_id IS NULL
   OR id IS NULL;

ALTER TABLE markets_catalog_outcomes
    ALTER COLUMN id SET NOT NULL,
    ALTER COLUMN upstream_id SET NOT NULL,
    ALTER COLUMN upstream_source SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_markets_catalog_outcomes_row_id
    ON markets_catalog_outcomes (id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_markets_catalog_outcomes_upstream_tuple
    ON markets_catalog_outcomes (upstream_source, upstream_id);

-- Catalog rules (1:1 with market; inherit market upstream tuple)
ALTER TABLE markets_catalog_rules
    ADD COLUMN IF NOT EXISTS id UUID,
    ADD COLUMN IF NOT EXISTS upstream_id TEXT,
    ADD COLUMN IF NOT EXISTS upstream_source TEXT;

UPDATE markets_catalog_rules r
SET
    upstream_source = COALESCE(r.upstream_source, m.upstream_source, m.source),
    upstream_id = COALESCE(r.upstream_id, m.upstream_id),
    id = COALESCE(r.id, gen_random_uuid())
FROM markets_catalog_markets m
WHERE m.market_id = r.market_id
  AND (r.upstream_source IS NULL OR r.upstream_id IS NULL OR r.id IS NULL);

UPDATE markets_catalog_rules
SET
    upstream_source = COALESCE(upstream_source, 'unknown'),
    upstream_id = COALESCE(upstream_id, market_id),
    id = COALESCE(id, gen_random_uuid())
WHERE upstream_source IS NULL
   OR upstream_id IS NULL
   OR id IS NULL;

ALTER TABLE markets_catalog_rules
    ALTER COLUMN id SET NOT NULL,
    ALTER COLUMN upstream_id SET NOT NULL,
    ALTER COLUMN upstream_source SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_markets_catalog_rules_row_id
    ON markets_catalog_rules (id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_markets_catalog_rules_upstream_tuple
    ON markets_catalog_rules (upstream_source, upstream_id);

-- Raw upstream events (parallel tuple naming)
ALTER TABLE markets_raw_upstream_events
    ADD COLUMN IF NOT EXISTS upstream_source TEXT,
    ADD COLUMN IF NOT EXISTS upstream_id TEXT;

UPDATE markets_raw_upstream_events
SET
    upstream_source = COALESCE(upstream_source, source),
    upstream_id = COALESCE(upstream_id, upstream_event_id)
WHERE upstream_source IS NULL
   OR upstream_id IS NULL;

ALTER TABLE markets_raw_upstream_events
    ALTER COLUMN upstream_source SET NOT NULL,
    ALTER COLUMN upstream_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_markets_raw_upstream_upstream_tuple
    ON markets_raw_upstream_events (upstream_source, upstream_id);

-- Sync checkpoints (upstream_source mirrors source; stream remains stream id)
ALTER TABLE markets_sync_checkpoints
    ADD COLUMN IF NOT EXISTS upstream_source TEXT;

UPDATE markets_sync_checkpoints
SET upstream_source = COALESCE(upstream_source, source)
WHERE upstream_source IS NULL;

ALTER TABLE markets_sync_checkpoints
    ALTER COLUMN upstream_source SET NOT NULL;

-- Watchlist foundation (user-owned; private by default)
CREATE TABLE IF NOT EXISTS markets_watchlists (
    id UUID PRIMARY KEY,
    owner_wallet_address TEXT NOT NULL CHECK (owner_wallet_address = lower(owner_wallet_address)),
    name TEXT NOT NULL DEFAULT 'default',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (owner_wallet_address, name)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_markets_watchlists_one_default
    ON markets_watchlists (owner_wallet_address)
    WHERE is_default = TRUE;

CREATE INDEX IF NOT EXISTS idx_markets_watchlists_owner
    ON markets_watchlists (owner_wallet_address);

CREATE TABLE IF NOT EXISTS markets_watchlist_items (
    id UUID PRIMARY KEY,
    watchlist_id UUID NOT NULL REFERENCES markets_watchlists (id) ON DELETE CASCADE,
    item_kind TEXT NOT NULL CHECK (item_kind IN ('event', 'market', 'wallet', 'tag', 'category')),
    target_id TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (watchlist_id, item_kind, target_id)
);

CREATE INDEX IF NOT EXISTS idx_markets_watchlist_items_watchlist_sort
    ON markets_watchlist_items (watchlist_id, sort_order);
