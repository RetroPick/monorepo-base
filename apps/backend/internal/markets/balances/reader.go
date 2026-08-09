package balances

import (
	"context"
	"strings"
	"time"

	"retropick/apps/backend/internal/markets/wallet"
)

// ReaderConfig wires balance read dependencies.
type ReaderConfig struct {
	Discoverer *wallet.Discoverer
	Venue      VenueBalanceSource
	Now        func() time.Time
}

// Reader orchestrates session → wallet discovery → venue balance read.
type Reader struct {
	discoverer *wallet.Discoverer
	venue      VenueBalanceSource
	now        func() time.Time
}

// NewReader builds a balance reader with safe defaults.
func NewReader(cfg ReaderConfig) *Reader {
	disc := cfg.Discoverer
	if disc == nil {
		disc = wallet.DefaultDiscoverer()
	}
	venue := cfg.Venue
	if venue == nil {
		venue = UnwiredVenueSource{}
	}
	now := cfg.Now
	if now == nil {
		now = time.Now
	}
	return &Reader{discoverer: disc, venue: venue, now: now}
}

// ListBalances returns tradable pUSD for the session's primary account wallet.
func (r *Reader) ListBalances(ctx context.Context, session SessionContext) (BalancesListResponse, error) {
	if strings.TrimSpace(session.UserID) == "" || strings.TrimSpace(session.SignerAddress) == "" {
		return BalancesListResponse{}, ErrUnauthorized
	}

	walletsResp, err := r.discoverer.ListWallets(ctx, session)
	if err != nil {
		return BalancesListResponse{}, err
	}

	primary, ok := PrimaryLinkedWallet(walletsResp.Wallets)
	if !ok {
		return BalancesListResponse{}, ErrAccountNotLinked
	}

	venueResult, err := r.venue.CollateralBalance(ctx, VenueBalanceRequest{
		Session:       session,
		AccountWallet: primary.AccountWallet,
		WalletType:    primary.WalletType,
	})
	if err != nil {
		return BalancesListResponse{}, err
	}

	checkedAt := r.now().UTC()
	return BalancesListResponse{
		SchemaVersion: SchemaVersion,
		SignerAddress: walletsResp.SignerAddress,
		AccountWallet: primary.AccountWallet,
		Collateral:    venueResult.Collateral,
		CheckedAt:     checkedAt,
		Provenance:    venueResult.Provenance,
		Freshness:     venueResult.Freshness,
	}, nil
}
