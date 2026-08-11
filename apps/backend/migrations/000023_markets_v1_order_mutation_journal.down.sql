DROP INDEX IF EXISTS idx_markets_order_attempts_recovery;
DROP INDEX IF EXISTS idx_markets_user_orders_recovery;
DROP INDEX IF EXISTS idx_markets_user_orders_user_idempotency;

ALTER TABLE markets_order_attempts
    DROP CONSTRAINT IF EXISTS markets_order_attempts_request_fingerprint_check;

ALTER TABLE markets_user_orders
    DROP CONSTRAINT IF EXISTS markets_user_orders_request_fingerprint_check;

ALTER TABLE markets_user_orders
    DROP CONSTRAINT IF EXISTS markets_user_orders_journal_amounts_check;

ALTER TABLE markets_user_orders
    DROP COLUMN IF EXISTS journal_locked_at,
    DROP COLUMN IF EXISTS salt,
    DROP COLUMN IF EXISTS taker_amount,
    DROP COLUMN IF EXISTS maker_amount,
    DROP COLUMN IF EXISTS request_fingerprint,
    DROP COLUMN IF EXISTS preview_ref;

ALTER TABLE markets_order_attempts
    DROP CONSTRAINT IF EXISTS markets_order_attempts_attempt_status_check;

ALTER TABLE markets_order_attempts
    ADD CONSTRAINT markets_order_attempts_attempt_status_check
    CHECK (attempt_status IN (
        'preview_issued', 'submitted', 'accepted', 'rejected', 'integrity_failed'
    ));

ALTER TABLE markets_user_orders
    DROP CONSTRAINT IF EXISTS markets_user_orders_status_check;

ALTER TABLE markets_user_orders
    ADD CONSTRAINT markets_user_orders_status_check
    CHECK (status IN (
        'previewed', 'submitted', 'open', 'partially_filled', 'filled',
        'cancel_pending', 'canceled', 'rejected', 'expired', 'unknown'
    ));

ALTER TABLE markets_user_orders
    ADD CONSTRAINT markets_user_orders_idempotency_key_key UNIQUE (idempotency_key);
