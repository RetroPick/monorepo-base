CREATE TABLE funding_transition_guards (
    id BIGSERIAL PRIMARY KEY,
    funding_intent_id UUID NOT NULL REFERENCES funding_intents(id) ON DELETE CASCADE,
    to_status TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (funding_intent_id, to_status, idempotency_key)
);
