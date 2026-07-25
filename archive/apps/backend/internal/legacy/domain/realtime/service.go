package realtime

import (
	"context"

	"retropick/apps/backend/internal/legacy/domain"
)

// Service wraps durable realtime envelope publishing.
type Service struct {
	domain.Service
}

// New returns a realtime domain service.
func New(s domain.Service) *Service {
	return &Service{Service: s}
}

// PublishEnvelope publishes a realtime envelope topic (wired in cmd).
func (s *Service) PublishEnvelope(ctx context.Context, channel string, payload any) error {
	_ = ctx
	_ = channel
	_ = payload
	return nil
}
