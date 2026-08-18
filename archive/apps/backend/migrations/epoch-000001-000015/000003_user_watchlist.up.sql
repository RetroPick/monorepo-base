CREATE TABLE user_watchlist (
    user_address VARCHAR(42) NOT NULL,
    template_id BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_address, template_id)
);

CREATE INDEX idx_user_watchlist_user ON user_watchlist (LOWER(user_address));

CREATE TABLE user_watchlist_nonce (
    user_address VARCHAR(42) PRIMARY KEY,
    nonce BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
