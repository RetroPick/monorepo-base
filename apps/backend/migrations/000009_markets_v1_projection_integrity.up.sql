-- Harden durable Markets projection identity, monotonicity and immutability.
-- This is forward-only: 000022 may already be applied to persistent environments.

ALTER TABLE markets_position_projections
    DROP CONSTRAINT IF EXISTS markets_position_projections_upstream_source_upstream_id_key;

ALTER TABLE markets_position_projections
    ADD CONSTRAINT markets_position_projections_fixed_point_check
    CHECK (
        size ~ '^(0|[1-9][0-9]*)(\.[0-9]+)?$' AND
        (avg_entry_price IS NULL OR avg_entry_price ~ '^(0|[1-9][0-9]*)(\.[0-9]+)?$')
    );

CREATE UNIQUE INDEX IF NOT EXISTS idx_markets_position_projections_subject_upstream
    ON markets_position_projections (user_id, account_wallet, upstream_source, upstream_id);

CREATE OR REPLACE FUNCTION markets_activity_events_prevent_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'markets_activity_events is append-only';
END;
$$;

DROP TRIGGER IF EXISTS markets_activity_events_append_only ON markets_activity_events;

CREATE TRIGGER markets_activity_events_append_only
    BEFORE UPDATE OR DELETE ON markets_activity_events
    FOR EACH ROW EXECUTE FUNCTION markets_activity_events_prevent_mutation();
