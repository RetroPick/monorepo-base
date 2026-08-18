ALTER TABLE markets_position_projections
    DROP CONSTRAINT IF EXISTS markets_position_projections_economics_fixed_point_check;

ALTER TABLE markets_position_projections
    DROP COLUMN IF EXISTS claimable_amount_observed,
    DROP COLUMN IF EXISTS redeemable_observed,
    DROP COLUMN IF EXISTS realized_pnl_observed,
    DROP COLUMN IF EXISTS unrealized_pnl_observed,
    DROP COLUMN IF EXISTS cost_basis_observed,
    DROP COLUMN IF EXISTS mark_price_observed;