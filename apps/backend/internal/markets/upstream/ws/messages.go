package ws

import (
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/clob"
	"retropick/apps/backend/internal/markets/marketdata"
)

const (
	EventBook           = "book"
	EventPriceChange    = "price_change"
	EventLastTradePrice = "last_trade_price"
	EventTickSizeChange = "tick_size_change"
)

var ErrMalformedFrame = errors.New("malformed upstream frame")

// RawEvent is a parsed Polymarket market channel event.
type RawEvent struct {
	Type      string
	TokenID   string
	Market    string
	Timestamp time.Time
	Book      *clob.OrderBook
	Changes   []marketdata.PriceChange
	Trade     *TradeEvent
	TickSize  *TickSizeEvent
}

type TradeEvent struct {
	TokenID string
	Price   string
	Size    string
	Side    string
}

type TickSizeEvent struct {
	TokenID     string
	OldTickSize string
	NewTickSize string
}

// ParseFrame parses a single upstream WebSocket message (object or array batch).
func ParseFrame(data []byte) ([]RawEvent, error) {
	data = trimBOM(data)
	if len(data) == 0 {
		return nil, ErrMalformedFrame
	}
	switch data[0] {
	case '[':
		var batch []json.RawMessage
		if err := json.Unmarshal(data, &batch); err != nil {
			return nil, fmt.Errorf("%w: array decode", ErrMalformedFrame)
		}
		var out []RawEvent
		for _, item := range batch {
			events, err := parseObject(item)
			if err != nil {
				continue
			}
			out = append(out, events...)
		}
		if len(out) == 0 && len(batch) > 0 {
			return nil, ErrMalformedFrame
		}
		return out, nil
	case '{':
		return parseObject(data)
	default:
		text := strings.TrimSpace(string(data))
		if text == "PONG" {
			return nil, nil
		}
		return nil, ErrMalformedFrame
	}
}

func parseObject(data []byte) ([]RawEvent, error) {
	var envelope map[string]json.RawMessage
	if err := json.Unmarshal(data, &envelope); err != nil {
		return nil, fmt.Errorf("%w: object decode", ErrMalformedFrame)
	}
	// SDK-style envelope
	if rawType, ok := envelope["type"]; ok {
		var eventType string
		if err := json.Unmarshal(rawType, &eventType); err != nil {
			return nil, ErrMalformedFrame
		}
		if payload, ok := envelope["payload"]; ok {
			return parseSDKPayload(eventType, payload)
		}
	}
	// Raw snake_case wire format
	if rawType, ok := envelope["event_type"]; ok {
		var eventType string
		if err := json.Unmarshal(rawType, &eventType); err != nil {
			return nil, ErrMalformedFrame
		}
		return parseRawWire(eventType, data)
	}
	return nil, ErrMalformedFrame
}

func parseSDKPayload(eventType string, payload json.RawMessage) ([]RawEvent, error) {
	switch eventType {
	case EventBook:
		book, ts, err := parseBookPayload(payload)
		if err != nil {
			return nil, err
		}
		return []RawEvent{{Type: EventBook, TokenID: book.TokenID, Market: book.ConditionID, Timestamp: ts, Book: &book}}, nil
	case EventPriceChange:
		changes, market, ts, err := parsePriceChangePayload(payload)
		if err != nil {
			return nil, err
		}
		return []RawEvent{{Type: EventPriceChange, Market: market, Timestamp: ts, Changes: changes}}, nil
	case EventLastTradePrice:
		trade, market, ts, err := parseTradePayload(payload)
		if err != nil {
			return nil, err
		}
		return []RawEvent{{Type: EventLastTradePrice, TokenID: trade.TokenID, Market: market, Timestamp: ts, Trade: &trade}}, nil
	case EventTickSizeChange:
		tick, market, ts, err := parseTickPayload(payload)
		if err != nil {
			return nil, err
		}
		return []RawEvent{{Type: EventTickSizeChange, TokenID: tick.TokenID, Market: market, Timestamp: ts, TickSize: &tick}}, nil
	default:
		return nil, nil
	}
}

func parseRawWire(eventType string, data []byte) ([]RawEvent, error) {
	switch eventType {
	case EventBook:
		var raw struct {
			AssetID string          `json:"asset_id"`
			Market  string          `json:"market"`
			Bids    []clob.Level    `json:"bids"`
			Asks    []clob.Level    `json:"asks"`
			Hash    string          `json:"hash"`
			TS      string          `json:"timestamp"`
			MinSize string          `json:"min_order_size"`
			Tick    string          `json:"tick_size"`
			NegRisk bool            `json:"neg_risk"`
			Last    string          `json:"last_trade_price"`
		}
		if err := json.Unmarshal(data, &raw); err != nil {
			return nil, ErrMalformedFrame
		}
		ts := parseMillis(raw.TS)
		book := clob.OrderBook{
			ConditionID:    raw.Market,
			TokenID:        raw.AssetID,
			Timestamp:      ts,
			Hash:           raw.Hash,
			Bids:           raw.Bids,
			Asks:           raw.Asks,
			MinOrderSize:   raw.MinSize,
			TickSize:       raw.Tick,
			NegRisk:        raw.NegRisk,
			LastTradePrice: raw.Last,
		}
		return []RawEvent{{Type: EventBook, TokenID: raw.AssetID, Market: raw.Market, Timestamp: ts, Book: &book}}, nil
	case EventPriceChange:
		var raw struct {
			Market  string `json:"market"`
			TS      string `json:"timestamp"`
			Changes []struct {
				AssetID string `json:"asset_id"`
				Price   string `json:"price"`
				Size    string `json:"size"`
				Side    string `json:"side"`
				Hash    string `json:"hash"`
			} `json:"price_changes"`
		}
		if err := json.Unmarshal(data, &raw); err != nil {
			return nil, ErrMalformedFrame
		}
		ts := parseMillis(raw.TS)
		changes := make([]marketdata.PriceChange, 0, len(raw.Changes))
		for _, c := range raw.Changes {
			price, size, side, err := normalizeChange(c.Price, c.Size, c.Side)
			if err != nil {
				continue
			}
			changes = append(changes, marketdata.PriceChange{
				TokenID:   c.AssetID,
				Price:     price,
				Size:      size,
				Side:      side,
				Hash:      c.Hash,
				Timestamp: ts,
			})
		}
		return []RawEvent{{Type: EventPriceChange, Market: raw.Market, Timestamp: ts, Changes: changes}}, nil
	case EventLastTradePrice:
		var raw struct {
			AssetID string `json:"asset_id"`
			Market  string `json:"market"`
			Price   string `json:"price"`
			Size    string `json:"size"`
			Side    string `json:"side"`
			TS      string `json:"timestamp"`
		}
		if err := json.Unmarshal(data, &raw); err != nil {
			return nil, ErrMalformedFrame
		}
		trade := TradeEvent{TokenID: raw.AssetID, Price: raw.Price, Size: raw.Size, Side: raw.Side}
		return []RawEvent{{Type: EventLastTradePrice, TokenID: raw.AssetID, Market: raw.Market, Timestamp: parseMillis(raw.TS), Trade: &trade}}, nil
	case EventTickSizeChange:
		var raw struct {
			AssetID string `json:"asset_id"`
			Market  string `json:"market"`
			Old     string `json:"old_tick_size"`
			New     string `json:"new_tick_size"`
			TS      string `json:"timestamp"`
		}
		if err := json.Unmarshal(data, &raw); err != nil {
			return nil, ErrMalformedFrame
		}
		tick := TickSizeEvent{TokenID: raw.AssetID, OldTickSize: raw.Old, NewTickSize: raw.New}
		return []RawEvent{{Type: EventTickSizeChange, TokenID: raw.AssetID, Market: raw.Market, Timestamp: parseMillis(raw.TS), TickSize: &tick}}, nil
	default:
		return nil, nil
	}
}

func parseBookPayload(payload json.RawMessage) (clob.OrderBook, time.Time, error) {
	var raw struct {
		Market         string       `json:"market"`
		TokenID        string       `json:"tokenId"`
		Bids           []clob.Level `json:"bids"`
		Asks           []clob.Level `json:"asks"`
		Hash           string       `json:"hash"`
		Timestamp      string       `json:"timestamp"`
		MinOrderSize   string       `json:"minOrderSize"`
		TickSize       string       `json:"tickSize"`
		NegRisk        bool         `json:"negRisk"`
		LastTradePrice string       `json:"lastTradePrice"`
	}
	if err := json.Unmarshal(payload, &raw); err != nil {
		return clob.OrderBook{}, time.Time{}, ErrMalformedFrame
	}
	ts := parseMillis(raw.Timestamp)
	return clob.OrderBook{
		ConditionID:    raw.Market,
		TokenID:        raw.TokenID,
		Timestamp:      ts,
		Hash:           raw.Hash,
		Bids:           raw.Bids,
		Asks:           raw.Asks,
		MinOrderSize:   raw.MinOrderSize,
		TickSize:       raw.TickSize,
		NegRisk:        raw.NegRisk,
		LastTradePrice: raw.LastTradePrice,
	}, ts, nil
}

func parsePriceChangePayload(payload json.RawMessage) ([]marketdata.PriceChange, string, time.Time, error) {
	var raw struct {
		Market  string `json:"market"`
		TS      string `json:"timestamp"`
		Changes []struct {
			TokenID string `json:"tokenId"`
			Price   string `json:"price"`
			Size    string `json:"size"`
			Side    string `json:"side"`
			Hash    string `json:"hash"`
		} `json:"priceChanges"`
	}
	if err := json.Unmarshal(payload, &raw); err != nil {
		return nil, "", time.Time{}, ErrMalformedFrame
	}
	ts := parseMillis(raw.TS)
	changes := make([]marketdata.PriceChange, 0, len(raw.Changes))
	for _, c := range raw.Changes {
		price, size, side, err := normalizeChange(c.Price, c.Size, c.Side)
		if err != nil {
			continue
		}
		changes = append(changes, marketdata.PriceChange{
			TokenID:   c.TokenID,
			Price:     price,
			Size:      size,
			Side:      side,
			Hash:      c.Hash,
			Timestamp: ts,
		})
	}
	return changes, raw.Market, ts, nil
}

func parseTradePayload(payload json.RawMessage) (TradeEvent, string, time.Time, error) {
	var raw struct {
		Market  string `json:"market"`
		TokenID string `json:"tokenId"`
		Price   string `json:"price"`
		Size    string `json:"size"`
		Side    string `json:"side"`
		TS      string `json:"timestamp"`
	}
	if err := json.Unmarshal(payload, &raw); err != nil {
		return TradeEvent{}, "", time.Time{}, ErrMalformedFrame
	}
	return TradeEvent{TokenID: raw.TokenID, Price: raw.Price, Size: raw.Size, Side: raw.Side}, raw.Market, parseMillis(raw.TS), nil
}

func parseTickPayload(payload json.RawMessage) (TickSizeEvent, string, time.Time, error) {
	var raw struct {
		Market  string `json:"market"`
		TokenID string `json:"tokenId"`
		Old     string `json:"oldTickSize"`
		New     string `json:"newTickSize"`
		TS      string `json:"timestamp"`
	}
	if err := json.Unmarshal(payload, &raw); err != nil {
		return TickSizeEvent{}, "", time.Time{}, ErrMalformedFrame
	}
	return TickSizeEvent{TokenID: raw.TokenID, OldTickSize: raw.Old, NewTickSize: raw.New}, raw.Market, parseMillis(raw.TS), nil
}

func normalizeChange(price, size, side string) (markets.DecimalString, markets.DecimalString, marketdata.Side, error) {
	p, err := markets.ParseDecimalString(price)
	if err != nil {
		return "", "", "", err
	}
	s, err := markets.ParseDecimalString(size)
	if err != nil {
		return "", "", "", err
	}
	switch strings.ToUpper(strings.TrimSpace(side)) {
	case "BUY", "BID":
		return p, s, marketdata.SideBid, nil
	case "SELL", "ASK":
		return p, s, marketdata.SideAsk, nil
	default:
		return "", "", "", fmt.Errorf("invalid side")
	}
}

func parseMillis(raw string) time.Time {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return time.Time{}
	}
	ms, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || ms <= 0 {
		return time.Time{}
	}
	return time.UnixMilli(ms).UTC()
}

func trimBOM(data []byte) []byte {
	return bytesTrimPrefix(data, []byte{0xEF, 0xBB, 0xBF})
}

func bytesTrimPrefix(s, prefix []byte) []byte {
	if len(s) >= len(prefix) {
		for i := range prefix {
			if s[i] != prefix[i] {
				return s
			}
		}
		return s[len(prefix):]
	}
	return s
}

// SubscriptionMessage builds the initial upstream subscribe frame.
func SubscriptionMessage(tokenIDs []string) ([]byte, error) {
	if len(tokenIDs) == 0 {
		return nil, errors.New("no token ids")
	}
	return json.Marshal(map[string]any{
		"assets_ids": tokenIDs,
		"type":       "market",
	})
}

// UpdateSubscriptionMessage builds a dynamic subscribe/unsubscribe frame.
func UpdateSubscriptionMessage(operation string, tokenIDs []string) ([]byte, error) {
	if operation != "subscribe" && operation != "unsubscribe" {
		return nil, errors.New("invalid operation")
	}
	return json.Marshal(map[string]any{
		"operation":  operation,
		"assets_ids": tokenIDs,
	})
}
