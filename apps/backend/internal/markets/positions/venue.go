package positions

import (
	"context"
	"time"
)

// VenuePosition is normalized venue truth for one open outcome token holding.
type VenuePosition struct {
	TokenID      string
	MarketID     string
	ConditionID  string
	OutcomeLabel string
	Size         string
	AvgPrice     string
	UpstreamID   string
}

// VenuePositionRequest scopes a venue positions fetch.
type VenuePositionRequest struct {
	AccountWallet string
}

// VenuePositionReader loads open positions from Polymarket Data API (read-only).
type VenuePositionReader interface {
	ListPositions(ctx context.Context, req VenuePositionRequest) ([]VenuePosition, time.Time, error)
}

// UnwiredVenueSource fails closed when no Data API client is configured.
type UnwiredVenueSource struct{}

func (UnwiredVenueSource) ListPositions(context.Context, VenuePositionRequest) ([]VenuePosition, time.Time, error) {
	return nil, time.Time{}, ErrUpstreamUnavailable
}
