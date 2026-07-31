package postgres

import (
	"context"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestCatalogTokenRegistryValidate(t *testing.T) {
	pool := integrationPool(t)
	marketID := "registry-market-a"
	tokenID := "registry-token-a"
	seedCatalogTokenMapping(t, pool, marketID, tokenID)

	registry, err := NewCatalogTokenRegistry(pool)
	if err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	if err := registry.Bootstrap(ctx, 100); err != nil {
		t.Fatal(err)
	}
	if !registry.Ready() {
		t.Fatal("registry not ready")
	}
	found, ok := registry.MarketForToken(tokenID)
	if !ok || found != marketID {
		t.Fatalf("lookup %q ok=%v", found, ok)
	}
	if err := registry.ValidateToken(ctx, marketID, tokenID); err != nil {
		t.Fatalf("valid pair rejected: %v", err)
	}
	if err := registry.ValidateToken(ctx, "market-wrong", tokenID); err == nil {
		t.Fatal("wrong market accepted")
	}
	if err := registry.ValidateToken(ctx, marketID, "token-unknown"); err == nil {
		t.Fatal("unknown token accepted")
	}
}

func TestCatalogTokenRegistryRefresh(t *testing.T) {
	pool := integrationPool(t)
	registry, err := NewCatalogTokenRegistry(pool)
	if err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	if err := registry.Bootstrap(ctx, 100); err != nil {
		t.Fatal(err)
	}
	seedCatalogTokenMapping(t, pool, "registry-market-b", "registry-token-b")
	if err := registry.Refresh(ctx); err != nil {
		t.Fatal(err)
	}
	if _, ok := registry.MarketForToken("registry-token-b"); !ok {
		t.Fatal("refresh did not add token")
	}
}

func seedCatalogTokenMapping(t *testing.T, pool *pgxpool.Pool, marketID, tokenID string) {
	t.Helper()
	ctx := context.Background()
	_, err := pool.Exec(ctx, `
INSERT INTO markets_catalog_events (event_id, slug, title, status, source, content_hash, observed_at)
VALUES ($1, $1, 'event', 'active', 'test', 'hash', NOW())
ON CONFLICT (event_id) DO NOTHING`, "evt-"+marketID)
	if err != nil {
		t.Fatal(err)
	}
	_, err = pool.Exec(ctx, `
INSERT INTO markets_catalog_markets (market_id, event_id, slug, question, status, source, content_hash, observed_at)
VALUES ($1, $2, $1, 'q', 'active', 'test', 'hash', NOW())
ON CONFLICT (market_id) DO NOTHING`, marketID, "evt-"+marketID)
	if err != nil {
		t.Fatal(err)
	}
	_, err = pool.Exec(ctx, `
INSERT INTO markets_catalog_outcomes (outcome_id, market_id, label, upstream_token_id, source, content_hash, observed_at)
VALUES ($1, $2, 'Yes', $3, 'test', 'hash', NOW())
ON CONFLICT (outcome_id) DO UPDATE SET upstream_token_id = EXCLUDED.upstream_token_id`, "out-"+tokenID, marketID, tokenID)
	if err != nil {
		t.Fatal(err)
	}
}

func TestMain(m *testing.M) {
	os.Exit(m.Run())
}
