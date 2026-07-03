package rewards

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/domain"
)

// ErrDisabled is returned when REWARDS_ENABLED is off.
var ErrDisabled = errors.New("rewards: feature disabled")

// ClaimableReward is a reward the user can claim via EngagementRewards.
type ClaimableReward struct {
	ID     int64  `json:"id"`
	Amount string `json:"amount"`
	Token  string `json:"token"`
	Reason string `json:"reason"`
	Status string `json:"status"`
}

// Service manages quest/reward ledger and claim preparation.
type Service struct {
	domain.Service
	Pool    *pgxpool.Pool
	Enabled bool
}

// New returns a rewards domain service.
func New(s domain.Service, pool *pgxpool.Pool, enabled bool) *Service {
	return &Service{Service: s, Pool: pool, Enabled: enabled}
}

// ListClaimable returns claimable rewards for a wallet.
func (s *Service) ListClaimable(ctx context.Context, wallet string) ([]ClaimableReward, error) {
	if !s.Enabled {
		return nil, ErrDisabled
	}
	return s.listClaimableFromDB(ctx, wallet)
}

// PrepareClaim builds an EngagementRewards claim payload.
func (s *Service) PrepareClaim(ctx context.Context, wallet string, rewardID int64) (map[string]any, error) {
	if !s.Enabled {
		return nil, ErrDisabled
	}
	payload := map[string]any{"wallet": wallet, "rewardId": rewardID, "status": "prepared"}
	_, err := s.RecordClaim(ctx, wallet, rewardID, payload)
	if err != nil {
		return nil, err
	}
	return payload, nil
}
