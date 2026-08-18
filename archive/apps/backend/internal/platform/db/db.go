package db

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/db"
)

// Pool wraps the existing pgx pool.
type Pool struct {
	*pgxpool.Pool
}

// Open opens a pool using shared db helpers.
func Open(ctx context.Context, databaseURL string, maxConns, minConns int32) (*Pool, error) {
	p, err := db.NewPoolWithConfig(ctx, databaseURL, db.PoolConfig{
		MaxConns: maxConns,
		MinConns: minConns,
		MaxConnLifetime:     30 * time.Minute,
		HealthCheckInterval: 30 * time.Second,
	})
	if err != nil {
		return nil, err
	}
	return &Pool{Pool: p}, nil
}
