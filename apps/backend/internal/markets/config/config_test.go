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

func TestLoad_AllowsRealtimeEnabledInExplicitLocalEnvironments(t *testing.T) {
	for _, environment := range []string{"development", "dev", "test"} {
		t.Run(environment, func(t *testing.T) {
			t.Setenv("DATABASE_URL", "postgres://example")
			t.Setenv("ENVIRONMENT", environment)
			t.Setenv("MARKETS_REALTIME_ENABLED", "1")
			t.Setenv("MARKETS_REALTIME_ALLOWED_ORIGINS", "")
			cfg, err := marketsconfig.Load()
			if err != nil {
				t.Fatal(err)
			}
			if !cfg.RealtimeEnabled {
				t.Fatal("expected realtime enabled")
			}
			if len(cfg.RealtimeAllowedOrigins) == 0 {
				t.Fatal("expected explicit loopback origins for local environment")
			}
		})
	}
}

func TestLoad_ProductionLikeRealtimeRequiresAllowedOrigins(t *testing.T) {
	for _, environment := range []string{"production", "staging"} {
		t.Run(environment, func(t *testing.T) {
			t.Setenv("DATABASE_URL", "postgres://example")
			t.Setenv("ENVIRONMENT", environment)
			t.Setenv("MARKETS_REALTIME_ENABLED", "1")
			t.Setenv("MARKETS_REALTIME_ALLOWED_ORIGINS", "")
			_, err := marketsconfig.Load()
			if err == nil {
				t.Fatal("expected empty realtime origin allowlist to be rejected")
			}
		})
	}
}

func TestLoad_ProductionLikeRealtimeAcceptsExactOrigins(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://example")
	t.Setenv("ENVIRONMENT", "production")
	t.Setenv("MARKETS_REALTIME_ENABLED", "1")
	t.Setenv("MARKETS_REALTIME_ALLOWED_ORIGINS", "HTTPS://App.Example:8443")
	cfg, err := marketsconfig.Load()
	if err != nil {
		t.Fatal(err)
	}
	if got := cfg.RealtimeAllowedOrigins; len(got) != 1 || got[0] != "https://app.example:8443" {
		t.Fatalf("origins = %#v", got)
	}
}

func TestLoad_RejectsMalformedRealtimeAllowedOrigin(t *testing.T) {
	for _, origin := range []string{"https://app.example/path", "https://*.example", "app.example"} {
		t.Run(origin, func(t *testing.T) {
			t.Setenv("DATABASE_URL", "postgres://example")
			t.Setenv("ENVIRONMENT", "development")
			t.Setenv("MARKETS_REALTIME_ALLOWED_ORIGINS", origin)
			_, err := marketsconfig.Load()
			if err == nil {
				t.Fatal("expected malformed realtime origin to be rejected")
			}
		})
	}
}

func TestLoad_DisabledRealtimeDoesNotRequireAllowedOrigins(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://example")
	t.Setenv("ENVIRONMENT", "production")
	t.Setenv("MARKETS_REALTIME_ENABLED", "0")
	t.Setenv("MARKETS_REALTIME_ALLOWED_ORIGINS", "")
	cfg, err := marketsconfig.Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.RealtimeEnabled {
		t.Fatal("expected realtime disabled")
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
