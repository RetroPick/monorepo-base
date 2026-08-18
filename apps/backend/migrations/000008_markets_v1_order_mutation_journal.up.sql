-- MKT-P3 durable order mutation journal.
-- Reuse the 000021 order projection tables as the mutation ledger so there is
-- one canonical local order row before any CLOB side effect.

ALTER TABLE markets_user_orders
    DROP CONSTRAINT IF EXISTS markets_user_orders_status_check;

ALTER TABLE markets_user_orders
    ADD CONSTRAINT markets_user_orders_status_check
    CHECK (status IN (
        'previewed', 'not_submitted', 'submit_pending', 'submitted', 'submitting',
        'open', 'partially_filled', 'filled',
        'cancel_pending', 'canceled', 'rejected', 'expired',
        'unknown', 'unknown_reconciling'
    ));

ALTER TABLE markets_order_attempts
    DROP CONSTRAINT IF EXISTS markets_order_attempts_attempt_status_check;

ALTER TABLE markets_order_attempts
    ADD CONSTRAINT markets_order_attempts_attempt_status_check
    CHECK (attempt_status IN (
        'preview_issued', 'not_submitted', 'submit_pending', 'submitted', 'submitting',
        'accepted', 'rejected', 'integrity_failed',
        'unknown', 'unknown_reconciling', 'reconciled'
    ));

ALTER TABLE markets_user_orders
    ADD COLUMN IF NOT EXISTS preview_ref TEXT,
    ADD COLUMN IF NOT EXISTS request_fingerprint TEXT,
    ADD COLUMN IF NOT EXISTS maker_amount TEXT,
    ADD COLUMN IF NOT EXISTS taker_amount TEXT,
    ADD COLUMN IF NOT EXISTS salt TEXT,
    ADD COLUMN IF NOT EXISTS journal_locked_at TIMESTAMPTZ;

ALTER TABLE markets_user_orders
    DROP CONSTRAINT IF EXISTS markets_user_orders_request_fingerprint_check;

ALTER TABLE markets_user_orders
    ADD CONSTRAINT markets_user_orders_request_fingerprint_check
    CHECK (request_fingerprint IS NULL OR request_fingerprint ~ '^[0-9a-f]{64}$');

ALTER TABLE markets_user_orders
    DROP CONSTRAINT IF EXISTS markets_user_orders_journal_amounts_check;

ALTER TABLE markets_user_orders
    ADD CONSTRAINT markets_user_orders_journal_amounts_check
    CHECK (
        (maker_amount IS NULL OR maker_amount ~ '^[0-9]+(\.[0-9]+)?$') AND
        (taker_amount IS NULL OR taker_amount ~ '^[0-9]+(\.[0-9]+)?$')
    );

ALTER TABLE markets_order_attempts
    DROP CONSTRAINT IF EXISTS markets_order_attempts_request_fingerprint_check;

ALTER TABLE markets_order_attempts
    ADD CONSTRAINT markets_order_attempts_request_fingerprint_check
    CHECK (request_fingerprint IS NULL OR request_fingerprint ~ '^[0-9a-f]{64}$');

ALTER TABLE markets_user_orders
    DROP CONSTRAINT IF EXISTS markets_user_orders_idempotency_key_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_markets_user_orders_user_idempotency
    ON markets_user_orders (user_id, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_markets_user_orders_recovery
    ON markets_user_orders (status, updated_at)
    WHERE status IN ('submit_pending', 'submitting', 'unknown', 'unknown_reconciling', 'cancel_pending');

CREATE INDEX IF NOT EXISTS idx_markets_order_attempts_recovery
    ON markets_order_attempts (attempt_status, updated_at)
    WHERE attempt_status IN ('submit_pending', 'submitting', 'unknown', 'unknown_reconciling');
