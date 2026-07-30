package main_test

import (
	"testing"

	marketsconfig "retropick/apps/backend/internal/markets/config"
)

func TestMarketsAPIConfigLoadsWithoutLegacyRegistry(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://example")
	cfg, err := marketsconfig.Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.DatabaseURL == "" {
		t.Fatal("expected database url")
	}
}
