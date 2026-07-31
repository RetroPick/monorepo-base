package postgres

import (
	"context"
	"fmt"
	"sync"

	"retropick/apps/backend/internal/dbqueries"
)

// CatalogTokenRegistry provides catalog-backed token→market resolution.
type CatalogTokenRegistry struct {
	queries *dbqueries.Queries
	mu      sync.RWMutex
	tokens  map[string]string
	ready   bool
}

func NewCatalogTokenRegistry(database dbqueries.DBTX) (*CatalogTokenRegistry, error) {
	if database == nil {
		return nil, fmt.Errorf("catalog token registry: database required")
	}
	return &CatalogTokenRegistry{
		queries: dbqueries.New(database),
		tokens:  make(map[string]string),
	}, nil
}

// Bootstrap loads token mappings from the catalog projection.
func (r *CatalogTokenRegistry) Bootstrap(ctx context.Context, limit int32) error {
	if limit <= 0 {
		limit = 10000
	}
	rows, err := r.queries.ListCatalogTokenMappings(ctx, limit)
	if err != nil {
		return fmt.Errorf("bootstrap catalog token registry: %w", err)
	}
	next := make(map[string]string, len(rows))
	for _, row := range rows {
		if row.UpstreamTokenID != "" && row.MarketID != "" {
			next[row.UpstreamTokenID] = row.MarketID
		}
	}
	r.mu.Lock()
	r.tokens = next
	r.ready = len(next) > 0
	r.mu.Unlock()
	return nil
}

// Refresh reloads mappings after catalog sync.
func (r *CatalogTokenRegistry) Refresh(ctx context.Context) error {
	return r.Bootstrap(ctx, 10000)
}

// Ready reports whether bootstrap produced at least one mapping.
func (r *CatalogTokenRegistry) Ready() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.ready
}

// MarketForToken resolves a token to its canonical market ID.
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
		return "", false, nil
	}
	r.mu.Lock()
	r.tokens[tokenID] = row
	r.ready = true
	r.mu.Unlock()
	return row, true, nil
}

// ValidateToken ensures marketId/tokenId pair matches catalog.
func (r *CatalogTokenRegistry) ValidateToken(ctx context.Context, marketID, tokenID string) error {
	found, ok, err := r.LookupMarket(ctx, tokenID)
	if err != nil {
		return err
	}
	if !ok || found != marketID {
		return fmt.Errorf("token not in catalog")
	}
	return nil
}
