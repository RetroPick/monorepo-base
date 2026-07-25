package domain

import (
	"context"

	"retropick/apps/backend/internal/platform/bus"
	"retropick/apps/backend/internal/platform/obs"
)

// Service is the shared domain service shape.
type Service struct {
	Bus bus.Bus
	Log obs.Logger
}

// Repository is a marker for domain-specific repos.
type Repository interface {
	Ping(ctx context.Context) error
}
