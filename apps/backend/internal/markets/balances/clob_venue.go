package balances

import (
	"context"
	"errors"

	"retropick/apps/backend/internal/markets"
)

// ClobVenueSource reads tradable pUSD collateral from the Polymarket CLOB L2 API.
type ClobVenueSource struct {
	client  *ClobBalanceClient
	l2Store L2CredentialStore
}

// NewClobVenueSource wires a live CLOB balance reader.
func NewClobVenueSource(client *ClobBalanceClient, l2Store L2CredentialStore) *ClobVenueSource {
	store := l2Store
	if store == nil {
		store = UnwiredL2CredentialStore{}
	}
	return &ClobVenueSource{client: client, l2Store: store}
}

func (v *ClobVenueSource) CollateralBalance(ctx context.Context, req VenueBalanceRequest) (VenueBalanceResult, error) {
	if v.client == nil {
		return VenueBalanceResult{}, ErrUpstreamUnavailable
	}

	creds, err := v.l2Store.Credentials(ctx, req.Session)
	if err != nil {
		if errors.Is(err, ErrUpstreamUnavailable) {
			return VenueBalanceResult{}, err
		}
		return VenueBalanceResult{}, ErrUpstreamUnavailable
	}

	sigType, err := signatureTypeForWallet(req.WalletType)
	if err != nil {
		return VenueBalanceResult{}, ErrUpstreamUnavailable
	}

	balanceWei, observedAt, err := v.client.GetCollateralBalanceAllowance(ctx, creds, sigType)
	if err != nil {
		return VenueBalanceResult{}, err
	}

	collateral, err := CollateralFromWei(balanceWei)
	if err != nil {
		return VenueBalanceResult{}, ErrUpstreamUnavailable
	}

	freshness := &markets.MarketFreshness{
		State:      markets.FreshnessFresh,
		ObservedAt: observedAt,
		AgeMillis:  0,
	}
	return VenueBalanceResult{
		Collateral: collateral,
		Provenance: markets.UpstreamProvenance{
			Source:     "polymarket_clob",
			UpstreamID: req.AccountWallet,
			ObservedAt: observedAt,
		},
		Freshness: freshness,
	}, nil
}
