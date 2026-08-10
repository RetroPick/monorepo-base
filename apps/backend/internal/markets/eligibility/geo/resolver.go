package geo

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/netip"
	"net/url"
	"os"
	"strings"
	"time"
)

const (
	defaultPathTemplate = "/{ip}/json"
	defaultTimeout      = 5 * time.Second
	maxResponseBytes    = 64 << 10
)

var ErrUnknown = errors.New("geo region unknown")

// Location is the resolved client geography used for policy checks.
type Location struct {
	RegionCode string
}

// Resolver resolves a client IP to a region code.
type Resolver interface {
	Resolve(ctx context.Context, clientIP string) (Location, error)
}

// UnwiredResolver always fails closed with ErrUnknown (no GeoIP provider wired).
type UnwiredResolver struct{}

func (UnwiredResolver) Resolve(_ context.Context, _ string) (Location, error) {
	return Location{}, ErrUnknown
}

// Config configures the HTTP GeoIP adapter.
type Config struct {
	BaseURL      string
	PathTemplate string
	APIKey       string
	Timeout      time.Duration
	HTTPClient   *http.Client
}

// DefaultConfig returns HTTP GeoIP defaults (no base URL; ops must set explicitly).
func DefaultConfig() Config {
	return Config{
		PathTemplate: defaultPathTemplate,
		Timeout:      defaultTimeout,
	}
}

// ConfigFromEnv reads MARKETS_GEOIP_* and GEO_PROVIDER_API_KEY when set.
func ConfigFromEnv() Config {
	cfg := DefaultConfig()
	if v := strings.TrimSpace(os.Getenv("MARKETS_GEOIP_BASE_URL")); v != "" {
		cfg.BaseURL = v
	}
	if v := strings.TrimSpace(os.Getenv("MARKETS_GEOIP_PATH")); v != "" {
		cfg.PathTemplate = v
	}
	if v := strings.TrimSpace(os.Getenv("MARKETS_GEOIP_API_KEY")); v != "" {
		cfg.APIKey = v
	} else if v := strings.TrimSpace(os.Getenv("GEO_PROVIDER_API_KEY")); v != "" {
		cfg.APIKey = v
	}
	if v := strings.TrimSpace(os.Getenv("MARKETS_GEOIP_TIMEOUT")); v != "" {
		if d, err := time.ParseDuration(v); err == nil && d > 0 {
			cfg.Timeout = d
		}
	}
	return cfg
}

// HTTPResolver calls an upstream GeoIP HTTP API fail-closed.
type HTTPResolver struct {
	baseURL      string
	pathTemplate string
	apiKey       string
	httpClient   *http.Client
}

// NewHTTPResolver builds an upstream GeoIP client from cfg.
func NewHTTPResolver(cfg Config) *HTTPResolver {
	pathTemplate := strings.TrimSpace(cfg.PathTemplate)
	if pathTemplate == "" {
		pathTemplate = defaultPathTemplate
	}
	client := cfg.HTTPClient
	if client == nil {
		timeout := cfg.Timeout
		if timeout <= 0 {
			timeout = defaultTimeout
		}
		client = &http.Client{Timeout: timeout}
	}
	return &HTTPResolver{
		baseURL:      strings.TrimRight(strings.TrimSpace(cfg.BaseURL), "/"),
		pathTemplate: pathTemplate,
		apiKey:       strings.TrimSpace(cfg.APIKey),
		httpClient:   client,
	}
}

type upstreamResponse struct {
	Country string `json:"country"`
}

// Resolve queries upstream GeoIP for clientIP. Errors never imply a known region.
func (r *HTTPResolver) Resolve(ctx context.Context, clientIP string) (Location, error) {
	clientIP = strings.TrimSpace(clientIP)
	if !validClientIP(clientIP) {
		return Location{}, ErrUnknown
	}

	reqURL, err := r.buildRequestURL(clientIP)
	if err != nil {
		return Location{}, ErrUnknown
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return Location{}, ErrUnknown
	}
	req.Header.Set("Accept", "application/json")

	res, err := r.httpClient.Do(req)
	if err != nil {
		return Location{}, ErrUnknown
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return Location{}, ErrUnknown
	}

	body, err := io.ReadAll(io.LimitReader(res.Body, maxResponseBytes+1))
	if err != nil {
		return Location{}, ErrUnknown
	}
	if len(body) > maxResponseBytes {
		return Location{}, ErrUnknown
	}

	var payload upstreamResponse
	if err := json.NewDecoder(bytes.NewReader(body)).Decode(&payload); err != nil {
		return Location{}, ErrUnknown
	}

	region := strings.ToUpper(strings.TrimSpace(payload.Country))
	if region == "" {
		return Location{}, ErrUnknown
	}

	return Location{RegionCode: region}, nil
}

func (r *HTTPResolver) buildRequestURL(clientIP string) (string, error) {
	path := strings.Replace(r.pathTemplate, "{ip}", url.PathEscape(clientIP), 1)
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	rawURL := r.baseURL + path
	if r.apiKey == "" {
		return rawURL, nil
	}
	u, err := url.Parse(rawURL)
	if err != nil {
		return "", err
	}
	q := u.Query()
	q.Set("token", r.apiKey)
	u.RawQuery = q.Encode()
	return u.String(), nil
}

func validClientIP(ip string) bool {
	addr, err := netip.ParseAddr(ip)
	if err != nil {
		return false
	}
	return addr.IsValid() && !addr.IsUnspecified()
}

// ResolverFromEnv returns HTTPResolver when MARKETS_GEOIP_BASE_URL is set, else UnwiredResolver.
func ResolverFromEnv() Resolver {
	if strings.TrimSpace(os.Getenv("MARKETS_GEOIP_BASE_URL")) == "" {
		return UnwiredResolver{}
	}
	return NewHTTPResolver(ConfigFromEnv())
}
