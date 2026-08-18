DROP INDEX IF EXISTS idx_incidents_unnotified;
DROP INDEX IF EXISTS idx_keeper_schedule_pending_window;

ALTER TABLE incidents
    DROP COLUMN IF EXISTS last_error,
    DROP COLUMN IF EXISTS notification_attempts,
    DROP COLUMN IF EXISTS notified_at;

ALTER TABLE keeper_executions
    DROP COLUMN IF EXISTS preflight_snapshot,
    DROP COLUMN IF EXISTS nonce,
    DROP COLUMN IF EXISTS chain_id,
    DROP COLUMN IF EXISTS receipt_json,
    DROP COLUMN IF EXISTS gas_used,
    DROP COLUMN IF EXISTS mined_at,
    DROP COLUMN IF EXISTS submitted_at,
    DROP COLUMN IF EXISTS started_at,
    DROP COLUMN IF EXISTS schedule_id;

ALTER TABLE keeper_schedule
    DROP COLUMN IF EXISTS preflight_snapshot,
    DROP COLUMN IF EXISTS claimed_at,
    DROP COLUMN IF EXISTS claimed_by,
    DROP COLUMN IF EXISTS tx_hash,
    DROP COLUMN IF EXISTS last_error,
    DROP COLUMN IF EXISTS attempt_count;
