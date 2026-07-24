package gooddollar

import (
	"context"
	"encoding/hex"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/legacy/domain"
)

// Status is the GoodDollar user status response shape.
type Status struct {
	Wallet            string `json:"wallet"`
	ChainID           int64  `json:"chainId"`
	GDollarBalance    string `json:"gDollarBalance"`
	GoodIDVerified    bool   `json:"goodIdVerified"`
	RootWallet        string `json:"rootWallet,omitempty"`
	CanClaimOrReceive bool   `json:"canClaimOrReceiveG"`
}

// Service handles G$ config, GoodID status, and EngagementRewards metadata.
type Service struct {
	domain.Service
	Pool    *pgxpool.Pool
	ChainID int64
	Enabled bool
}

// New returns a GoodDollar domain service.
func New(s domain.Service, pool *pgxpool.Pool, chainID int64, enabled bool) *Service {
	return &Service{Service: s, Pool: pool, ChainID: chainID, Enabled: enabled}
}

// GetStatus returns cached GoodDollar status for a wallet.
func (s *Service) GetStatus(ctx context.Context, wallet string) (*Status, error) {
	if !s.Enabled {
		return nil, ErrDisabled
	}
	st := &Status{
		Wallet:            wallet,
		ChainID:           s.ChainID,
		GDollarBalance:    "0",
		CanClaimOrReceive: true,
	}
	if s.Pool == nil {
		return st, nil
	}
	var verified bool
	var rootWallet []byte
	err := s.Pool.QueryRow(ctx, `
		SELECT goodid_verified, root_wallet
		FROM gooddollar_user_status
		WHERE wallet = decode(replace(lower($1), '0x', ''), 'hex')
	`, wallet).Scan(&verified, &rootWallet)
	if err != nil {
		return st, nil
	}
	st.GoodIDVerified = verified
	if len(rootWallet) > 0 {
		st.RootWallet = "0x" + strings.ToLower(hex.EncodeToString(rootWallet))
	}
	return st, nil
}
