-- Reversal is intentionally data-safe: restoring the legacy global upstream
-- identity is only possible when no subject-scoped duplicates exist.

DROP TRIGGER IF EXISTS markets_activity_events_append_only ON markets_activity_events;
DROP FUNCTION IF EXISTS markets_activity_events_prevent_mutation();

DROP INDEX IF EXISTS idx_markets_position_projections_subject_upstream;

ALTER TABLE markets_position_projections
    DROP CONSTRAINT IF EXISTS markets_position_projections_fixed_point_check;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM markets_position_projections
        GROUP BY upstream_source, upstream_id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'cannot restore legacy global position upstream identity while subject-scoped duplicate projections exist';
    END IF;
END;
$$;

ALTER TABLE markets_position_projections
    ADD CONSTRAINT markets_position_projections_upstream_source_upstream_id_key
    UNIQUE (upstream_source, upstream_id);
