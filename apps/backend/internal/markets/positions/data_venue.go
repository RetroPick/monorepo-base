package positions

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"retropick/apps/backend/internal/markets"
)

const (
	defaultDataAPIBaseURL = "https://data-api.polymarket.com"
	positionsPath         = "/positions"
	defaultVenueTimeout   = 15 * time.Second
	maxVenueResponseBytes = 1 << 20
)

// DataAPIClient reads open positions from Polymarket Data API GET /positions.
type DataAPIClient struct {
	baseURL    string
	httpClient *http.Client
	now        func() time.Time
}

// NewDataAPIClient builds a Data API positions client.
func NewDataAPIClient(baseURL string, timeout time.Duration) *DataAPIClient {
	baseURL = strings.TrimSpace(baseURL)
	if baseURL == "" {
		baseURL = defaultDataAPIBaseURL
	}
	if timeout <= 0 {
		timeout = defaultVenueTimeout
	}
	return &DataAPIClient{
		baseURL: strings.TrimRight(baseURL, "/"),
		httpClient: &http.Client{
			Timeout: timeout,
		},
		now: time.Now,
	}
}

type wirePosition struct {
	Asset        string       `json:"asset"`
	ConditionID  string       `json:"conditionId"`
	Size         json.Number  `json:"size"`
	AvgPrice     json.Number  `json:"avgPrice"`
	CurPrice     *json.Number `json:"curPrice"`
	CurrentValue *json.Number `json:"currentValue"`
	InitialValue *json.Number `json:"initialValue"`
	CashPnL      *json.Number `json:"cashPnl"`
	RealizedPnL  *json.Number `json:"realizedPnl"`
	Redeemable   *bool        `json:"redeemable"`
	Title        string       `json:"title"`
	Outcome      string       `json:"outcome"`
	Slug         string       `json:"slug"`
}

// ListPositions fetches open positions for an account wallet.
func (c *DataAPIClient) ListPositions(ctx context.Context, req VenuePositionRequest) ([]VenuePosition, time.Time, error) {
	wallet := strings.TrimSpace(req.AccountWallet)
	if wallet == "" {
		return nil, time.Time{}, ErrUpstreamUnavailable
	}

	query := url.Values{}
	query.Set("user", wallet)
	u, err := url.Parse(c.baseURL + positionsPath)
	if err != nil {
		return nil, time.Time{}, ErrUpstreamUnavailable
	}
	u.RawQuery = query.Encode()

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, time.Time{}, ErrUpstreamUnavailable
	}
	httpReq.Header.Set("Accept", "application/json")

	res, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, time.Time{}, ErrUpstreamUnavailable
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return nil, time.Time{}, ErrUpstreamUnavailable
	}

	body, err := io.ReadAll(io.LimitReader(res.Body, maxVenueResponseBytes+1))
	if err != nil {
		return nil, time.Time{}, ErrUpstreamUnavailable
	}
	if len(body) > maxVenueResponseBytes {
		return nil, time.Time{}, ErrUpstreamUnavailable
	}

	var payload []wirePosition
	decoder := json.NewDecoder(bytes.NewReader(body))
	decoder.UseNumber()
	if err := decoder.Decode(&payload); err != nil {
		return nil, time.Time{}, ErrUpstreamUnavailable
	}

	observedAt := c.now().UTC()
	out := make([]VenuePosition, 0, len(payload))
	for _, row := range payload {
		tokenID := strings.TrimSpace(row.Asset)
		if tokenID == "" {
			continue
		}
		size, err := normalizeWireDecimal(string(row.Size))
		if err != nil {
			continue
		}
		avgPrice := ""
		if raw := strings.TrimSpace(string(row.AvgPrice)); raw != "" && raw != "0" {
			avgPrice, err = normalizeWireDecimal(raw)
			if err != nil {
				continue
			}
		}
		label := strings.TrimSpace(row.Outcome)
		if label == "" {
			label = strings.TrimSpace(row.Title)
		}
		markPrice, markPriceAvailable := optionalWireDecimal(row.CurPrice)
		costBasisAmount, costBasisAvailable := optionalUSDCBaseUnits(row.InitialValue)
		// Data API defines total PnL as cashPnl + realizedPnl. They are distinct
		// components, not fallbacks: cashPnl populates unrealized PnL and
		// realizedPnl populates realized PnL even when their values differ.
		unrealizedPnL, unrealizedPnLAvailable := optionalSignedWireDecimal(row.CashPnL)
		realizedPnL, realizedPnLAvailable := optionalSignedWireDecimal(row.RealizedPnL)
		claimable, claimableAvailable := claimableAmount(row.Redeemable, row.CurrentValue, size, markPrice, markPriceAvailable)
		out = append(out, VenuePosition{
			TokenID:                  tokenID,
			MarketID:                 slugToMarketID(row.Slug),
			ConditionID:              strings.TrimSpace(row.ConditionID),
			OutcomeLabel:             label,
			Size:                     size,
			AvgPrice:                 avgPrice,
			MarkPrice:                markPrice,
			MarkPriceAvailable:       markPriceAvailable,
			CostBasisAmount:          costBasisAmount,
			CostBasisAvailable:       costBasisAvailable,
			UnrealizedPnL:            unrealizedPnL,
			UnrealizedPnLAvailable:   unrealizedPnLAvailable,
			RealizedPnL:              realizedPnL,
			RealizedPnLAvailable:     realizedPnLAvailable,
			Redeemable:               row.Redeemable != nil && *row.Redeemable,
			RedeemableAvailable:      row.Redeemable != nil,
			ClaimableAmount:          claimable,
			ClaimableAmountAvailable: claimableAvailable,
			UpstreamID:               tokenID,
		})
	}
	return out, observedAt, nil
}

func normalizeWireDecimal(raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "0", nil
	}
	if _, err := markets.ParseDecimalString(raw); err != nil {
		return "", err
	}
	return raw, nil
}

func slugToMarketID(slug string) string {
	slug = strings.TrimSpace(slug)
	if slug == "" {
		return ""
	}
	return "polymarket:market:" + slug
}
