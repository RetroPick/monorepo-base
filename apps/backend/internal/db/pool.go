package db

import (
	"context"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func NewPool(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	return pgxpool.New(ctx, databaseURL)
}

type PoolConfig struct {
	MaxConns            int32
	MinConns            int32
	MaxConnLifetime     time.Duration
	HealthCheckInterval time.Duration
}

func NewPoolWithConfig(ctx context.Context, databaseURL string, cfg PoolConfig) (*pgxpool.Pool, error) {
	pc, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, err
	}
	// Supabase transaction pooler (port 6543) is pgbouncer-based.
	// Use simple protocol to avoid prepared-statement issues in transaction pooling.
	if strings.Contains(databaseURL, "pooler.supabase.com:6543") {
		pc.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol
	}
	if cfg.MaxConns > 0 {
		pc.MaxConns = cfg.MaxConns
	}
	if cfg.MinConns > 0 {
		pc.MinConns = cfg.MinConns
	}
	if cfg.MaxConnLifetime > 0 {
		pc.MaxConnLifetime = cfg.MaxConnLifetime
	}
	if cfg.HealthCheckInterval > 0 {
		pc.HealthCheckPeriod = cfg.HealthCheckInterval
	}
	return pgxpool.NewWithConfig(ctx, pc)
}
