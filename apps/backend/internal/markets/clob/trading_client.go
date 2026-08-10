package clob

import (
	"net/http"
	"strings"
	"time"
)

// TradingClient submits authenticated orders to the Polymarket CLOB V2 API.
type TradingClient struct {
	baseURL    string
	httpClient *http.Client
	creds      CredentialProvider
	now        func() time.Time
}

// TradingClientConfig wires a CLOB trading client.
type TradingClientConfig struct {
	BaseURL    string
	Timeout    time.Duration
	Creds      CredentialProvider
	HTTPClient *http.Client
}

// NewTradingClient builds a client for CLOB POST /order.
func NewTradingClient(cfg TradingClientConfig) *TradingClient {
	baseURL := strings.TrimSpace(cfg.BaseURL)
	if baseURL == "" {
		baseURL = "https://clob.polymarket.com"
	}
	timeout := cfg.Timeout
	if timeout <= 0 {
		timeout = defaultTradingTimeout
	}
	httpClient := cfg.HTTPClient
	if httpClient == nil {
		httpClient = &http.Client{Timeout: timeout}
	}
	creds := cfg.Creds
	if creds == nil {
		creds = UnwiredCredentialProvider{}
	}
	return &TradingClient{
		baseURL:    strings.TrimRight(baseURL, "/"),
		httpClient: httpClient,
		creds:      creds,
		now:        time.Now,
	}
}
