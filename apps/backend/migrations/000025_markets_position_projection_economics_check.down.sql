ALTER TABLE markets_position_projections
    DROP CONSTRAINT IF EXISTS markets_position_projections_economics_fixed_point_check;

ALTER TABLE markets_position_projections
    DROP COLUMN IF EXISTS redeemable_observed;