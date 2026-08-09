package gamma

import (
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
	ErrInvalidPayload = errors.New("gamma invalid payload")
	ErrNotFound       = errors.New("gamma resource not found")
	ErrRateLimited    = errors.New("gamma rate limited")
	ErrUpstream       = errors.New("gamma upstream error")

	decimalPattern = regexp.MustCompile(`^(0|[1-9][0-9]*)(\.[0-9]+)?$`)
)

type UpstreamError struct {
	Kind        error
	Operation   string
	StatusCode  int
	RetryAfter  time.Duration
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

type Event struct {
	ID               string
	Slug             string
	Title            string
	Description      string
	ResolutionSource string
	StartDate        *time.Time
	EndDate          *time.Time
	UpdatedAt        *time.Time
	Active           bool
	Closed           bool
	Archived         bool
	NegRisk          bool
	Markets          []Market
}

type Market struct {
	ID               string
	ConditionID      string
	Slug             string
	Question         string
	Description      string
	ResolutionSource string
	EndDate          *time.Time
	UpdatedAt        *time.Time
	Active           bool
	Closed           bool
	Archived         bool
	EnableOrderBook  bool
	NegRisk          bool
	Outcomes         []Outcome
}

type Outcome struct {
	Name    string
	TokenID string
	Price   string
}

// Client reads the public Polymarket Gamma HTTP API.
type Client struct {
	baseURL    string
	httpClient *http.Client
}

func NewClient(baseURL string) *Client {
	baseURL = strings.TrimSpace(baseURL)
	if baseURL == "" {
		baseURL = "https://gamma-api.polymarket.com"
	}
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		httpClient: &http.Client{
			Timeout: defaultTimeout,
		},
	}
}

func (c *Client) ListEvents(ctx context.Context, limit, offset int) ([]Event, error) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	q := make(url.Values)
	q.Set("limit", strconv.Itoa(limit))
	q.Set("active", "true")
	q.Set("closed", "false")
	if offset > 0 {
		q.Set("offset", strconv.Itoa(offset))
	}

	var raw []rawEvent
	if err := c.getJSON(ctx, "list events", "/events", q, &raw); err != nil {
		return nil, err
	}
	out := make([]Event, 0, len(raw))
	for _, row := range raw {
		event, err := normalizeEvent(row)
		if err != nil {
			return nil, err
		}
		out = append(out, event)
	}
	return out, nil
}

func (c *Client) GetEvent(ctx context.Context, eventID string) (Event, error) {
	eventID = strings.TrimSpace(eventID)
	if eventID == "" {
		return Event{}, fmt.Errorf("%w: event id is required", ErrInvalidPayload)
	}
	var raw rawEvent
	if err := c.getJSON(ctx, "get event", "/events/"+url.PathEscape(eventID), nil, &raw); err != nil {
		return Event{}, err
	}
	return normalizeEvent(raw)
}

func (c *Client) GetMarket(ctx context.Context, marketID string) (Market, error) {
	marketID = strings.TrimSpace(marketID)
	if marketID == "" {
		return Market{}, fmt.Errorf("%w: market id is required", ErrInvalidPayload)
	}
	var raw rawMarket
	if err := c.getJSON(ctx, "get market", "/markets/"+url.PathEscape(marketID), nil, &raw); err != nil {
		return Market{}, err
	}
	return normalizeMarket(raw)
}

func (c *Client) getJSON(ctx context.Context, operation, path string, query url.Values, dst any) error {
	u, err := url.Parse(c.baseURL + path)
	if err != nil {
		return &UpstreamError{Kind: ErrUpstream, Operation: operation}
	}
	if query != nil {
		u.RawQuery = query.Encode()
	}
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
		return classifyStatus(operation, res.StatusCode, res.Header.Get("Retry-After"))
	}
	body, err := io.ReadAll(io.LimitReader(res.Body, maxResponseBytes+1))
	if err != nil {
		return &UpstreamError{Kind: ErrUpstream, Operation: operation}
	}
	if len(body) > maxResponseBytes {
		return fmt.Errorf("%w: response exceeds %d bytes", ErrInvalidPayload, maxResponseBytes)
	}
	if err := json.Unmarshal(body, dst); err != nil {
		return fmt.Errorf("%w: %s decode", ErrInvalidPayload, operation)
	}
	return nil
}

func classifyStatus(operation string, status int, retryAfterHeader string) error {
	kind := ErrUpstream
	switch status {
	case http.StatusNotFound:
		kind = ErrNotFound
	case http.StatusTooManyRequests:
		kind = ErrRateLimited
	}
	return &UpstreamError{
		Kind:       kind,
		Operation:  operation,
		StatusCode: status,
		RetryAfter: parseRetryAfter(retryAfterHeader),
	}
}

func parseRetryAfter(raw string) time.Duration {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return 0
	}
	if seconds, err := strconv.Atoi(raw); err == nil && seconds > 0 {
		return time.Duration(seconds) * time.Second
	}
	if when, err := http.ParseTime(raw); err == nil {
		delay := time.Until(when)
		if delay > 0 {
			return delay
		}
	}
	return 0
}

type rawEvent struct {
	ID               json.RawMessage `json:"id"`
	Slug             string          `json:"slug"`
	Title            string          `json:"title"`
	Description      string          `json:"description"`
	ResolutionSource string          `json:"resolutionSource"`
	StartDate        string          `json:"startDate"`
	EndDate          string          `json:"endDate"`
	UpdatedAt        string          `json:"updatedAt"`
	Active           bool            `json:"active"`
	Closed           bool            `json:"closed"`
	Archived         bool            `json:"archived"`
	NegRisk          bool            `json:"negRisk"`
	Markets          []rawMarket     `json:"markets"`
}

type rawMarket struct {
	ID               json.RawMessage `json:"id"`
	ConditionID      string          `json:"conditionId"`
	Slug             string          `json:"slug"`
	Question         string          `json:"question"`
	Description      string          `json:"description"`
	ResolutionSource string          `json:"resolutionSource"`
	EndDate          string          `json:"endDate"`
	UpdatedAt        string          `json:"updatedAt"`
	Active           bool            `json:"active"`
	Closed           bool            `json:"closed"`
	Archived         bool            `json:"archived"`
	EnableOrderBook  bool            `json:"enableOrderBook"`
	NegRisk          bool            `json:"negRisk"`
	Outcomes         json.RawMessage `json:"outcomes"`
	OutcomePrices    json.RawMessage `json:"outcomePrices"`
	CLOBTokenIDs     json.RawMessage `json:"clobTokenIds"`
}

func normalizeEvent(raw rawEvent) (Event, error) {
	id, err := normalizeID(raw.ID)
	if err != nil {
		return Event{}, err
	}
	title := strings.TrimSpace(raw.Title)
	if title == "" {
		return Event{}, fmt.Errorf("%w: event %s has no title", ErrInvalidPayload, id)
	}
	startDate, err := parseOptionalTime(raw.StartDate)
	if err != nil {
		return Event{}, fmt.Errorf("%w: event %s startDate", ErrInvalidPayload, id)
	}
	endDate, err := parseOptionalTime(raw.EndDate)
	if err != nil {
		return Event{}, fmt.Errorf("%w: event %s endDate", ErrInvalidPayload, id)
	}
	updatedAt, err := parseOptionalTime(raw.UpdatedAt)
	if err != nil {
		return Event{}, fmt.Errorf("%w: event %s updatedAt", ErrInvalidPayload, id)
	}
	markets := make([]Market, 0, len(raw.Markets))
	for _, row := range raw.Markets {
		market, err := normalizeMarket(row)
		if err != nil {
			return Event{}, err
		}
		markets = append(markets, market)
	}
	return Event{
		ID:               id,
		Slug:             strings.TrimSpace(raw.Slug),
		Title:            title,
		Description:      strings.TrimSpace(raw.Description),
		ResolutionSource: strings.TrimSpace(raw.ResolutionSource),
		StartDate:        startDate,
		EndDate:          endDate,
		UpdatedAt:        updatedAt,
		Active:           raw.Active,
		Closed:           raw.Closed,
		Archived:         raw.Archived,
		NegRisk:          raw.NegRisk,
		Markets:          markets,
	}, nil
}

func normalizeMarket(raw rawMarket) (Market, error) {
	id, err := normalizeID(raw.ID)
	if err != nil {
		return Market{}, err
	}
	question := strings.TrimSpace(raw.Question)
	if question == "" {
		return Market{}, fmt.Errorf("%w: market %s has no question", ErrInvalidPayload, id)
	}
	endDate, err := parseOptionalTime(raw.EndDate)
	if err != nil {
		return Market{}, fmt.Errorf("%w: market %s endDate", ErrInvalidPayload, id)
	}
	updatedAt, err := parseOptionalTime(raw.UpdatedAt)
	if err != nil {
		return Market{}, fmt.Errorf("%w: market %s updatedAt", ErrInvalidPayload, id)
	}
	outcomeNames, err := decodeStringList(raw.Outcomes)
	if err != nil {
		return Market{}, fmt.Errorf("%w: market %s outcomes", ErrInvalidPayload, id)
	}
	tokenIDs, err := decodeStringList(raw.CLOBTokenIDs)
	if err != nil {
		return Market{}, fmt.Errorf("%w: market %s clobTokenIds", ErrInvalidPayload, id)
	}
	prices, err := decodeStringList(raw.OutcomePrices)
	if err != nil {
		return Market{}, fmt.Errorf("%w: market %s outcomePrices", ErrInvalidPayload, id)
	}
	if len(tokenIDs) > 0 && len(tokenIDs) != len(outcomeNames) {
		return Market{}, fmt.Errorf("%w: market %s outcome/token length mismatch", ErrInvalidPayload, id)
	}
	if len(prices) > 0 && len(prices) != len(outcomeNames) {
		return Market{}, fmt.Errorf("%w: market %s outcome/price length mismatch", ErrInvalidPayload, id)
	}
	outcomes := make([]Outcome, 0, len(outcomeNames))
	for i, name := range outcomeNames {
		outcome := Outcome{Name: strings.TrimSpace(name)}
		if outcome.Name == "" {
			return Market{}, fmt.Errorf("%w: market %s empty outcome", ErrInvalidPayload, id)
		}
		if len(tokenIDs) > 0 {
			outcome.TokenID = strings.TrimSpace(tokenIDs[i])
		}
		if len(prices) > 0 {
			if !decimalPattern.MatchString(prices[i]) {
				return Market{}, fmt.Errorf("%w: market %s invalid outcome price", ErrInvalidPayload, id)
			}
			outcome.Price = prices[i]
		}
		outcomes = append(outcomes, outcome)
	}
	return Market{
		ID:               id,
		ConditionID:      strings.TrimSpace(raw.ConditionID),
		Slug:             strings.TrimSpace(raw.Slug),
		Question:         question,
		Description:      strings.TrimSpace(raw.Description),
		ResolutionSource: strings.TrimSpace(raw.ResolutionSource),
		EndDate:          endDate,
		UpdatedAt:        updatedAt,
		Active:           raw.Active,
		Closed:           raw.Closed,
		Archived:         raw.Archived,
		EnableOrderBook:  raw.EnableOrderBook,
		NegRisk:          raw.NegRisk,
		Outcomes:         outcomes,
	}, nil
}

func normalizeID(raw json.RawMessage) (string, error) {
	value := strings.TrimSpace(string(raw))
	if value == "" || value == "null" {
		return "", fmt.Errorf("%w: missing id", ErrInvalidPayload)
	}
	if strings.HasPrefix(value, `"`) {
		var decoded string
		if err := json.Unmarshal(raw, &decoded); err != nil {
			return "", fmt.Errorf("%w: invalid id", ErrInvalidPayload)
		}
		value = decoded
	}
	value = strings.TrimSpace(value)
	if value == "" {
		return "", fmt.Errorf("%w: empty id", ErrInvalidPayload)
	}
	return value, nil
}

func decodeStringList(raw json.RawMessage) ([]string, error) {
	if len(raw) == 0 || string(raw) == "null" || string(raw) == `""` {
		return []string{}, nil
	}
	var direct []string
	if err := json.Unmarshal(raw, &direct); err == nil {
		return direct, nil
	}
	var encoded string
	if err := json.Unmarshal(raw, &encoded); err != nil {
		return nil, err
	}
	if strings.TrimSpace(encoded) == "" {
		return []string{}, nil
	}
	if err := json.Unmarshal([]byte(encoded), &direct); err != nil {
		return nil, err
	}
	return direct, nil
}

func parseOptionalTime(raw string) (*time.Time, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, nil
	}
	value, err := time.Parse(time.RFC3339Nano, raw)
	if err != nil {
		return nil, err
	}
	value = value.UTC()
	return &value, nil
}
