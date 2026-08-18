ALTER TABLE markets_liquidity_observations DROP CONSTRAINT IF EXISTS markets_liquidity_observations_epsilon_decimal;
ALTER TABLE markets_liquidity_observations ALTER COLUMN epsilon TYPE DOUBLE PRECISION USING epsilon::DOUBLE PRECISION;
