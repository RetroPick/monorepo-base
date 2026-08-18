-- Store liquidity epsilon as canonical decimal text for deterministic evidence.

ALTER TABLE markets_liquidity_observations
    ALTER COLUMN epsilon TYPE TEXT USING epsilon::TEXT;

ALTER TABLE markets_liquidity_observations
    ADD CONSTRAINT markets_liquidity_observations_epsilon_decimal
    CHECK (epsilon ~ '^(0|[1-9][0-9]*)(\.[0-9]+)?$');
