-- Coverage columns describe whether the latest accepted venue snapshot carried
-- a valid value. Values themselves remain last-known when coverage is false.
-- Existing rows are backfilled false because their historical source coverage
-- cannot be proven. Defaults keep the migration expand-compatible.
ALTER TABLE markets_position_projections
    ADD COLUMN IF NOT EXISTS mark_price_observed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS cost_basis_observed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS unrealized_pnl_observed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS realized_pnl_observed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS redeemable_observed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS claimable_amount_observed BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE markets_position_projections
    ADD CONSTRAINT markets_position_projections_economics_fixed_point_check
    CHECK (
        (mark_price IS NULL OR mark_price ~ '^(0|[1-9][0-9]*)(\.[0-9]+)?$') AND
        (unrealized_pnl IS NULL OR unrealized_pnl ~ '^-?(0|[1-9][0-9]*)(\.[0-9]+)?$') AND
        (realized_pnl IS NULL OR realized_pnl ~ '^-?(0|[1-9][0-9]*)(\.[0-9]+)?$') AND
        (claimable_amount IS NULL OR claimable_amount ~ '^(0|[1-9][0-9]*)(\.[0-9]+)?$')
    );