package funding

import (
	"context"

	"retropick/apps/backend/internal/domain"
)

// Service is a facade over the existing funding package.
type Service struct {
	domain.Service
	Repo Repository
}

// Repository persists funding state.
type Repository interface {
	domain.Repository
}

// New returns a funding domain service.
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
