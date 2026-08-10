package geoblock

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/netip"
	"os"
	"strings"
	"time"
)

const (
	defaultBaseURL = "https://polymarket.com"
	defaultPath    = "/api/geoblock"
	defaultTimeout = 5 * time.Second
	maxResponseBytes = 64 << 10
)

var (
	ErrUnwired = errors.New("geoblock upstream not wired")
	ErrTimeout = errors.New("geoblock upstream timeout")
	ErrDenied  = errors.New("geoblock denied")
)

// Result is the Polymarket geoblock cross-check outcome.
type Result struct {
	Allowed bool
}

// Checker performs the Polymarket geoblock cross-check for a region/IP.
type Checker interface {
	Check(ctx context.Context, clientIP, regionCode string) (Result, error)
}

// Config configures the HTTP geoblock adapter.
type Config struct {
	BaseURL    string
	Path       string
	Timeout    time.Duration
	HTTPClient *http.Client
}

// DefaultConfig returns the official Polymarket geoblock endpoint defaults.
func DefaultConfig() Config {
	return Config{
		BaseURL: defaultBaseURL,
		Path:    defaultPath,
		Timeout: defaultTimeout,
	}
}

// ConfigFromEnv reads MARKETS_GEOBLOCK_BASE_URL and MARKETS_GEOBLOCK_PATH when set.
func ConfigFromEnv() Config {
	cfg := DefaultConfig()
	if v := strings.TrimSpace(os.Getenv("MARKETS_GEOBLOCK_BASE_URL")); v != "" {
		cfg.BaseURL = v
	}
	if v := strings.TrimSpace(os.Getenv("MARKETS_GEOBLOCK_PATH")); v != "" {
		cfg.Path = v
	}
	return cfg
}

// UnwiredChecker implements BLK-001: upstream not wired, always fail closed.
type UnwiredChecker struct{}

func (UnwiredChecker) Check(_ context.Context, _, _ string) (Result, error) {
	return Result{}, ErrUnwired
}

// HTTPChecker calls the Polymarket geoblock API fail-closed.
type HTTPChecker struct {
	baseURL    string
	path       string
	httpClient *http.Client
}

// NewHTTPChecker builds an upstream geoblock client from cfg.
func NewHTTPChecker(cfg Config) *HTTPChecker {
	baseURL := strings.TrimSpace(cfg.BaseURL)
	if baseURL == "" {
		baseURL = defaultBaseURL
	}
	path := strings.TrimSpace(cfg.Path)
	if path == "" {
		path = defaultPath
	}
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	client := cfg.HTTPClient
	if client == nil {
		timeout := cfg.Timeout
		if timeout <= 0 {
			timeout = defaultTimeout
		}
		client = &http.Client{Timeout: timeout}
	}
	return &HTTPChecker{
		baseURL:    strings.TrimRight(baseURL, "/"),
		path:       path,
		httpClient: client,
	}
}

type upstreamResponse struct {
	Blocked *bool  `json:"blocked"`
	IP      string `json:"ip"`
	Country string `json:"country"`
	Region  string `json:"region"`
}

// Check queries upstream geoblock for clientIP. Errors never imply allowed.
func (c *HTTPChecker) Check(ctx context.Context, clientIP, _ string) (Result, error) {
	clientIP = strings.TrimSpace(clientIP)
	if !validClientIP(clientIP) {
		return Result{}, ErrTimeout
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+c.path, nil)
	if err != nil {
		return Result{}, ErrTimeout
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("X-Forwarded-For", clientIP)

	res, err := c.httpClient.Do(req)
	if err != nil {
		return Result{}, ErrTimeout
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return Result{}, ErrTimeout
	}

	body, err := io.ReadAll(io.LimitReader(res.Body, maxResponseBytes+1))
	if err != nil {
		return Result{}, ErrTimeout
	}
	if len(body) > maxResponseBytes {
		return Result{}, ErrTimeout
	}

	var payload upstreamResponse
	if err := json.NewDecoder(bytes.NewReader(body)).Decode(&payload); err != nil {
		return Result{}, ErrTimeout
	}
	if payload.Blocked == nil {
		return Result{}, ErrTimeout
	}

	return Result{Allowed: !*payload.Blocked}, nil
}

func validClientIP(ip string) bool {
	addr, err := netip.ParseAddr(ip)
	if err != nil {
		return false
	}
	return addr.IsValid() && !addr.IsUnspecified()
}

// CheckerFromEnv returns HTTPChecker when MARKETS_GEOBLOCK_BASE_URL is set, else UnwiredChecker.
func CheckerFromEnv() Checker {
	if strings.TrimSpace(os.Getenv("MARKETS_GEOBLOCK_BASE_URL")) == "" {
		return UnwiredChecker{}
	}
	return NewHTTPChecker(ConfigFromEnv())
}
