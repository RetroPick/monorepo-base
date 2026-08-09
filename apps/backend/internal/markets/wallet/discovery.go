package wallet

import (
	"context"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common"
)

// Discoverer resolves linked account wallets for an authenticated session.
type Discoverer struct {
	Store   AccountStore
	Metrics Recorder
	Now     func() time.Time
}

// DefaultDiscoverer wires BLK-safe defaults: unwired store, no synthetic addresses.
func DefaultDiscoverer() *Discoverer {
	return NewDiscoverer(UnwiredStore{}, NopRecorder{})
}

// NewDiscoverer builds a discoverer with the given store and metrics recorder.
func NewDiscoverer(store AccountStore, metrics Recorder) *Discoverer {
	return &Discoverer{
		Store:   store,
		Metrics: metrics,
		Now:     time.Now,
	}
}

func (d *Discoverer) nowUTC() time.Time {
	if d.Now != nil {
		return d.Now().UTC()
	}
	return time.Now().UTC()
}

// ListWallets returns signer-bound account wallets without collapsing identity fields.
func (d *Discoverer) ListWallets(ctx context.Context, session SessionContext) (WalletsListResponse, error) {
	signer, err := normalizeAddress(session.SignerAddress)
	if err != nil {
		return WalletsListResponse{}, err
	}
	if strings.TrimSpace(session.UserID) == "" {
		return WalletsListResponse{}, ErrUnauthorized
	}

	store := d.Store
	if store == nil {
		store = UnwiredStore{}
	}

	rows, err := store.ListBySigner(ctx, session.UserID, signer)
	if err != nil {
		return WalletsListResponse{}, err
	}

	wallets := make([]LinkedWallet, 0, len(rows))
	for _, row := range rows {
		account, normErr := normalizeAddress(row.AccountWallet)
		if normErr != nil {
			continue
		}
		wt := row.WalletType
		if wt == "" {
			wt = WalletTypeDepositWallet
		}
		ls := row.LinkStatus
		if ls == "" {
			ls = LinkStatusLinked
		}
		chainID := row.ChainID
		if chainID == 0 {
			chainID = PolygonChainID
		}
		wallets = append(wallets, LinkedWallet{
			AccountWallet: account,
			WalletType:    wt,
			LinkStatus:    ls,
			IsPrimary:     row.IsPrimary,
			ChainID:       chainID,
		})
	}

	if d.Metrics != nil {
		if len(wallets) == 0 {
			d.Metrics.RecordDiscovery("not_linked")
		} else {
			d.Metrics.RecordDiscovery("linked")
		}
	}

	return WalletsListResponse{
		SchemaVersion: SchemaVersion,
		SignerAddress: signer,
		Wallets:       wallets,
		CheckedAt:     d.nowUTC(),
	}, nil
}

func normalizeAddress(raw string) (string, error) {
	addr := strings.TrimSpace(raw)
	if !common.IsHexAddress(addr) {
		return "", ErrInvalidAddress
	}
	return strings.ToLower(common.HexToAddress(addr).Hex()), nil
}
