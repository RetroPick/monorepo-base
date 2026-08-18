ALTER TABLE keeper_schedule
    ADD COLUMN attempt_count INT NOT NULL DEFAULT 0,
    ADD COLUMN last_error TEXT,
    ADD COLUMN tx_hash VARCHAR(66),
    ADD COLUMN claimed_by TEXT,
    ADD COLUMN claimed_at TIMESTAMPTZ,
    ADD COLUMN preflight_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE keeper_executions
    ADD COLUMN schedule_id BIGINT REFERENCES keeper_schedule (id) ON DELETE SET NULL,
    ADD COLUMN started_at TIMESTAMPTZ,
    ADD COLUMN submitted_at TIMESTAMPTZ,
    ADD COLUMN mined_at TIMESTAMPTZ,
    ADD COLUMN gas_used BIGINT,
    ADD COLUMN receipt_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN chain_id BIGINT,
    ADD COLUMN nonce BIGINT,
    ADD COLUMN preflight_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE incidents
    ADD COLUMN notified_at TIMESTAMPTZ,
    ADD COLUMN notification_attempts INT NOT NULL DEFAULT 0,
    ADD COLUMN last_error TEXT;

CREATE INDEX idx_keeper_schedule_pending_window
    ON keeper_schedule (scheduled_at, window_end_at)
    WHERE status = 'pending';

CREATE INDEX idx_incidents_unnotified
    ON incidents (opened_at)
    WHERE status = 'open' AND notified_at IS NULL;
