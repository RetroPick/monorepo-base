package market

import (
	"context"

	"retropick/apps/backend/internal/domain"
)

// Service handles market read models and template projections.
type Service struct {
	domain.Service
	Repo Repository
}

// Repository persists market projections.
type Repository interface {
	domain.Repository
}

// New returns a market domain service.
func New(s domain.Service, repo Repository) *Service {
	return &Service{Service: s, Repo: repo}
}

// HandleChainEvent processes bus events for market projections.
func (s *Service) HandleChainEvent(ctx context.Context, name string) error {
	_ = ctx
	_ = name
	return nil
}
