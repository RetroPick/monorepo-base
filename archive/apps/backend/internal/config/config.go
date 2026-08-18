package config

import (
	"fmt"
	"net/netip"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"retropick/apps/backend/internal/registry"
)

type Config struct {
	Environment           string
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
	TrustedProxyCIDRs       []string
	IndexerStartBlock       uint64
	IndexerLookbackBlocks   uint64
	IndexerFinalityDepth    uint64
	IndexerTickInterval     time.Duration
	IndexerMaxBlocksPerTick uint64
	RPCFallbackURLs         []string
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
	KeeperEnabled           bool
	KeeperPrivateKeyFile    string
	KeeperPollInterval      time.Duration
	KeeperReceiptTimeout    time.Duration
	KeeperMaxRetryCount     int
	AlertWebhookURL         string
	AlertPollInterval       time.Duration
	PricePollInterval       time.Duration
	PriceHeartbeatInterval  time.Duration

	// V3 feature flags (default off).
	GoodDollarEnabled        bool
	FeeRouterEnabled         bool
	FeeRouterAddress         string
	ReferralsEnabled         bool
	RewardsEnabled           bool
	ImpactEnabled            bool
	CeloChainID              int64
	CeloRPCURL               string
	RegistryPath             string
	MarketsGammaAPIURL       string
	MarketsCLOBAPIURL        string
	MarketsCatalogEnabled    bool
	MarketsMarketDataEnabled bool
	MarketsBookMaxAge        time.Duration
}

func Load() (*Config, error) {
	environment := strings.ToLower(strings.TrimSpace(envDefault("ENVIRONMENT", "development")))
	switch environment {
	case "development", "dev", "staging", "production", "test":
	default:
		return nil, fmt.Errorf("ENVIRONMENT: unsupported value %q", environment)
	}
	db := os.Getenv("DATABASE_URL")
	if db == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}
	rpc := os.Getenv("RPC_URL")
	if rpc == "" && environment != "production" {
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
	indexerTickInterval, err := durationFromEnv("INDEXER_TICK_INTERVAL_MS", 3*time.Second)
	if err != nil {
		return nil, err
	}
	indexerMaxBlocksPerTick := uint64(10_000)
	if raw := strings.TrimSpace(os.Getenv("INDEXER_MAX_BLOCKS_PER_TICK")); raw != "" {
		n, err := strconv.ParseUint(raw, 10, 64)
		if err != nil {
			return nil, fmt.Errorf("INDEXER_MAX_BLOCKS_PER_TICK: %w", err)
		}
		if n > 0 {
			indexerMaxBlocksPerTick = n
		}
	}
	keeperPollInterval, err := durationFromEnv("KEEPER_POLL_INTERVAL", 5*time.Second)
	if err != nil {
		return nil, err
	}
	keeperReceiptTimeout, err := durationFromEnv("KEEPER_RECEIPT_TIMEOUT", 90*time.Second)
	if err != nil {
		return nil, err
	}
	alertPollInterval, err := durationFromEnv("ALERT_POLL_INTERVAL", 15*time.Second)
	if err != nil {
		return nil, err
	}
	pricePollDefault := 10 * time.Second
	if environment == "production" {
		pricePollDefault = 15 * time.Second
	}
	pricePollInterval, err := durationFromEnv("PRICE_POLL_INTERVAL", pricePollDefault)
	if err != nil {
		return nil, err
	}
	priceHeartbeatInterval, err := durationFromEnv("PRICE_HEARTBEAT_INTERVAL", 5*time.Minute)
	if err != nil {
		return nil, err
	}
	marketsBookMaxAge, err := durationFromEnv("MARKETS_BOOK_MAX_AGE", 10*time.Second)
	if err != nil {
		return nil, err
	}
	keeperMaxRetryCount := 3
	if raw := strings.TrimSpace(os.Getenv("KEEPER_MAX_RETRY_COUNT")); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil {
			return nil, fmt.Errorf("KEEPER_MAX_RETRY_COUNT: %w", err)
		}
		if n > 0 {
			keeperMaxRetryCount = n
		}
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
	indexerStartBlock := uint64(0)
	if raw := strings.TrimSpace(os.Getenv("INDEXER_START_BLOCK")); raw != "" {
		n, err := strconv.ParseUint(raw, 10, 64)
		if err != nil {
			return nil, fmt.Errorf("INDEXER_START_BLOCK: %w", err)
		}
		indexerStartBlock = n
	}
	indexerLookbackBlocks := uint64(50_000)
	if raw := strings.TrimSpace(os.Getenv("INDEXER_LOOKBACK_BLOCKS")); raw != "" {
		n, err := strconv.ParseUint(raw, 10, 64)
		if err != nil {
			return nil, fmt.Errorf("INDEXER_LOOKBACK_BLOCKS: %w", err)
		}
		if n > 0 {
			indexerLookbackBlocks = n
		}
	}
	settlementChainID := int64(8453)
	if raw := strings.TrimSpace(os.Getenv("SETTLEMENT_CHAIN_ID")); raw != "" {
		v, err := strconv.ParseInt(raw, 10, 64)
		if err != nil {
			return nil, fmt.Errorf("SETTLEMENT_CHAIN_ID: %w", err)
		}
		settlementChainID = v
	}
	cfg := &Config{
		Environment:              environment,
		DatabaseURL:              db,
		RPCURL:                   rpc,
		HTTPPort:                 port,
		DBMaxConns:               maxConns,
		DBMinConns:               minConns,
		DBMaxConnLifetime:        maxLifetime,
		DBHealthCheckInterval:    healthInterval,
		LiveRPCTimeout:           liveTimeout,
		LiveRPCGlobalCacheTTL:    liveCacheTTL,
		BuildVersion:             envDefault("BUILD_VERSION", "dev"),
		BuildCommit:              envDefault("BUILD_COMMIT", "unknown"),
		BuildTime:                envDefault("BUILD_TIME", "unknown"),
		LogLevel:                 level,
		FaucetRelayEnabled:       faucetRelayEnabled,
		FaucetRelayPrivateKey:    faucetRelayKey,
		FaucetRelayDeadlineMax:   faucetRelayDeadlineMax,
		LifiBaseURL:              strings.TrimSpace(os.Getenv("LIFI_BASE_URL")),
		LifiTimeout:              lifiTimeout,
		FundingAllowedChains:     parseInt64CSV(os.Getenv("FUNDING_ALLOWED_CHAIN_IDS")),
		FundingAllowedTokens:     parseCSVLower(os.Getenv("FUNDING_ALLOWED_TOKENS")),
		FundingAllowedProviders:  parseCSVUpper(os.Getenv("FUNDING_ALLOWED_PROVIDERS")),
		AuthJWTSecret:            strings.TrimSpace(os.Getenv("AUTH_JWT_SECRET")),
		AuthSessionSecret:        strings.TrimSpace(envDefault("AUTH_SESSION_SECRET", strings.TrimSpace(os.Getenv("AUTH_JWT_SECRET")))),
		AuthSessionTTL:           authSessionTTL,
		AuthNonceTTL:             authNonceTTL,
		AuthCookieDomain:         strings.TrimSpace(os.Getenv("AUTH_COOKIE_DOMAIN")),
		AuthCookieSecure:         os.Getenv("AUTH_COOKIE_SECURE") == "1",
		AuthCookieSameSite:       strings.TrimSpace(envDefault("AUTH_COOKIE_SAMESITE", "Lax")),
		WSAllowedOrigins:         parseCSVLower(os.Getenv("WS_ALLOWED_ORIGINS")),
		TrustedProxyCIDRs:        parseCSV(os.Getenv("TRUSTED_PROXY_CIDRS")),
		IndexerStartBlock:        indexerStartBlock,
		IndexerLookbackBlocks:    indexerLookbackBlocks,
		IndexerFinalityDepth:     indexerFinalityDepth,
		IndexerTickInterval:      indexerTickInterval,
		IndexerMaxBlocksPerTick:  indexerMaxBlocksPerTick,
		RPCFallbackURLs:          parseCSV(os.Getenv("RPC_FALLBACK_URLS")),
		SettlementChainID:        settlementChainID,
		SettlementUSDCAddress:    strings.ToLower(strings.TrimSpace(os.Getenv("SETTLEMENT_USDC_ADDRESS"))),
		SettlementReceiver:       strings.ToLower(strings.TrimSpace(os.Getenv("SETTLEMENT_RECEIVER_ADDRESS"))),
		MinDepositUSDC:           envDefault("MIN_DEPOSIT_USDC", "5000000"),
		SoftMaxDepositUSDC:       envDefault("SOFT_MAX_DEPOSIT_USDC", "500000000"),
		HardMaxDepositUSDC:       envDefault("HARD_MAX_DEPOSIT_USDC", "2000000000"),
		MarketEntrySafetyBuffer:  marketEntrySafetyBuffer,
		LifiWebhookSecret:        strings.TrimSpace(os.Getenv("LIFI_WEBHOOK_SECRET")),
		DestinationPollInterval:  destinationPollInterval,
		MatcherPollInterval:      matcherPollInterval,
		KeeperEnabled:            os.Getenv("KEEPER_ENABLED") == "1",
		KeeperPrivateKeyFile:     strings.TrimSpace(envDefault("KEEPER_PRIVATE_KEY_FILE", os.Getenv("KEEPER_SIGNER_PATH"))),
		KeeperPollInterval:       keeperPollInterval,
		KeeperReceiptTimeout:     keeperReceiptTimeout,
		KeeperMaxRetryCount:      keeperMaxRetryCount,
		AlertWebhookURL:          strings.TrimSpace(os.Getenv("ALERT_WEBHOOK_URL")),
		AlertPollInterval:        alertPollInterval,
		PricePollInterval:        pricePollInterval,
		PriceHeartbeatInterval:   priceHeartbeatInterval,
		GoodDollarEnabled:        os.Getenv("GOODDOLLAR_ENABLED") == "1",
		FeeRouterEnabled:         os.Getenv("FEE_ROUTER_ENABLED") == "1",
		FeeRouterAddress:         strings.TrimSpace(os.Getenv("FEE_ROUTER_ADDRESS")),
		ReferralsEnabled:         os.Getenv("REFERRALS_ENABLED") == "1",
		RewardsEnabled:           os.Getenv("REWARDS_ENABLED") == "1",
		ImpactEnabled:            os.Getenv("IMPACT_ENABLED") == "1",
		CeloChainID:              int64FromEnvDefault("CELO_CHAIN_ID", 44787),
		CeloRPCURL:               strings.TrimSpace(envDefault("CELO_RPC_URL", "https://alfajores-forno.celo-testnet.org")),
		RegistryPath:             strings.TrimSpace(os.Getenv("REGISTRY_PATH")),
		MarketsGammaAPIURL:       strings.TrimSpace(envDefault("MARKETS_GAMMA_API_URL", "https://gamma-api.polymarket.com")),
		MarketsCLOBAPIURL:        strings.TrimSpace(envDefault("MARKETS_CLOB_API_URL", "https://clob.polymarket.com")),
		MarketsCatalogEnabled:    envDefault("MARKETS_CATALOG_ENABLED", "1") != "0",
		MarketsMarketDataEnabled: envDefault("MARKETS_MARKET_DATA_ENABLED", "1") != "0",
		MarketsBookMaxAge:        marketsBookMaxAge,
	}
	if err := validateProductionConfig(cfg); err != nil {
		return nil, err
	}
	if err := validateV3Config(cfg); err != nil {
		return nil, err
	}
	return cfg, nil
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

func int64FromEnvDefault(key string, fallback int64) int64 {
	raw := os.Getenv(key)
	if raw == "" {
		return fallback
	}
	v, err := strconv.ParseInt(raw, 10, 64)
	if err != nil {
		return fallback
	}
	return v
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

func parseCSV(raw string) []string {
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		value := strings.TrimSpace(part)
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

func validateProductionConfig(cfg *Config) error {
	if cfg == nil || cfg.Environment != "production" {
		return nil
	}
	if strings.TrimSpace(os.Getenv("RPC_URL")) == "" {
		return fmt.Errorf("RPC_URL is required in production")
	}
	if os.Getenv("CORS_STRICT") != "1" {
		return fmt.Errorf("CORS_STRICT=1 is required in production")
	}
	if len(parseCSV(os.Getenv("CORS_ALLOWED_ORIGINS"))) == 0 {
		return fmt.Errorf("CORS_ALLOWED_ORIGINS is required in production")
	}
	if len(cfg.WSAllowedOrigins) == 0 {
		return fmt.Errorf("WS_ALLOWED_ORIGINS is required in production")
	}
	if len(cfg.TrustedProxyCIDRs) == 0 {
		return fmt.Errorf("TRUSTED_PROXY_CIDRS is required in production")
	}
	for _, raw := range cfg.TrustedProxyCIDRs {
		if _, err := netip.ParsePrefix(raw); err != nil {
			return fmt.Errorf("TRUSTED_PROXY_CIDRS contains invalid CIDR %q", raw)
		}
	}
	if isPlaceholderSecret(cfg.AuthJWTSecret) {
		return fmt.Errorf("AUTH_JWT_SECRET must be set to a non-placeholder value in production")
	}
	if isPlaceholderSecret(cfg.AuthSessionSecret) {
		return fmt.Errorf("AUTH_SESSION_SECRET must be set to a non-placeholder value in production")
	}
	if cfg.IndexerMaxBlocksPerTick > 10_000 {
		return fmt.Errorf("INDEXER_MAX_BLOCKS_PER_TICK must be <= 10000 in production")
	}
	if cfg.KeeperEnabled && strings.TrimSpace(cfg.KeeperPrivateKeyFile) == "" {
		return fmt.Errorf("KEEPER_PRIVATE_KEY_FILE is required when KEEPER_ENABLED=1 in production")
	}
	if !isNonZeroAddress(cfg.SettlementUSDCAddress) {
		return fmt.Errorf("SETTLEMENT_USDC_ADDRESS must be a non-zero address in production")
	}
	if !isNonZeroAddress(cfg.SettlementReceiver) {
		return fmt.Errorf("SETTLEMENT_RECEIVER_ADDRESS must be a non-zero address in production")
	}
	if isPlaceholderSecret(cfg.LifiWebhookSecret) {
		return fmt.Errorf("LIFI_WEBHOOK_SECRET must be set to a non-placeholder value in production")
	}
	if err := validateOfficialMarketsURL("MARKETS_GAMMA_API_URL", cfg.MarketsGammaAPIURL, "gamma-api.polymarket.com"); err != nil {
		return err
	}
	if err := validateOfficialMarketsURL("MARKETS_CLOB_API_URL", cfg.MarketsCLOBAPIURL, "clob.polymarket.com"); err != nil {
		return err
	}
	return nil
}

func validateOfficialMarketsURL(key, raw, expectedHost string) error {
	parsed, err := url.Parse(raw)
	if err != nil || parsed.Scheme != "https" || !strings.EqualFold(parsed.Hostname(), expectedHost) ||
		parsed.User != nil || (parsed.Path != "" && parsed.Path != "/") || parsed.RawQuery != "" || parsed.Fragment != "" {
		return fmt.Errorf("%s must use official HTTPS host %s", key, expectedHost)
	}
	return nil
}

func isNonZeroAddress(value string) bool {
	value = strings.TrimPrefix(strings.ToLower(strings.TrimSpace(value)), "0x")
	if len(value) != 40 {
		return false
	}
	for _, c := range value {
		if !strings.ContainsRune("0123456789abcdef", c) {
			return false
		}
	}
	return value != strings.Repeat("0", 40)
}

func isPlaceholderSecret(value string) bool {
	normalized := strings.ToLower(strings.TrimSpace(value))
	if normalized == "" {
		return true
	}
	switch normalized {
	case "change-me", "replace-me", "example", "example-secret", "secret", "changeme":
		return true
	}
	return strings.Contains(normalized, "your-") || strings.Contains(normalized, "placeholder")
}

func (cfg *Config) anyV3Enabled() bool {
	if cfg == nil {
		return false
	}
	return cfg.GoodDollarEnabled || cfg.FeeRouterEnabled || cfg.ReferralsEnabled || cfg.RewardsEnabled || cfg.ImpactEnabled
}

// validateV3Config refuses V3 feature flags when the active registry still has placeholder treasury addresses.
func validateV3Config(cfg *Config) error {
	if cfg == nil || !cfg.anyV3Enabled() {
		return nil
	}
	reg, err := registry.Load(cfg.RegistryPath)
	if err != nil {
		return fmt.Errorf("V3 flags enabled: load registry: %w", err)
	}
	if err := registry.ValidateTreasuryDeployed(reg); err != nil {
		return fmt.Errorf("V3 flags enabled but treasury not deployed (set REGISTRY_PATH to a populated Alfajores registry after broadcast): %w", err)
	}
	if cfg.FeeRouterEnabled && !isNonZeroAddress(cfg.FeeRouterAddress) {
		return fmt.Errorf("FEE_ROUTER_ENABLED=1 requires non-zero FEE_ROUTER_ADDRESS")
	}
	return nil
}
