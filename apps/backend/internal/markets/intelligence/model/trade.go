package model

import (
	"fmt"
	"strings"
	"time"
)

const SourceDataTrades = "data_trades"

// Side is the trade direction from upstream Data API.
type Side string

const (
	SideBuy  Side = "BUY"
	SideSell Side = "SELL"
)

func (s Side) Valid() bool {
	return s == SideBuy || s == SideSell
}

// NormalizedTrade is a wallet-attributed public trade projection.
type NormalizedTrade struct {
	Source           string
	UpstreamTradeID  string
	WalletAddress    string
	MarketID         string
	MarketTitle      string
	Outcome          string
	Side             Side
	NotionalMinor    int64
	SizeMinor        int64
	PriceMinor       int64
	TradedAt         time.Time
	IngestedAt       time.Time
	DisplayName      string
}

// MarketContext supplies optional market stats for whale classification.
type MarketContext struct {
	Vol24hMinor       int64
	DepthAt2PctMinor  int64
	ImpactBps         int64
	ImpactMethod      string
	ImpactUnavailable bool
}

// Validate ensures wallet attribution and required fields for Data /trades shape.
func (t NormalizedTrade) Validate() error {
	if t.Source != SourceDataTrades {
		return fmt.Errorf("trade source must be %q", SourceDataTrades)
	}
	if strings.TrimSpace(t.UpstreamTradeID) == "" {
		return fmt.Errorf("upstream_trade_id required")
	}
	if strings.TrimSpace(t.WalletAddress) == "" {
		return fmt.Errorf("wallet_address required for attribution")
	}
	if strings.TrimSpace(t.MarketID) == "" {
		return fmt.Errorf("market_id required")
	}
	if !t.Side.Valid() {
		return fmt.Errorf("invalid side")
	}
	if t.NotionalMinor <= 0 {
		return fmt.Errorf("notional must be positive")
	}
	if t.TradedAt.IsZero() {
		return fmt.Errorf("traded_at required")
	}
	return nil
}

func NormalizeWallet(addr string) string {
	return strings.ToLower(strings.TrimSpace(addr))
}
