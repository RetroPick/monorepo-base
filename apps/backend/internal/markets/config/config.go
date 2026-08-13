package config

import (
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

const (
	defaultHTTPPort            = 8080
	defaultGammaURL            = "https://gamma-api.polymarket.com"
	defaultCLOBURL             = "https://clob.polymarket.com"
	defaultDataAPIURL          = "https://data-api.polymarket.com"
	defaultCatalogSyncInterval = 5 * time.Minute
	defaultCatalogPageSize     = 50
	defaultCatalogMaxPages     = 2
	defaultCatalogMaxStaleAge  = 15 * time.Minute
	defaultCatalogBackoff      = 30 * time.Second
	defaultShutdownTimeout     = 15 * time.Second
)

// Config holds Markets-only runtime settings without legacy epoch dependencies.
type Config struct {
	HTTPPort                     int
	DatabaseURL                  string
	BuildVersion                 string
	BuildCommit                  string
	BuildTime                    string
	GammaAPIURL                  string
	CLOBAPIURL                   string
	DataAPIURL                   string
	CatalogEnabled               bool
	MarketDataEnabled            bool
	BookMaxAge                   time.Duration
	CatalogSyncInterval          time.Duration
	CatalogPageSize              int
	CatalogMaxPagesPerRun        int
	CatalogMaxStaleAge           time.Duration
	CatalogBackoff               time.Duration
	ShutdownTimeout              time.Duration
	SignalsEnabled               bool
	IntelligenceWhaleFeedEnabled bool
	RealtimeEnabled              bool
	RealtimeWSURL                string
	RealtimeMaxAssets            int
	RealtimeMaxPerConn           int
	RealtimeAllowedOrigins       []string
	DBMaxConns                   int32
	DBMinConns                   int32
	TrustedProxyCIDRs            []string
}

func Load() (Config, error) {
	environment := strings.ToLower(strings.TrimSpace(envDefault("ENVIRONMENT", "development")))
	switch environment {
	case "development", "dev", "test", "staging", "production":
	default:
		return Config{}, fmt.Errorf("ENVIRONMENT: unsupported value %q", environment)
	}
	// MKT-NFR-002 / P1-006: production/staging should set MARKETS_BOOK_MAX_AGE=5s
	// for order-book staleness SLO; unset env keeps 10s dev default.
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

	realtimeOriginsRaw := strings.TrimSpace(os.Getenv("MARKETS_REALTIME_ALLOWED_ORIGINS"))
	if realtimeOriginsRaw == "" && (environment == "development" || environment == "dev" || environment == "test") {
		realtimeOriginsRaw = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001"
	}
	realtimeOrigins, err := parseOrigins(realtimeOriginsRaw)
	if err != nil {
		return Config{}, fmt.Errorf("MARKETS_REALTIME_ALLOWED_ORIGINS: %w", err)
	}

	cfg := Config{
		HTTPPort:                     defaultHTTPPort,
		DatabaseURL:                  strings.TrimSpace(os.Getenv("DATABASE_URL")),
		BuildVersion:                 strings.TrimSpace(os.Getenv("BUILD_VERSION")),
		BuildCommit:                  strings.TrimSpace(os.Getenv("BUILD_COMMIT")),
		BuildTime:                    strings.TrimSpace(os.Getenv("BUILD_TIME")),
		GammaAPIURL:                  envDefault("MARKETS_GAMMA_API_URL", defaultGammaURL),
		CLOBAPIURL:                   envDefault("MARKETS_CLOB_API_URL", defaultCLOBURL),
		DataAPIURL:                   envDefault("MARKETS_DATA_API_URL", defaultDataAPIURL),
		CatalogEnabled:               envDefault("MARKETS_CATALOG_ENABLED", "1") != "0",
		MarketDataEnabled:            envDefault("MARKETS_MARKET_DATA_ENABLED", "1") != "0",
		BookMaxAge:                   bookMaxAge,
		CatalogSyncInterval:          syncInterval,
		CatalogPageSize:              defaultCatalogPageSize,
		CatalogMaxPagesPerRun:        defaultCatalogMaxPages,
		CatalogMaxStaleAge:           maxStale,
		CatalogBackoff:               backoff,
		ShutdownTimeout:              shutdown,
		SignalsEnabled:               envDefault("MARKETS_SIGNALS_ENABLED", "1") != "0",
		IntelligenceWhaleFeedEnabled: envDefault("MARKETS_INTELLIGENCE_WHALE_FEED_ENABLED", "0") == "1",
		RealtimeEnabled:              envDefault("MARKETS_REALTIME_ENABLED", "0") == "1",
		RealtimeWSURL:                envDefault("MARKETS_REALTIME_WS_URL", "wss://ws-subscriptions-clob.polymarket.com/ws/market"),
		RealtimeMaxAssets:            200,
		RealtimeMaxPerConn:           50,
		RealtimeAllowedOrigins:       realtimeOrigins,
		DBMaxConns:                   8,
		DBMinConns:                   1,
		TrustedProxyCIDRs:            parseCSV(envDefault("TRUSTED_PROXY_CIDRS", "")),
	}
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
	if cfg.RealtimeEnabled && cfg.RealtimeWSURL == "" {
		return Config{}, fmt.Errorf("MARKETS_REALTIME_WS_URL is required when realtime enabled")
	}
	if cfg.RealtimeEnabled && (environment == "production" || environment == "staging") && len(cfg.RealtimeAllowedOrigins) == 0 {
		return Config{}, fmt.Errorf("MARKETS_REALTIME_ALLOWED_ORIGINS is required when realtime is enabled in %s", environment)
	}
	if maxAssets, err := parseEnvInt("MARKETS_REALTIME_MAX_ASSETS", 200); err != nil {
		return Config{}, err
	} else {
		cfg.RealtimeMaxAssets = maxAssets
	}
	if maxPerConn, err := parseEnvInt("MARKETS_REALTIME_MAX_PER_CONN", 50); err != nil {
		return Config{}, err
	} else {
		cfg.RealtimeMaxPerConn = maxPerConn
	}
	return cfg, nil
}

func parseOrigins(raw string) ([]string, error) {
	origins := parseCSV(raw)
	for i, origin := range origins {
		parsed, err := url.Parse(origin)
		if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Host == "" || strings.Contains(parsed.Host, "*") || parsed.User != nil || parsed.Path != "" || parsed.RawQuery != "" || parsed.Fragment != "" {
			return nil, fmt.Errorf("%q must be an exact http(s) origin (scheme and host with optional port)", origin)
		}
		origins[i] = strings.ToLower(parsed.Scheme) + "://" + strings.ToLower(parsed.Host)
	}
	return origins, nil
}

func parseCSV(raw string) []string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			out = append(out, part)
		}
	}
	return out
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
