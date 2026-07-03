package impact

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/domain"
)

// ErrDisabled is returned when IMPACT_ENABLED is off.
var ErrDisabled = errors.New("impact: feature disabled")

// GoodDollarSummary is the public impact dashboard payload.
type GoodDollarSummary struct {
	GDollarVolume   string `json:"gDollarVolume"`
	Predictions     int    `json:"predictions"`
	UniqueUsers     int    `json:"uniqueUsers"`
	VerifiedUsers   int    `json:"verifiedUsers"`
	RewardsClaimed  string `json:"rewardsClaimed"`
	MarketsResolved int    `json:"marketsResolved"`
	ReturningUsers  int    `json:"returningUsers"`
}

// Service aggregates KPIs for the GoodDollar impact dashboard.
type Service struct {
	domain.Service
	Pool    *pgxpool.Pool
	Enabled bool
}

// New returns an impact domain service.
func New(s domain.Service, pool *pgxpool.Pool, enabled bool) *Service {
	return &Service{Service: s, Pool: pool, Enabled: enabled}
}

// GetGoodDollarSummary returns aggregate GoodDollar KPIs.
func (s *Service) GetGoodDollarSummary(ctx context.Context) (*GoodDollarSummary, error) {
	if !s.Enabled {
		return nil, ErrDisabled
	}
	out := &GoodDollarSummary{}
	if s.Pool == nil {
		return out, nil
	}
	err := s.Pool.QueryRow(ctx, `
		SELECT
			COALESCE(SUM(gusd_volume), 0)::text,
			COALESCE(SUM(unique_users), 0)::int,
			COALESCE(SUM(verified_users), 0)::int,
			COALESCE(SUM(rewards_claimed), 0)::text,
			COALESCE(SUM(markets_resolved), 0)::int
		FROM impact_daily_metrics
	`).Scan(&out.GDollarVolume, &out.UniqueUsers, &out.VerifiedUsers, &out.RewardsClaimed, &out.MarketsResolved)
	if err != nil {
		return out, nil
	}
	return out, nil
}
