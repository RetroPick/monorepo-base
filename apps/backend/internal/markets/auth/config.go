package auth

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

const (
	defaultAccessTTL      = 15 * time.Minute
	defaultNonceTTL       = 10 * time.Minute
	defaultChainID        = 137
	defaultAuthRateLimit  = 10
	defaultCookieName     = "mkt_session"
	defaultCSRFCookieName = "mkt_csrf"
)

// Config holds Markets session auth runtime settings.
type Config struct {
	SessionSecret  string
	AccessTTL      time.Duration
	NonceTTL       time.Duration
	ChainID        int64
	CookieName     string
	CSRFCookieName string
	CookieDomain   string
	CookieSecure   bool
	CookieSameSite string
	AllowedDomains []string
	AuthRateLimit  int
	AuthRateWindow time.Duration
}

// LoadConfig reads auth settings from environment variables.
func LoadConfig() (Config, error) {
	secret := strings.TrimSpace(os.Getenv("MARKETS_AUTH_SESSION_SECRET"))
	if secret == "" {
		secret = strings.TrimSpace(os.Getenv("AUTH_SESSION_SECRET"))
	}
	if secret == "" {
		return Config{}, fmt.Errorf("MARKETS_AUTH_SESSION_SECRET or AUTH_SESSION_SECRET is required")
	}

	accessTTL := defaultAccessTTL
	if raw := strings.TrimSpace(os.Getenv("MARKETS_AUTH_ACCESS_TTL")); raw != "" {
		parsed, err := time.ParseDuration(raw)
		if err != nil {
			return Config{}, fmt.Errorf("MARKETS_AUTH_ACCESS_TTL: %w", err)
		}
		accessTTL = parsed
	}

	nonceTTL := defaultNonceTTL
	if raw := strings.TrimSpace(os.Getenv("MARKETS_AUTH_NONCE_TTL")); raw != "" {
		parsed, err := time.ParseDuration(raw)
		if err != nil {
			return Config{}, fmt.Errorf("MARKETS_AUTH_NONCE_TTL: %w", err)
		}
		nonceTTL = parsed
	}

	chainID := int64(defaultChainID)
	if raw := strings.TrimSpace(os.Getenv("MARKETS_AUTH_CHAIN_ID")); raw != "" {
		parsed, err := strconv.ParseInt(raw, 10, 64)
		if err != nil {
			return Config{}, fmt.Errorf("MARKETS_AUTH_CHAIN_ID: %w", err)
		}
		chainID = parsed
	}

	rateLimit := defaultAuthRateLimit
	if raw := strings.TrimSpace(os.Getenv("MARKETS_AUTH_RATE_LIMIT")); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil {
			return Config{}, fmt.Errorf("MARKETS_AUTH_RATE_LIMIT: %w", err)
		}
		rateLimit = parsed
	}

	domains := parseCSV(os.Getenv("MARKETS_AUTH_ALLOWED_DOMAINS"))

	return Config{
		SessionSecret:  secret,
		AccessTTL:      accessTTL,
		NonceTTL:       nonceTTL,
		ChainID:        chainID,
		CookieName:     defaultCookieName,
		CSRFCookieName: defaultCSRFCookieName,
		CookieDomain:   strings.TrimSpace(os.Getenv("MARKETS_AUTH_COOKIE_DOMAIN")),
		CookieSecure:   strings.TrimSpace(os.Getenv("MARKETS_AUTH_COOKIE_SECURE")) == "1",
		CookieSameSite: envDefault("MARKETS_AUTH_COOKIE_SAMESITE", "lax"),
		AllowedDomains: domains,
		AuthRateLimit:  rateLimit,
		AuthRateWindow: time.Minute,
	}, nil
}

func envDefault(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
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

func (c Config) domainAllowed(domain string) bool {
	domain = strings.TrimSpace(domain)
	if domain == "" {
		return false
	}
	if len(c.AllowedDomains) == 0 {
		return true
	}
	for _, allowed := range c.AllowedDomains {
		if strings.EqualFold(domain, allowed) {
			return true
		}
	}
	return false
}
