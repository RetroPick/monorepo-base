package postgres

import (
	"context"
	"os"
	"testing"
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

func TestCatalogTokenRegistryExcludesClosedMarket(t *testing.T) {
	pool := integrationPool(t)
	marketID := "registry-closed-market"
	tokenID := "registry-closed-token"
	fixture := DefaultCatalogTokenFixture(marketID, tokenID)
	fixture.MarketStatus = CatalogMarketStatusClosed
	if err := fixture.Insert(context.Background(), pool); err != nil {
		t.Fatal(err)
	}
	registry, err := NewCatalogTokenRegistry(pool)
	if err != nil {
		t.Fatal(err)
	}
	if err := registry.Bootstrap(context.Background(), 100); err != nil {
		t.Fatal(err)
	}
	if _, ok := registry.MarketForToken(tokenID); ok {
		t.Fatal("closed market token should not be eligible")
	}
}

func TestMain(m *testing.M) {
	os.Exit(m.Run())
}
