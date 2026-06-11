package config

import (
	"strings"
	"testing"
)

func TestLoad_ProductionRequiresExplicitRPCURL(t *testing.T) {
	setBaseEnv(t)
	t.Setenv("ENVIRONMENT", "production")
	t.Setenv("RPC_URL", "")

	_, err := Load()
	if err == nil || !strings.Contains(err.Error(), "RPC_URL is required in production") {
		t.Fatalf("expected production RPC_URL validation error, got %v", err)
	}
}

func TestLoad_ProductionRejectsPlaceholderSecrets(t *testing.T) {
	setBaseEnv(t)
	t.Setenv("ENVIRONMENT", "production")
	t.Setenv("AUTH_JWT_SECRET", "change-me")
	t.Setenv("AUTH_SESSION_SECRET", "replace-me")

	_, err := Load()
	if err == nil || !strings.Contains(err.Error(), "AUTH_JWT_SECRET must be set to a non-placeholder value in production") {
		t.Fatalf("expected placeholder secret validation error, got %v", err)
	}
}

func TestLoad_ProductionRequiresKeeperKeyFileWhenEnabled(t *testing.T) {
	setBaseEnv(t)
	t.Setenv("ENVIRONMENT", "production")
	t.Setenv("KEEPER_ENABLED", "1")
	t.Setenv("KEEPER_PRIVATE_KEY_FILE", "")

	_, err := Load()
	if err == nil || !strings.Contains(err.Error(), "KEEPER_PRIVATE_KEY_FILE is required when KEEPER_ENABLED=1 in production") {
		t.Fatalf("expected keeper key validation error, got %v", err)
	}
}

func TestLoad_ProductionAcceptsValidConfig(t *testing.T) {
	setBaseEnv(t)
	t.Setenv("ENVIRONMENT", "production")
	t.Setenv("INDEXER_START_BLOCK", "123456")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if cfg.Environment != "production" {
		t.Fatalf("Environment = %q, want production", cfg.Environment)
	}
	if cfg.IndexerStartBlock != 123456 {
		t.Fatalf("IndexerStartBlock = %d, want 123456", cfg.IndexerStartBlock)
	}
}

func setBaseEnv(t *testing.T) {
	t.Helper()
	t.Setenv("DATABASE_URL", "postgres://retropick:secret@localhost:5432/retropick?sslmode=disable")
	t.Setenv("RPC_URL", "https://mainnet.base.org")
	t.Setenv("CORS_STRICT", "1")
	t.Setenv("CORS_ALLOWED_ORIGINS", "https://app.retropick.example")
	t.Setenv("WS_ALLOWED_ORIGINS", "https://app.retropick.example")
	t.Setenv("TRUSTED_PROXY_CIDRS", "172.16.0.0/12")
	t.Setenv("AUTH_JWT_SECRET", "super-secret-jwt-value")
	t.Setenv("AUTH_SESSION_SECRET", "super-secret-session-value")
	t.Setenv("KEEPER_ENABLED", "0")
	t.Setenv("KEEPER_PRIVATE_KEY_FILE", "/run/secrets/keeper.key")
	t.Setenv("SETTLEMENT_USDC_ADDRESS", "0x1111111111111111111111111111111111111111")
	t.Setenv("SETTLEMENT_RECEIVER_ADDRESS", "0x2222222222222222222222222222222222222222")
	t.Setenv("LIFI_WEBHOOK_SECRET", "super-secret-webhook-value")
}
