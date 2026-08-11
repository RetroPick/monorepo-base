package datatrades

import (
	"context"
	"time"

	"retropick/apps/backend/internal/markets/intelligence/model"
)

// RawTrade is the normalized upstream shape from Data GET /trades.
type RawTrade struct {
	UpstreamTradeID string
	WalletAddress   string
	MarketID        string
	MarketTitle     string
	Outcome         string
	Side            model.Side
	NotionalMinor   int64
	SizeMinor       int64
	PriceMinor      int64
	TradedAt        time.Time
	DisplayName     string
}

// Client fetches wallet-attributed public trades from Data API.
type Client interface {
	ListTrades(ctx context.Context, since time.Time, limit int) ([]RawTrade, error)
}

// FixtureClient returns static trades for dev/CI.
type FixtureClient struct {
	Trades []RawTrade
}

func (c FixtureClient) ListTrades(_ context.Context, _ time.Time, limit int) ([]RawTrade, error) {
	if limit <= 0 || limit > len(c.Trades) {
		limit = len(c.Trades)
	}
	out := make([]RawTrade, limit)
	copy(out, c.Trades[:limit])
	return out, nil
}

// ToNormalized converts raw upstream trade with mandatory data_trades source.
func ToNormalized(raw RawTrade, ingestedAt time.Time) model.NormalizedTrade {
	return model.NormalizedTrade{
		Source:          model.SourceDataTrades,
		UpstreamTradeID: raw.UpstreamTradeID,
		WalletAddress:   model.NormalizeWallet(raw.WalletAddress),
		MarketID:        raw.MarketID,
		MarketTitle:     raw.MarketTitle,
		Outcome:         raw.Outcome,
		Side:            raw.Side,
		NotionalMinor:   raw.NotionalMinor,
		SizeMinor:       raw.SizeMinor,
		PriceMinor:      raw.PriceMinor,
		TradedAt:        raw.TradedAt.UTC(),
		IngestedAt:      ingestedAt.UTC(),
		DisplayName:     raw.DisplayName,
	}
}
