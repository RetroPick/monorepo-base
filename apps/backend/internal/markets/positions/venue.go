package positions

import (
	"context"
	"time"
)

// VenuePosition is normalized venue truth for one open outcome token holding.
type VenuePosition struct {
	TokenID            string
	MarketID           string
	ConditionID        string
	OutcomeLabel       string
	Size               string
	AvgPrice           string
	MarkPrice          string
	MarkPriceAvailable bool
	// CostBasisAmount is a non-negative USDC six-decimal base-unit integer.
	CostBasisAmount    string
	CostBasisAvailable bool
	// UnrealizedPnL and RealizedPnL are signed USDC DecimalStrings.
	UnrealizedPnL            string
	UnrealizedPnLAvailable   bool
	RealizedPnL              string
	RealizedPnLAvailable     bool
	Redeemable               bool
	RedeemableAvailable      bool
	ClaimableAmount          string
	ClaimableAmountAvailable bool
	UpstreamID               string
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
