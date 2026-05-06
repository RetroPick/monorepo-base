package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	DatabaseURL           string
	RPCURL                string
	HTTPPort              int
	DBMaxConns            int32
	DBMinConns            int32
	DBMaxConnLifetime     time.Duration
	DBHealthCheckInterval time.Duration
	LiveRPCTimeout        time.Duration
	LiveRPCGlobalCacheTTL time.Duration
	BuildVersion          string
	BuildCommit           string
	BuildTime             string
	// LogLevel: debug, info, warn, error
	LogLevel string

	// FaucetRelayEnabled requires FAUCET_RELAY_ENABLED=1 and a funded FAUCET_RELAYER_PRIVATE_KEY (Base Sepolia).
	FaucetRelayEnabled    bool
	FaucetRelayPrivateKey string // hex, optional; omit 0x prefix ok
	// FaucetRelayDeadlineMax caps how far in the future users may set EIP-712 deadline (default 15m).
	FaucetRelayDeadlineMax  time.Duration
	LifiBaseURL             string
	LifiTimeout             time.Duration
	FundingAllowedChains    []int64
	FundingAllowedTokens    []string
	FundingAllowedProviders []string
	AuthJWTSecret           string
	AuthSessionSecret       string
	AuthSessionTTL          time.Duration
	AuthNonceTTL            time.Duration
	AuthCookieDomain        string
	AuthCookieSecure        bool
	AuthCookieSameSite      string
	WSAllowedOrigins        []string
	IndexerFinalityDepth    uint64
	SettlementChainID       int64
	SettlementUSDCAddress   string
	SettlementReceiver      string
	MinDepositUSDC          string
	SoftMaxDepositUSDC      string
	HardMaxDepositUSDC      string
	MarketEntrySafetyBuffer time.Duration
	LifiWebhookSecret       string
	DestinationPollInterval time.Duration
	MatcherPollInterval     time.Duration
}

func Load() (*Config, error) {
	db := os.Getenv("DATABASE_URL")
	if db == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}
	rpc := os.Getenv("RPC_URL")
	if rpc == "" {
		rpc = "https://sepolia.base.org"
	}
	port := 8080
	if p := os.Getenv("PORT"); p != "" {
		v, err := strconv.Atoi(p)
		if err != nil {
			return nil, fmt.Errorf("PORT: %w", err)
		}
		port = v
	}
	level := os.Getenv("LOG_LEVEL")
	if level == "" {
		level = "info"
	}
	maxConns, err := int32FromEnv("DB_MAX_CONNS", 16)
	if err != nil {
		return nil, err
	}
	minConns, err := int32FromEnv("DB_MIN_CONNS", defaultMinConns())
	if err != nil {
		return nil, err
	}
	if maxConns > 0 && minConns > maxConns {
		return nil, fmt.Errorf("DB_MIN_CONNS must be <= DB_MAX_CONNS")
	}
	maxLifetime, err := durationFromEnv("DB_MAX_CONN_LIFETIME", 30*time.Minute)
	if err != nil {
		return nil, err
	}
	healthInterval, err := durationFromEnv("DB_HEALTH_CHECK_INTERVAL", 30*time.Second)
	if err != nil {
		return nil, err
	}
	liveTimeout, err := durationFromEnv("LIVE_RPC_TIMEOUT", 15*time.Second)
	if err != nil {
		return nil, err
	}
	liveCacheTTL, err := durationFromEnv("LIVE_RPC_GLOBAL_CACHE_TTL", 5*time.Second)
	if err != nil {
		return nil, err
	}
	faucetRelayDeadlineMax, err := durationFromEnv("FAUCET_RELAY_DEADLINE_MAX", 15*time.Minute)
	if err != nil {
		return nil, err
	}
	lifiTimeout, err := durationFromEnv("LIFI_TIMEOUT", 4*time.Second)
	if err != nil {
		return nil, err
	}
	authSessionTTL, err := durationFromEnv("AUTH_SESSION_TTL", 7*24*time.Hour)
	if err != nil {
		return nil, err
	}
	authNonceTTL, err := durationFromEnv("AUTH_NONCE_TTL", 10*time.Minute)
	if err != nil {
		return nil, err
	}
	marketEntrySafetyBuffer, err := durationFromEnv("MARKET_ENTRY_SAFETY_BUFFER", 90*time.Second)
	if err != nil {
		return nil, err
	}
	destinationPollInterval, err := durationFromEnv("DESTINATION_POLL_INTERVAL", 4*time.Second)
	if err != nil {
		return nil, err
	}
	matcherPollInterval, err := durationFromEnv("MATCHER_POLL_INTERVAL", 2*time.Second)
	if err != nil {
		return nil, err
	}
	faucetRelayKey := strings.TrimSpace(os.Getenv("FAUCET_RELAYER_PRIVATE_KEY"))
	faucetRelayEnabled := os.Getenv("FAUCET_RELAY_ENABLED") == "1" && faucetRelayKey != ""
	indexerFinalityDepth := uint64(3)
	if raw := strings.TrimSpace(os.Getenv("INDEXER_FINALITY_DEPTH")); raw != "" {
		n, err := strconv.ParseUint(raw, 10, 64)
		if err != nil {
			return nil, fmt.Errorf("INDEXER_FINALITY_DEPTH: %w", err)
		}
		indexerFinalityDepth = n
	}
	settlementChainID := int64(8453)
	if raw := strings.TrimSpace(os.Getenv("SETTLEMENT_CHAIN_ID")); raw != "" {
		v, err := strconv.ParseInt(raw, 10, 64)
		if err != nil {
			return nil, fmt.Errorf("SETTLEMENT_CHAIN_ID: %w", err)
		}
		settlementChainID = v
	}
	return &Config{
		DatabaseURL:             db,
		RPCURL:                  rpc,
		HTTPPort:                port,
		DBMaxConns:              maxConns,
		DBMinConns:              minConns,
		DBMaxConnLifetime:       maxLifetime,
		DBHealthCheckInterval:   healthInterval,
		LiveRPCTimeout:          liveTimeout,
		LiveRPCGlobalCacheTTL:   liveCacheTTL,
		BuildVersion:            envDefault("BUILD_VERSION", "dev"),
		BuildCommit:             envDefault("BUILD_COMMIT", "unknown"),
		BuildTime:               envDefault("BUILD_TIME", "unknown"),
		LogLevel:                level,
		FaucetRelayEnabled:      faucetRelayEnabled,
		FaucetRelayPrivateKey:   faucetRelayKey,
		FaucetRelayDeadlineMax:  faucetRelayDeadlineMax,
		LifiBaseURL:             strings.TrimSpace(os.Getenv("LIFI_BASE_URL")),
		LifiTimeout:             lifiTimeout,
		FundingAllowedChains:    parseInt64CSV(os.Getenv("FUNDING_ALLOWED_CHAIN_IDS")),
		FundingAllowedTokens:    parseCSVLower(os.Getenv("FUNDING_ALLOWED_TOKENS")),
		FundingAllowedProviders: parseCSVUpper(os.Getenv("FUNDING_ALLOWED_PROVIDERS")),
		AuthJWTSecret:           strings.TrimSpace(os.Getenv("AUTH_JWT_SECRET")),
		AuthSessionSecret:       strings.TrimSpace(envDefault("AUTH_SESSION_SECRET", strings.TrimSpace(os.Getenv("AUTH_JWT_SECRET")))),
		AuthSessionTTL:          authSessionTTL,
		AuthNonceTTL:            authNonceTTL,
		AuthCookieDomain:        strings.TrimSpace(os.Getenv("AUTH_COOKIE_DOMAIN")),
		AuthCookieSecure:        os.Getenv("AUTH_COOKIE_SECURE") == "1",
		AuthCookieSameSite:      strings.TrimSpace(envDefault("AUTH_COOKIE_SAMESITE", "Lax")),
		WSAllowedOrigins:        parseCSVLower(os.Getenv("WS_ALLOWED_ORIGINS")),
		IndexerFinalityDepth:    indexerFinalityDepth,
		SettlementChainID:       settlementChainID,
		SettlementUSDCAddress:   strings.ToLower(strings.TrimSpace(os.Getenv("SETTLEMENT_USDC_ADDRESS"))),
		SettlementReceiver:      strings.ToLower(strings.TrimSpace(os.Getenv("SETTLEMENT_RECEIVER_ADDRESS"))),
		MinDepositUSDC:          envDefault("MIN_DEPOSIT_USDC", "5000000"),
		SoftMaxDepositUSDC:      envDefault("SOFT_MAX_DEPOSIT_USDC", "500000000"),
		HardMaxDepositUSDC:      envDefault("HARD_MAX_DEPOSIT_USDC", "2000000000"),
		MarketEntrySafetyBuffer: marketEntrySafetyBuffer,
		LifiWebhookSecret:       strings.TrimSpace(os.Getenv("LIFI_WEBHOOK_SECRET")),
		DestinationPollInterval: destinationPollInterval,
		MatcherPollInterval:     matcherPollInterval,
	}, nil
}

func defaultMinConns() int32 {
	// Vercel/serverless environments are bursty and work better without
	// pre-opening idle DB connections.
	if os.Getenv("VERCEL") != "" {
		return 0
	}
	return 2
}

func envDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func int32FromEnv(key string, fallback int32) (int32, error) {
	raw := os.Getenv(key)
	if raw == "" {
		return fallback, nil
	}
	v, err := strconv.ParseInt(raw, 10, 32)
	if err != nil || v < 0 {
		if err == nil {
			err = fmt.Errorf("must be >= 0")
		}
		return 0, fmt.Errorf("%s: %w", key, err)
	}
	return int32(v), nil
}

func durationFromEnv(key string, fallback time.Duration) (time.Duration, error) {
	raw := os.Getenv(key)
	if raw == "" {
		return fallback, nil
	}
	if seconds, err := strconv.ParseInt(raw, 10, 64); err == nil && seconds > 0 {
		return time.Duration(seconds) * time.Second, nil
	}
	d, err := time.ParseDuration(raw)
	if err != nil || d <= 0 {
		if err == nil {
			err = fmt.Errorf("must be > 0")
		}
		return 0, fmt.Errorf("%s: %w", key, err)
	}
	return d, nil
}

func parseCSVLower(raw string) []string {
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		value := strings.ToLower(strings.TrimSpace(part))
		if value != "" {
			out = append(out, value)
		}
	}
	return out
}

func parseCSVUpper(raw string) []string {
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		value := strings.ToUpper(strings.TrimSpace(part))
		if value != "" {
			out = append(out, value)
		}
	}
	return out
}

func parseInt64CSV(raw string) []int64 {
	parts := strings.Split(raw, ",")
	out := make([]int64, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		value, err := strconv.ParseInt(part, 10, 64)
		if err == nil && value > 0 {
			out = append(out, value)
		}
	}
	return out
}
