package clob

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
)

const (
	dataOrdersPath = "/data/orders"
	dataTradesPath = "/data/trades"
)

// VenueOpenOrder is a normalized open order from CLOB GET /data/orders.
type VenueOpenOrder struct {
	OrderID       string
	ClientOrderID string
	TokenID       string
	Side          string
	Price         string
	Size          string
	MakerAmount   string
	TakerAmount   string
	Salt          string
	Status        string
	Maker         string
	CreatedAt     string
}

// VenueTrade is a normalized trade from CLOB GET /data/trades.
type VenueTrade struct {
	TradeID   string
	OrderID   string
	TokenID   string
	Side      string
	Price     string
	Size      string
	FeeAmount int64
	Status    string
	MatchTime string
}

type wireDataOrder struct {
	ID            string `json:"id"`
	ClientOrderID string `json:"client_order_id"`
	TokenID       string `json:"asset_id"`
	Side          string `json:"side"`
	Price         string `json:"price"`
	Size          string `json:"original_size"`
	MakerAmount   string `json:"maker_amount"`
	TakerAmount   string `json:"taker_amount"`
	Salt          json.RawMessage `json:"salt"`
	Status        string `json:"status"`
	Maker         string `json:"maker_address"`
	CreatedAt     string `json:"created_at"`
}

type wireDataTrade struct {
	ID        string `json:"id"`
	OrderID   string `json:"taker_order_id"`
	TokenID   string `json:"asset_id"`
	Side      string `json:"side"`
	Price     string `json:"price"`
	Size      string `json:"size"`
	FeeRate   string `json:"fee_rate_bps"`
	Status    string `json:"status"`
	MatchTime string `json:"match_time"`
}

// ListOpenOrders fetches authenticated open orders from CLOB GET /data/orders.
func (c *TradingClient) ListOpenOrders(ctx context.Context) ([]VenueOpenOrder, error) {
	creds, err := c.creds.Credentials(ctx)
	if err != nil {
		return nil, err
	}
	ts := strconv.FormatInt(c.now().UTC().Unix(), 10)
	headers, err := l2AuthHeaders(creds, ts, http.MethodGet, dataOrdersPath, "")
	if err != nil {
		return nil, &UpstreamError{Kind: ErrUpstream, Operation: "list open orders"}
	}
	url := c.baseURL + dataOrdersPath
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, &UpstreamError{Kind: ErrUpstream, Operation: "list open orders"}
	}
	req.Header.Set("Accept", "application/json")
	for key, value := range headers {
		req.Header.Set(key, value)
	}
	res, err := c.httpClient.Do(req)
	if err != nil {
		return nil, &UpstreamError{Kind: ErrUpstream, Operation: "list open orders"}
	}
	defer res.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(res.Body, maxResponseBytes+1))
	if err != nil {
		return nil, &UpstreamError{Kind: ErrUpstream, Operation: "list open orders"}
	}
	if res.StatusCode != http.StatusOK {
		return nil, classifySubmitStatus("list open orders", res.StatusCode)
	}
	var parsed []wireDataOrder
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return nil, fmt.Errorf("%w: list open orders decode", ErrInvalidPayload)
	}
	out := make([]VenueOpenOrder, 0, len(parsed))
	for _, row := range parsed {
		salt := parseWireSalt(row.Salt)
		clientOrderID := strings.TrimSpace(row.ClientOrderID)
		if clientOrderID == "" {
			clientOrderID = salt
		}
		out = append(out, VenueOpenOrder{
			OrderID:       strings.TrimSpace(row.ID),
			ClientOrderID: clientOrderID,
			TokenID:       strings.TrimSpace(row.TokenID),
			Side:          strings.ToUpper(strings.TrimSpace(row.Side)),
			Price:         strings.TrimSpace(row.Price),
			Size:          strings.TrimSpace(row.Size),
			MakerAmount:   strings.TrimSpace(row.MakerAmount),
			TakerAmount:   strings.TrimSpace(row.TakerAmount),
			Salt:          salt,
			Status:        strings.TrimSpace(row.Status),
			Maker:         strings.ToLower(strings.TrimSpace(row.Maker)),
			CreatedAt:     strings.TrimSpace(row.CreatedAt),
		})
	}
	return out, nil
}

func parseWireSalt(raw json.RawMessage) string {
	raw = bytesTrimSpace(raw)
	if len(raw) == 0 || string(raw) == "null" {
		return ""
	}
	if raw[0] == '"' {
		var s string
		if err := json.Unmarshal(raw, &s); err == nil {
			return strings.TrimSpace(s)
		}
	}
	var n json.Number
	if err := json.Unmarshal(raw, &n); err == nil {
		return strings.TrimSpace(n.String())
	}
	return strings.TrimSpace(string(raw))
}

func bytesTrimSpace(b json.RawMessage) json.RawMessage {
	return json.RawMessage(strings.TrimSpace(string(b)))
}

// ListTrades fetches authenticated trades from CLOB GET /data/trades.
func (c *TradingClient) ListTrades(ctx context.Context) ([]VenueTrade, error) {
	creds, err := c.creds.Credentials(ctx)
	if err != nil {
		return nil, err
	}
	ts := strconv.FormatInt(c.now().UTC().Unix(), 10)
	headers, err := l2AuthHeaders(creds, ts, http.MethodGet, dataTradesPath, "")
	if err != nil {
		return nil, &UpstreamError{Kind: ErrUpstream, Operation: "list trades"}
	}
	url := c.baseURL + dataTradesPath
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, &UpstreamError{Kind: ErrUpstream, Operation: "list trades"}
	}
	req.Header.Set("Accept", "application/json")
	for key, value := range headers {
		req.Header.Set(key, value)
	}
	res, err := c.httpClient.Do(req)
	if err != nil {
		return nil, &UpstreamError{Kind: ErrUpstream, Operation: "list trades"}
	}
	defer res.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(res.Body, maxResponseBytes+1))
	if err != nil {
		return nil, &UpstreamError{Kind: ErrUpstream, Operation: "list trades"}
	}
	if res.StatusCode != http.StatusOK {
		return nil, classifySubmitStatus("list trades", res.StatusCode)
	}
	var parsed []wireDataTrade
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return nil, fmt.Errorf("%w: list trades decode", ErrInvalidPayload)
	}
	out := make([]VenueTrade, 0, len(parsed))
	for _, row := range parsed {
		out = append(out, VenueTrade{
			TradeID:   strings.TrimSpace(row.ID),
			OrderID:   strings.TrimSpace(row.OrderID),
			TokenID:   strings.TrimSpace(row.TokenID),
			Side:      strings.ToUpper(strings.TrimSpace(row.Side)),
			Price:     strings.TrimSpace(row.Price),
			Size:      strings.TrimSpace(row.Size),
			Status:    strings.TrimSpace(row.Status),
			MatchTime: strings.TrimSpace(row.MatchTime),
		})
	}
	return out, nil
}
