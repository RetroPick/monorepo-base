package postgres

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"sync/atomic"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/dbqueries"
)

var (
	ErrTokenNotInCatalog = errors.New("token not in catalog")
	ErrRegistryDB        = errors.New("catalog registry database error")
)

// CatalogTokenRegistry provides catalog-backed token→market resolution.
type CatalogTokenRegistry struct {
	pool    *pgxpool.Pool
	queries *dbqueries.Queries
	mu      sync.RWMutex
	tokens  map[string]string
	ready   bool
	lastRefresh atomic.Int64
	refreshErrors atomic.Uint64
	pageSize int32
}

func NewCatalogTokenRegistry(database dbqueries.DBTX) (*CatalogTokenRegistry, error) {
	if database == nil {
		return nil, fmt.Errorf("catalog token registry: database required")
	}
	r := &CatalogTokenRegistry{
		queries:  dbqueries.New(database),
		tokens:   make(map[string]string),
		pageSize: 5000,
	}
	if pool, ok := database.(*pgxpool.Pool); ok {
		r.pool = pool
	}
	return r, nil
}

// Bootstrap loads eligible token mappings from the catalog projection.
func (r *CatalogTokenRegistry) Bootstrap(ctx context.Context, limit int32) error {
	if limit <= 0 {
		limit = r.pageSize
	}
	next := make(map[string]string)
	var offset int32
	for {
		rows, err := r.queries.ListCatalogTokenMappings(ctx, dbqueries.ListCatalogTokenMappingsParams{
			Limit:  limit,
			Offset: offset,
		})
		if err != nil {
			r.refreshErrors.Add(1)
			return fmt.Errorf("bootstrap catalog token registry: %w", err)
		}
		for _, row := range rows {
			if row.UpstreamTokenID != "" && row.MarketID != "" {
				next[row.UpstreamTokenID] = row.MarketID
			}
		}
		if int32(len(rows)) < limit {
			break
		}
		offset += limit
	}
	r.mu.Lock()
	r.tokens = next
	r.ready = len(next) > 0
	r.mu.Unlock()
	r.lastRefresh.Store(time.Now().UnixNano())
	return nil
}

// Refresh reloads mappings after catalog sync.
func (r *CatalogTokenRegistry) Refresh(ctx context.Context) error {
	return r.Bootstrap(ctx, r.pageSize)
}

// Ready reports whether bootstrap produced at least one eligible mapping.
func (r *CatalogTokenRegistry) Ready() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.ready
}

// Size returns the number of cached mappings.
func (r *CatalogTokenRegistry) Size() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.tokens)
}

// LastRefreshAge returns age since last successful refresh.
func (r *CatalogTokenRegistry) LastRefreshAge() time.Duration {
	ts := r.lastRefresh.Load()
	if ts == 0 {
		return 0
	}
	return time.Since(time.Unix(0, ts))
}

// MarketForToken resolves a token to its canonical market ID from cache.
func (r *CatalogTokenRegistry) MarketForToken(tokenID string) (string, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	marketID, ok := r.tokens[tokenID]
	return marketID, ok
}

// LookupMarket validates exact token/market relationship (fail-closed).
func (r *CatalogTokenRegistry) LookupMarket(ctx context.Context, tokenID string) (string, bool, error) {
	if tokenID == "" {
		return "", false, nil
	}
	if marketID, ok := r.MarketForToken(tokenID); ok {
		return marketID, true, nil
	}
	row, err := r.queries.GetMarketIDByUpstreamToken(ctx, tokenID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", false, nil
		}
		r.refreshErrors.Add(1)
		return "", false, ErrRegistryDB
	}
	r.mu.Lock()
	r.tokens[tokenID] = row
	r.ready = true
	r.mu.Unlock()
	return row, true, nil
}

// ValidateToken ensures marketId/tokenId pair matches eligible catalog mapping.
func (r *CatalogTokenRegistry) ValidateToken(ctx context.Context, marketID, tokenID string) error {
	found, ok, err := r.LookupMarket(ctx, tokenID)
	if err != nil {
		return err
	}
	if !ok {
		return fmt.Errorf("%w", ErrTokenNotInCatalog)
	}
	if found != marketID {
		return fmt.Errorf("%w", ErrTokenNotInCatalog)
	}
	return nil
}
