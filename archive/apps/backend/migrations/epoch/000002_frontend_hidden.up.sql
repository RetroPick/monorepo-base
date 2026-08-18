-- Markets listed here are omitted from public GET /api/v1/markets and return 404 on
-- GET /api/v1/markets/{templateId}* (chain-markets in fe-v1). Does not remove on-chain data.
CREATE TABLE frontend_hidden_templates (
    template_id BYTEA PRIMARY KEY REFERENCES templates (template_id) ON DELETE CASCADE,
    hidden_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_frontend_hidden_hidden_at ON frontend_hidden_templates (hidden_at DESC);
