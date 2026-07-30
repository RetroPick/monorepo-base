package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

const (
	defaultHTTPPort            = 8080
	defaultGammaURL            = "https://gamma-api.polymarket.com"
	defaultCLOBURL             = "https://clob.polymarket.com"
	defaultCatalogSyncInterval = 5 * time.Minute
	defaultCatalogPageSize     = 50
	defaultCatalogMaxPages     = 2
	defaultCatalogMaxStaleAge  = 15 * time.Minute
	defaultCatalogBackoff      = 30 * time.Second
	defaultShutdownTimeout     = 15 * time.Second
)

// Config holds Markets-only runtime settings without legacy epoch dependencies.
type Config struct {
	HTTPPort              int
	DatabaseURL           string
	BuildVersion          string
	BuildCommit           string
	BuildTime             string
	GammaAPIURL           string
	CLOBAPIURL            string
	CatalogEnabled        bool
	MarketDataEnabled     bool
	BookMaxAge            time.Duration
	CatalogSyncInterval   time.Duration
	CatalogPageSize       int
	CatalogMaxPagesPerRun int
	CatalogMaxStaleAge    time.Duration
	CatalogBackoff        time.Duration
	ShutdownTimeout       time.Duration
	SignalsEnabled        bool
	RealtimeEnabled       bool
	DBMaxConns            int32
	DBMinConns            int32
}

func Load() (Config, error) {
	bookMaxAge := 10 * time.Second
	if raw := strings.TrimSpace(os.Getenv("MARKETS_BOOK_MAX_AGE")); raw != "" {
		parsed, err := time.ParseDuration(raw)
		if err != nil {
			return Config{}, fmt.Errorf("MARKETS_BOOK_MAX_AGE: %w", err)
		}
		bookMaxAge = parsed
	}
	syncInterval := defaultCatalogSyncInterval
	if raw := strings.TrimSpace(os.Getenv("MARKETS_CATALOG_SYNC_INTERVAL")); raw != "" {
		parsed, err := time.ParseDuration(raw)
		if err != nil {
			return Config{}, fmt.Errorf("MARKETS_CATALOG_SYNC_INTERVAL: %w", err)
		}
		syncInterval = parsed
	}
	maxStale := defaultCatalogMaxStaleAge
	if raw := strings.TrimSpace(os.Getenv("MARKETS_CATALOG_MAX_STALE_AGE")); raw != "" {
		parsed, err := time.ParseDuration(raw)
		if err != nil {
			return Config{}, fmt.Errorf("MARKETS_CATALOG_MAX_STALE_AGE: %w", err)
		}
		maxStale = parsed
	}
	backoff := defaultCatalogBackoff
	if raw := strings.TrimSpace(os.Getenv("MARKETS_CATALOG_BACKOFF")); raw != "" {
		parsed, err := time.ParseDuration(raw)
		if err != nil {
			return Config{}, fmt.Errorf("MARKETS_CATALOG_BACKOFF: %w", err)
		}
		backoff = parsed
	}
	shutdown := defaultShutdownTimeout
	if raw := strings.TrimSpace(os.Getenv("MARKETS_SHUTDOWN_TIMEOUT")); raw != "" {
		parsed, err := time.ParseDuration(raw)
		if err != nil {
			return Config{}, fmt.Errorf("MARKETS_SHUTDOWN_TIMEOUT: %w", err)
		}
		shutdown = parsed
	}

	cfg := Config{
		HTTPPort:              envInt("MARKETS_HTTP_PORT", defaultHTTPPort),
		DatabaseURL:           strings.TrimSpace(os.Getenv("DATABASE_URL")),
		BuildVersion:          strings.TrimSpace(os.Getenv("BUILD_VERSION")),
		BuildCommit:           strings.TrimSpace(os.Getenv("BUILD_COMMIT")),
		BuildTime:             strings.TrimSpace(os.Getenv("BUILD_TIME")),
		GammaAPIURL:           envDefault("MARKETS_GAMMA_API_URL", defaultGammaURL),
		CLOBAPIURL:            envDefault("MARKETS_CLOB_API_URL", defaultCLOBURL),
		CatalogEnabled:        envDefault("MARKETS_CATALOG_ENABLED", "1") != "0",
		MarketDataEnabled:     envDefault("MARKETS_MARKET_DATA_ENABLED", "1") != "0",
		BookMaxAge:            bookMaxAge,
		CatalogSyncInterval:   syncInterval,
		CatalogPageSize:       envInt("MARKETS_CATALOG_PAGE_SIZE", defaultCatalogPageSize),
		CatalogMaxPagesPerRun: envInt("MARKETS_CATALOG_MAX_PAGES", defaultCatalogMaxPages),
		CatalogMaxStaleAge:    maxStale,
		CatalogBackoff:        backoff,
		ShutdownTimeout:       shutdown,
		SignalsEnabled:        envDefault("MARKETS_SIGNALS_ENABLED", "1") != "0",
		RealtimeEnabled:       envDefault("MARKETS_REALTIME_ENABLED", "0") == "1",
		DBMaxConns:            int32(envInt("DB_MAX_CONNS", 8)),
		DBMinConns:            int32(envInt("DB_MIN_CONNS", 1)),
	}
	if cfg.DatabaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required")
	}
	if cfg.CatalogPageSize < 1 || cfg.CatalogPageSize > 100 {
		return Config{}, fmt.Errorf("MARKETS_CATALOG_PAGE_SIZE must be between 1 and 100")
	}
	if cfg.CatalogMaxPagesPerRun < 1 || cfg.CatalogMaxPagesPerRun > 1000 {
		return Config{}, fmt.Errorf("MARKETS_CATALOG_MAX_PAGES must be between 1 and 1000")
	}
	return cfg, nil
}

func envDefault(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func envInt(key string, fallback int) int {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return value
}
