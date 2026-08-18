DROP TABLE IF EXISTS markets_watchlist_items;
DROP TABLE IF EXISTS markets_watchlists;

ALTER TABLE markets_sync_checkpoints
    DROP COLUMN IF EXISTS upstream_source;

DROP INDEX IF EXISTS idx_markets_raw_upstream_upstream_tuple;
ALTER TABLE markets_raw_upstream_events
    DROP COLUMN IF EXISTS upstream_id,
    DROP COLUMN IF EXISTS upstream_source;

DROP INDEX IF EXISTS idx_markets_catalog_rules_upstream_tuple;
DROP INDEX IF EXISTS idx_markets_catalog_rules_row_id;
ALTER TABLE markets_catalog_rules
    DROP COLUMN IF EXISTS upstream_source,
    DROP COLUMN IF EXISTS upstream_id,
    DROP COLUMN IF EXISTS id;

DROP INDEX IF EXISTS idx_markets_catalog_outcomes_upstream_tuple;
DROP INDEX IF EXISTS idx_markets_catalog_outcomes_row_id;
ALTER TABLE markets_catalog_outcomes
    DROP COLUMN IF EXISTS upstream_source,
    DROP COLUMN IF EXISTS upstream_id,
    DROP COLUMN IF EXISTS id;

DROP INDEX IF EXISTS idx_markets_catalog_markets_upstream_tuple;
DROP INDEX IF EXISTS idx_markets_catalog_markets_row_id;
ALTER TABLE markets_catalog_markets
    DROP COLUMN IF EXISTS upstream_source,
    DROP COLUMN IF EXISTS upstream_id,
    DROP COLUMN IF EXISTS id;

DROP INDEX IF EXISTS idx_markets_catalog_events_upstream_tuple;
DROP INDEX IF EXISTS idx_markets_catalog_events_row_id;
ALTER TABLE markets_catalog_events
    DROP COLUMN IF EXISTS upstream_source,
    DROP COLUMN IF EXISTS upstream_id,
    DROP COLUMN IF EXISTS id;
