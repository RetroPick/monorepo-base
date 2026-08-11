package config_test

import (
	"os"
	"testing"
	"time"

	marketsconfig "retropick/apps/backend/internal/markets/config"
)

func TestLoad_RejectsInvalidIntegerEnv(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://example")
	t.Setenv("MARKETS_HTTP_PORT", "not-a-port")
	_, err := marketsconfig.Load()
	if err == nil {
		t.Fatal("expected invalid port error")
	}
}

func TestLoad_AllowsRealtimeEnabled(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://example")
	t.Setenv("MARKETS_REALTIME_ENABLED", "1")
	cfg, err := marketsconfig.Load()
	if err != nil {
		t.Fatal(err)
	}
	if !cfg.RealtimeEnabled {
		t.Fatal("expected realtime enabled")
	}
}

func TestLoad_RejectsPoolMinGreaterThanMax(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://example")
	t.Setenv("DB_MIN_CONNS", "10")
	t.Setenv("DB_MAX_CONNS", "2")
	_, err := marketsconfig.Load()
	if err == nil {
		t.Fatal("expected pool bounds error")
	}
}

func TestLoad_MarketsAPIRequiresDatabase(t *testing.T) {
	t.Setenv("DATABASE_URL", "")
	_, err := marketsconfig.Load()
	if err == nil {
		t.Fatal("expected error without DATABASE_URL")
	}
}

func TestLoad_MarketsAPIDefaults(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://example")
	cfg, err := marketsconfig.Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.HTTPPort != 8080 {
		t.Fatalf("port %d", cfg.HTTPPort)
	}
	if cfg.CatalogSyncInterval != 5*time.Minute {
		t.Fatalf("sync interval %s", cfg.CatalogSyncInterval)
	}
	if cfg.BookMaxAge != 10*time.Second {
		t.Fatalf("book max age %s", cfg.BookMaxAge)
	}
	if !cfg.CatalogEnabled || !cfg.MarketDataEnabled {
		t.Fatalf("flags catalog=%v data=%v", cfg.CatalogEnabled, cfg.MarketDataEnabled)
	}
	if cfg.DataAPIURL != "https://data-api.polymarket.com" {
		t.Fatalf("data api url %q", cfg.DataAPIURL)
	}
}

func TestLoad_DataAPIURLEnvOverride(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://example")
	t.Setenv("MARKETS_DATA_API_URL", "http://127.0.0.1:9009")
	cfg, err := marketsconfig.Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.DataAPIURL != "http://127.0.0.1:9009" {
		t.Fatalf("data api url %q", cfg.DataAPIURL)
	}
}

func TestMain(m *testing.M) {
	os.Exit(m.Run())
}
