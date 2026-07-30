package marketdata

import (
	"time"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/clob"
)

// Processor adapts the pure market-data functions to the application service's
// dependency-inversion boundary.
type Processor struct{}

func (Processor) BuildSnapshot(
	marketID string,
	upstream clob.OrderBook,
	observedAt time.Time,
	maxAge time.Duration,
) (markets.OrderBookSnapshot, error) {
	return BuildSnapshot(marketID, upstream, observedAt, maxAge)
}

func (Processor) NormalizeHistory(rows []clob.PricePoint) ([]markets.PricePoint, error) {
	return NormalizeHistory(rows)
}

func (Processor) Health(snapshot markets.OrderBookSnapshot, observedAt time.Time) (markets.MarketHealthSnapshot, error) {
	return Health(snapshot, observedAt)
}
