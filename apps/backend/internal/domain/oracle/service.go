package oracle

import (
	"context"

	"retropick/apps/backend/internal/domain"
)

// Service wraps feed health and candle projections.
type Service struct {
	domain.Service
	Repo Repository
}

// Repository persists oracle data.
type Repository interface {
	domain.Repository
}

// New returns an oracle domain service.
func New(s domain.Service, repo Repository) *Service {
	return &Service{Service: s, Repo: repo}
}

// Ping verifies repository connectivity.
func (s *Service) Ping(ctx context.Context) error {
	if s.Repo == nil {
		return nil
	}
	return s.Repo.Ping(ctx)
}
