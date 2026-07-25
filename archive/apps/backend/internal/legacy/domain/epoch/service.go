package epoch

import (
	"context"

	"retropick/apps/backend/internal/legacy/domain"
)

// Service handles epoch state, positions, and claims projections.
type Service struct {
	domain.Service
	Repo Repository
}

// Repository persists epoch projections.
type Repository interface {
	domain.Repository
}

// New returns an epoch domain service.
func New(s domain.Service, repo Repository) *Service {
	return &Service{Service: s, Repo: repo}
}

// HandleChainEvent processes bus events for epoch projections.
func (s *Service) HandleChainEvent(ctx context.Context, name string) error {
	_ = ctx
	_ = name
	return nil
}
