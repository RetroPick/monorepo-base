CREATE TABLE IF NOT EXISTS reporter_identity (
    id BIGSERIAL PRIMARY KEY,
    address BYTEA NOT NULL UNIQUE,
    pubkey BYTEA,
    role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reporter_submissions (
    id BIGSERIAL PRIMARY KEY,
    template_id TEXT NOT NULL,
    epoch_id BIGINT NOT NULL,
    reporter_id BIGINT NOT NULL REFERENCES reporter_identity(id),
    outcome JSONB NOT NULL,
    evidence JSONB NOT NULL,
    evidence_hash BYTEA NOT NULL,
    signature BYTEA NOT NULL,
    nonce BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (template_id, epoch_id, reporter_id, nonce)
);

CREATE TABLE IF NOT EXISTS reporter_audit_log (
    id BIGSERIAL PRIMARY KEY,
    submission_id BIGINT REFERENCES reporter_submissions(id),
    actor_id BIGINT REFERENCES reporter_identity(id),
    action TEXT NOT NULL,
    reason TEXT,
    tx_hash BYTEA,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reporter_submissions_status ON reporter_submissions (status, created_at);
