package postgres

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Canonical catalog status values per migration 000016 CHECK constraints.
const (
	CatalogEventStatusOpen     = "open"
	CatalogEventStatusClosed   = "closed"
	CatalogEventStatusResolved = "resolved"
	CatalogEventStatusArchived = "archived"
	CatalogEventStatusUnknown  = "unknown"

	CatalogMarketStatusOpen     = "open"
	CatalogMarketStatusClosed   = "closed"
	CatalogMarketStatusResolved = "resolved"
	CatalogMarketStatusArchived = "archived"
	CatalogMarketStatusUnknown  = "unknown"
)

// CatalogTokenFixture seeds a minimal event → market → outcome → token mapping.
type CatalogTokenFixture struct {
	EventID      string
	MarketID     string
	ConditionID  string
	TokenID      string
	OutcomeID    string
	EventStatus  string
	MarketStatus string
}

// DefaultCatalogTokenFixture returns a fixture with canonical open statuses.
func DefaultCatalogTokenFixture(marketID, tokenID string) CatalogTokenFixture {
	return CatalogTokenFixture{
		EventID:      "evt-" + marketID,
		MarketID:     marketID,
		ConditionID:  "0xcondition-" + marketID,
		TokenID:      tokenID,
		OutcomeID:    "out-" + tokenID,
		EventStatus:  CatalogEventStatusOpen,
		MarketStatus: CatalogMarketStatusOpen,
	}
}

// Insert writes the fixture rows using canonical status vocabulary.
func (f CatalogTokenFixture) Insert(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, `
INSERT INTO markets_catalog_events (event_id, slug, title, status, source, content_hash, observed_at)
VALUES ($1, $1, 'event', $2, 'test', 'hash', NOW())
ON CONFLICT (event_id) DO UPDATE SET status = EXCLUDED.status`, f.EventID, f.EventStatus)
	if err != nil {
		return err
	}
	_, err = pool.Exec(ctx, `
INSERT INTO markets_catalog_markets (market_id, event_id, condition_id, slug, question, status, source, content_hash, observed_at)
VALUES ($1, $2, $3, $1, 'q', $4, 'test', 'hash', NOW())
ON CONFLICT (market_id) DO UPDATE SET status = EXCLUDED.status`, f.MarketID, f.EventID, f.ConditionID, f.MarketStatus)
	if err != nil {
		return err
	}
	_, err = pool.Exec(ctx, `
INSERT INTO markets_catalog_outcomes (outcome_id, market_id, upstream_token_id, outcome_index, name, observed_at)
VALUES ($1, $2, $3, 0, 'Yes', NOW())
ON CONFLICT (outcome_id) DO UPDATE SET
	upstream_token_id = EXCLUDED.upstream_token_id,
	market_id = EXCLUDED.market_id`,
		f.OutcomeID, f.MarketID, f.TokenID)
	return err
}

func seedCatalogTokenMapping(t *testing.T, pool *pgxpool.Pool, marketID, tokenID string) {
	t.Helper()
	fixture := DefaultCatalogTokenFixture(marketID, tokenID)
	if err := fixture.Insert(context.Background(), pool); err != nil {
		t.Fatal(err)
	}
}
