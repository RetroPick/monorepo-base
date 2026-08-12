-- Enforce fixed-point economics introduced after 000022 without changing existing data.
ALTER TABLE markets_position_projections
    ADD COLUMN IF NOT EXISTS redeemable_observed BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE markets_position_projections
    ADD CONSTRAINT markets_position_projections_economics_fixed_point_check
    CHECK (
        (mark_price IS NULL OR mark_price ~ '^(0|[1-9][0-9]*)(\.[0-9]+)?$') AND
        (unrealized_pnl IS NULL OR unrealized_pnl ~ '^-?(0|[1-9][0-9]*)(\.[0-9]+)?$') AND
        (realized_pnl IS NULL OR realized_pnl ~ '^-?(0|[1-9][0-9]*)(\.[0-9]+)?$') AND
        (claimable_amount IS NULL OR claimable_amount ~ '^(0|[1-9][0-9]*)(\.[0-9]+)?$')
    );