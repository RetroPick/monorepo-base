package postgres

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/dbqueries"
)

// CatalogLease holds a session-scoped advisory lock on one pooled connection.
type CatalogLease interface {
	Release(context.Context) error
}

// CatalogLocker acquires PostgreSQL advisory locks on a pinned connection.
type CatalogLocker struct {
	pool *pgxpool.Pool
}

func NewCatalogLocker(pool *pgxpool.Pool) (*CatalogLocker, error) {
	if pool == nil {
		return nil, fmt.Errorf("catalog locker: pool is required")
	}
	return &CatalogLocker{pool: pool}, nil
}

type catalogLease struct {
	conn *pgxpool.Conn
}

func (l *CatalogLocker) TryAcquire(ctx context.Context) (CatalogLease, bool, error) {
	conn, err := l.pool.Acquire(ctx)
	if err != nil {
		return nil, false, fmt.Errorf("catalog locker: acquire connection: %w", err)
	}
	queries := dbqueries.New(conn)
	acquired, err := queries.TryMarketsAdvisoryLock(ctx, catalogAdvisoryLockKey)
	if err != nil {
		conn.Release()
		return nil, false, fmt.Errorf("catalog locker: try advisory lock: %w", err)
	}
	if !acquired {
		conn.Release()
		return nil, false, nil
	}
	return &catalogLease{conn: conn}, true, nil
}

func (l *catalogLease) Release(ctx context.Context) error {
	if l == nil || l.conn == nil {
		return nil
	}
	defer l.conn.Release()
	queries := dbqueries.New(l.conn)
	if _, err := queries.ReleaseMarketsAdvisoryLock(ctx, catalogAdvisoryLockKey); err != nil {
		return fmt.Errorf("catalog locker: release advisory lock: %w", err)
	}
	return nil
}
