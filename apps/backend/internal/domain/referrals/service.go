package referrals

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/domain"
)

// ErrDisabled is returned when REFERRALS_ENABLED is off.
var ErrDisabled = errors.New("referrals: feature disabled")

// Binding links a referee to a referrer.
type Binding struct {
	RefereeWallet  string `json:"refereeWallet"`
	ReferrerWallet string `json:"referrerWallet"`
	ReferralCode   string `json:"referralCode"`
	Locked         bool   `json:"locked"`
}

// Service manages invite codes and referral tree accounting.
type Service struct {
	domain.Service
	Pool    *pgxpool.Pool
	Enabled bool
}

// New returns a referrals domain service.
func New(s domain.Service, pool *pgxpool.Pool, enabled bool) *Service {
	return &Service{Service: s, Pool: pool, Enabled: enabled}
}

// ApplyCode binds a referral code to the referee wallet.
func (s *Service) ApplyCode(ctx context.Context, referee, code string) (*Binding, error) {
	if !s.Enabled {
		return nil, ErrDisabled
	}
	// Code format: referrer wallet or opaque code resolved server-side.
	referrer := code
	if err := s.ApplyCodeBinding(ctx, referee, referrer, code); err != nil {
		return nil, err
	}
	return &Binding{RefereeWallet: referee, ReferrerWallet: referrer, ReferralCode: code}, nil
}

// GetNetwork returns referral network stats for a wallet.
func (s *Service) GetNetwork(ctx context.Context, wallet string) (map[string]any, error) {
	if !s.Enabled {
		return nil, ErrDisabled
	}
	_ = ctx
	return map[string]any{"wallet": wallet, "levels": []any{}}, nil
}
