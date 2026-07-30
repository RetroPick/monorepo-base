package clob

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"
)

const (
	defaultTimeout   = 15 * time.Second
	maxResponseBytes = 8 << 20
)

var (
	ErrInvalidRequest = errors.New("clob invalid request")
	ErrInvalidPayload = errors.New("clob invalid payload")
	ErrNotFound       = errors.New("clob resource not found")
	ErrRateLimited    = errors.New("clob rate limited")
	ErrUpstream       = errors.New("clob upstream error")

	decimalPattern = regexp.MustCompile(`^(0|[1-9][0-9]*)(\.[0-9]+)?$`)
)

type UpstreamError struct {
	Kind       error
	Operation  string
	StatusCode int
}

func (e *UpstreamError) Error() string {
	if e.StatusCode > 0 {
		return fmt.Sprintf("%s: status %d", e.Operation, e.StatusCode)
	}
	return e.Operation + ": " + e.Kind.Error()
}

func (e *UpstreamError) Unwrap() error {
	return e.Kind
}

type Level struct {
	Price string
	Size  string
}

type OrderBook struct {
	ConditionID    string
	TokenID        string
	Timestamp      time.Time
	Hash           string
	Bids           []Level
	Asks           []Level
	MinOrderSize   string
	TickSize       string
	NegRisk        bool
	LastTradePrice string
}

type PriceHistoryRequest struct {
	TokenID  string
	Interval string
	StartTS  int64
	EndTS    int64
	Fidelity int
}

type PricePoint struct {
	Timestamp time.Time
	Price     string
}

type Client struct {
	baseURL    string
	httpClient *http.Client
}

func NewClient(baseURL string) *Client {
	baseURL = strings.TrimSpace(baseURL)
	if baseURL == "" {
		baseURL = "https://clob.polymarket.com"
	}
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		httpClient: &http.Client{
			Timeout: defaultTimeout,
		},
	}
}

func (c *Client) GetOrderBook(ctx context.Context, tokenID string) (OrderBook, error) {
	tokenID = strings.TrimSpace(tokenID)
	if tokenID == "" || len(tokenID) > 256 {
		return OrderBook{}, fmt.Errorf("%w: token id is required", ErrInvalidRequest)
	}
	query := make(url.Values)
	query.Set("token_id", tokenID)

	var raw rawOrderBook
	if err := c.getJSON(ctx, "get order book", "/book", query, &raw); err != nil {
		return OrderBook{}, err
	}
	return normalizeOrderBook(raw)
}

func (c *Client) GetPriceHistory(ctx context.Context, request PriceHistoryRequest) ([]PricePoint, error) {
	request.TokenID = strings.TrimSpace(request.TokenID)
	if request.TokenID == "" || len(request.TokenID) > 256 {
		return nil, fmt.Errorf("%w: token id is required", ErrInvalidRequest)
	}
	relative := validInterval(request.Interval)
	absolute := request.StartTS > 0 && request.EndTS > request.StartTS
	if relative == absolute {
		return nil, fmt.Errorf("%w: choose one bounded interval or time range", ErrInvalidRequest)
	}
	if request.Fidelity < 1 || request.Fidelity > 1440 {
		return nil, fmt.Errorf("%w: fidelity must be between 1 and 1440", ErrInvalidRequest)
	}

	query := make(url.Values)
	query.Set("market", request.TokenID)
	query.Set("fidelity", strconv.Itoa(request.Fidelity))
	if relative {
		query.Set("interval", request.Interval)
	} else {
		query.Set("startTs", strconv.FormatInt(request.StartTS, 10))
		query.Set("endTs", strconv.FormatInt(request.EndTS, 10))
	}

	var raw struct {
		History []rawPricePoint `json:"history"`
	}
	if err := c.getJSON(ctx, "get price history", "/prices-history", query, &raw); err != nil {
		return nil, err
	}
	points := make([]PricePoint, 0, len(raw.History))
	var previous int64
	for _, row := range raw.History {
		if row.Timestamp <= 0 || (previous > 0 && row.Timestamp <= previous) {
			return nil, fmt.Errorf("%w: history timestamps are not increasing", ErrInvalidPayload)
		}
		price, err := normalizeDecimalJSON(row.Price)
		if err != nil {
			return nil, fmt.Errorf("%w: history price", ErrInvalidPayload)
		}
		points = append(points, PricePoint{
			Timestamp: time.Unix(row.Timestamp, 0).UTC(),
			Price:     price,
		})
		previous = row.Timestamp
	}
	return points, nil
}

func (c *Client) getJSON(ctx context.Context, operation, path string, query url.Values, dst any) error {
	u, err := url.Parse(c.baseURL + path)
	if err != nil {
		return &UpstreamError{Kind: ErrUpstream, Operation: operation}
	}
	u.RawQuery = query.Encode()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return &UpstreamError{Kind: ErrUpstream, Operation: operation}
	}
	req.Header.Set("Accept", "application/json")

	res, err := c.httpClient.Do(req)
	if err != nil {
		return &UpstreamError{Kind: ErrUpstream, Operation: operation}
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return classifyStatus(operation, res.StatusCode)
	}
	body, err := io.ReadAll(io.LimitReader(res.Body, maxResponseBytes+1))
	if err != nil {
		return &UpstreamError{Kind: ErrUpstream, Operation: operation}
	}
	if len(body) > maxResponseBytes {
		return fmt.Errorf("%w: response exceeds %d bytes", ErrInvalidPayload, maxResponseBytes)
	}
	decoder := json.NewDecoder(bytes.NewReader(body))
	decoder.UseNumber()
	if err := decoder.Decode(dst); err != nil {
		return fmt.Errorf("%w: %s decode", ErrInvalidPayload, operation)
	}
	return nil
}

func classifyStatus(operation string, status int) error {
	kind := ErrUpstream
	switch status {
	case http.StatusNotFound:
		kind = ErrNotFound
	case http.StatusTooManyRequests:
		kind = ErrRateLimited
	}
	return &UpstreamError{Kind: kind, Operation: operation, StatusCode: status}
}

type rawOrderBook struct {
	Market         string     `json:"market"`
	AssetID        string     `json:"asset_id"`
	Timestamp      string     `json:"timestamp"`
	Hash           string     `json:"hash"`
	Bids           []rawLevel `json:"bids"`
	Asks           []rawLevel `json:"asks"`
	MinOrderSize   string     `json:"min_order_size"`
	TickSize       string     `json:"tick_size"`
	NegRisk        bool       `json:"neg_risk"`
	LastTradePrice string     `json:"last_trade_price"`
}

type rawLevel struct {
	Price string `json:"price"`
	Size  string `json:"size"`
}

type rawPricePoint struct {
	Timestamp int64           `json:"t"`
	Price     json.RawMessage `json:"p"`
}

func normalizeOrderBook(raw rawOrderBook) (OrderBook, error) {
	if strings.TrimSpace(raw.Market) == "" || strings.TrimSpace(raw.AssetID) == "" || strings.TrimSpace(raw.Hash) == "" {
		return OrderBook{}, fmt.Errorf("%w: book identity is incomplete", ErrInvalidPayload)
	}
	timestampMS, err := strconv.ParseInt(raw.Timestamp, 10, 64)
	if err != nil || timestampMS <= 0 {
		return OrderBook{}, fmt.Errorf("%w: invalid book timestamp", ErrInvalidPayload)
	}
	bids, err := normalizeLevels(raw.Bids)
	if err != nil {
		return OrderBook{}, err
	}
	asks, err := normalizeLevels(raw.Asks)
	if err != nil {
		return OrderBook{}, err
	}
	if !decimalPattern.MatchString(raw.MinOrderSize) || !decimalPattern.MatchString(raw.TickSize) {
		return OrderBook{}, fmt.Errorf("%w: invalid trading constraint", ErrInvalidPayload)
	}
	if raw.LastTradePrice != "" && !decimalPattern.MatchString(raw.LastTradePrice) {
		return OrderBook{}, fmt.Errorf("%w: invalid last trade price", ErrInvalidPayload)
	}
	return OrderBook{
		ConditionID:    strings.TrimSpace(raw.Market),
		TokenID:        strings.TrimSpace(raw.AssetID),
		Timestamp:      time.UnixMilli(timestampMS).UTC(),
		Hash:           strings.TrimSpace(raw.Hash),
		Bids:           bids,
		Asks:           asks,
		MinOrderSize:   raw.MinOrderSize,
		TickSize:       raw.TickSize,
		NegRisk:        raw.NegRisk,
		LastTradePrice: raw.LastTradePrice,
	}, nil
}

func normalizeLevels(raw []rawLevel) ([]Level, error) {
	levels := make([]Level, 0, len(raw))
	for _, row := range raw {
		if !decimalPattern.MatchString(row.Price) || !decimalPattern.MatchString(row.Size) {
			return nil, fmt.Errorf("%w: invalid order-book level", ErrInvalidPayload)
		}
		levels = append(levels, Level{Price: row.Price, Size: row.Size})
	}
	return levels, nil
}

func normalizeDecimalJSON(raw json.RawMessage) (string, error) {
	value := strings.TrimSpace(string(raw))
	if strings.HasPrefix(value, `"`) {
		if err := json.Unmarshal(raw, &value); err != nil {
			return "", err
		}
	}
	if !decimalPattern.MatchString(value) {
		return "", fmt.Errorf("invalid decimal")
	}
	return value, nil
}

func validInterval(interval string) bool {
	switch interval {
	case "1h", "6h", "1d", "1w", "max":
		return true
	default:
		return false
	}
}
