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
		HTTPPort:              defaultHTTPPort,
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
		CatalogPageSize:       defaultCatalogPageSize,
		CatalogMaxPagesPerRun: defaultCatalogMaxPages,
		CatalogMaxStaleAge:    maxStale,
		CatalogBackoff:        backoff,
		ShutdownTimeout:       shutdown,
		SignalsEnabled:        envDefault("MARKETS_SIGNALS_ENABLED", "1") != "0",
		RealtimeEnabled:       envDefault("MARKETS_REALTIME_ENABLED", "0") == "1",
		DBMaxConns:            8,
		DBMinConns:            1,
	}
	var err error
	if cfg.HTTPPort, err = parseEnvInt("MARKETS_HTTP_PORT", defaultHTTPPort); err != nil {
		return Config{}, err
	}
	if cfg.CatalogPageSize, err = parseEnvInt("MARKETS_CATALOG_PAGE_SIZE", defaultCatalogPageSize); err != nil {
		return Config{}, err
	}
	if cfg.CatalogMaxPagesPerRun, err = parseEnvInt("MARKETS_CATALOG_MAX_PAGES", defaultCatalogMaxPages); err != nil {
		return Config{}, err
	}
	if maxConns, err := parseEnvInt("DB_MAX_CONNS", 8); err != nil {
		return Config{}, err
	} else {
		cfg.DBMaxConns = int32(maxConns)
	}
	if minConns, err := parseEnvInt("DB_MIN_CONNS", 1); err != nil {
		return Config{}, err
	} else {
		cfg.DBMinConns = int32(minConns)
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
	if cfg.DBMinConns < 1 {
		return Config{}, fmt.Errorf("DB_MIN_CONNS must be at least 1")
	}
	if cfg.DBMaxConns < cfg.DBMinConns {
		return Config{}, fmt.Errorf("DB_MIN_CONNS must be <= DB_MAX_CONNS")
	}
	if cfg.HTTPPort < 1 || cfg.HTTPPort > 65535 {
		return Config{}, fmt.Errorf("MARKETS_HTTP_PORT must be between 1 and 65535")
	}
	if cfg.RealtimeEnabled {
		return Config{}, fmt.Errorf("MARKETS_REALTIME_ENABLED is not supported in phase 1.1")
	}
	return cfg, nil
}

func envDefault(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func parseEnvInt(key string, fallback int) (int, error) {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback, nil
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return 0, fmt.Errorf("%s: %w", key, err)
	}
	return value, nil
}
