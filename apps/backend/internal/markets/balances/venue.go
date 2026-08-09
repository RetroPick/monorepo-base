package balances

import (
	"context"
	"time"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/wallet"
)

// VenueBalanceRequest carries session and primary wallet context for a venue read.
type VenueBalanceRequest struct {
	Session       SessionContext
	AccountWallet string
	WalletType    wallet.WalletType
}

// VenueBalanceResult carries collateral and upstream metadata from the venue.
type VenueBalanceResult struct {
	Collateral MoneyAmount
	Provenance markets.UpstreamProvenance
	Freshness  *markets.MarketFreshness
}

// VenueBalanceSource reads tradable collateral from the Polymarket venue (CLOB L2).
type VenueBalanceSource interface {
	CollateralBalance(ctx context.Context, req VenueBalanceRequest) (VenueBalanceResult, error)
}

// UnwiredVenueSource is the safe default until L2 credentials and CLOB client land.
type UnwiredVenueSource struct{}

func (UnwiredVenueSource) CollateralBalance(context.Context, VenueBalanceRequest) (VenueBalanceResult, error) {
	return VenueBalanceResult{}, ErrUpstreamUnavailable
}

// StubVenueSource returns a fixed balance for tests and fixtures.
type StubVenueSource struct {
	Wei        string
	ObservedAt time.Time
}

func (s StubVenueSource) CollateralBalance(_ context.Context, req VenueBalanceRequest) (VenueBalanceResult, error) {
	collateral, err := CollateralFromWei(s.Wei)
	if err != nil {
		return VenueBalanceResult{}, err
	}
	observed := s.ObservedAt
	if observed.IsZero() {
		observed = time.Now().UTC()
	}
	freshness := &markets.MarketFreshness{
		State:      markets.FreshnessFresh,
		ObservedAt: observed,
		AgeMillis:  0,
	}
	return VenueBalanceResult{
		Collateral: collateral,
		Provenance: markets.UpstreamProvenance{
			Source:     "polymarket_clob",
			UpstreamID: req.AccountWallet,
			ObservedAt: observed,
		},
		Freshness: freshness,
	}, nil
}
