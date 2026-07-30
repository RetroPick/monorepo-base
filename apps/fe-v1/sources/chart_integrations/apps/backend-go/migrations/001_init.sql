CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS market_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  market_type TEXT NOT NULL,
  symbol TEXT NOT NULL,
  params JSONB NOT NULL DEFAULT '{}',
  resolver_formula TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES market_templates(id),
  epoch_id BIGINT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('OPEN','LOCKED','RESOLVING','PAYOUT','CLAIMABLE','VOIDED')),
  open_at TIMESTAMPTZ NOT NULL,
  lock_at TIMESTAMPTZ NOT NULL,
  resolve_at TIMESTAMPTZ NOT NULL,
  payout_at TIMESTAMPTZ NOT NULL,
  lock_value NUMERIC,
  resolve_value NUMERIC,
  path_high NUMERIC,
  path_low NUMERIC,
  winning_outcome TEXT,
  lock_payload_hash TEXT,
  resolve_payload_hash TEXT,
  evidence JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID REFERENCES rounds(id),
  user_address TEXT NOT NULL,
  outcome_index INT NOT NULL,
  amount NUMERIC NOT NULL,
  estimated_payout NUMERIC NOT NULL DEFAULT 0,
  payout NUMERIC NOT NULL DEFAULT 0,
  claimed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evidence_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID REFERENCES rounds(id),
  source TEXT NOT NULL,
  observed_value NUMERIC,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  normalized_payload JSONB NOT NULL DEFAULT '{}',
  payload_hash TEXT NOT NULL,
  final_outcome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
