package postgres

import (
	"context"
	"fmt"
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

func TestCatalogTokenRegistryBootstrapLoadsOpenMarkets(t *testing.T) {
	pool := integrationPool(t)
	marketID := "p13c001-open-market"
	tokenID := "p13c001-open-token"
	seedCatalogTokenMapping(t, pool, marketID, tokenID)

	registry, err := NewCatalogTokenRegistry(pool)
	if err != nil {
		t.Fatal(err)
	}
	if err := registry.Bootstrap(context.Background(), 100); err != nil {
		t.Fatal(err)
	}
	if !registry.Bootstrapped() {
		t.Fatal("expected bootstrapped")
	}
	if !registry.Ready() {
		t.Fatal("expected ready with eligible mapping")
	}
	if err := registry.ValidateToken(context.Background(), marketID, tokenID); err != nil {
		t.Fatalf("valid token rejected: %v", err)
	}
}

func TestCatalogTokenRegistryExcludesNonOpenStatuses(t *testing.T) {
	pool := integrationPool(t)
	statuses := []string{
		CatalogMarketStatusClosed,
		CatalogMarketStatusResolved,
		CatalogMarketStatusArchived,
		CatalogMarketStatusUnknown,
	}
	for i, status := range statuses {
		marketID := fmt.Sprintf("p13c001-status-market-%d", i)
		tokenID := fmt.Sprintf("p13c001-status-token-%d", i)
		fixture := DefaultCatalogTokenFixture(marketID, tokenID)
		fixture.MarketStatus = status
		if err := fixture.Insert(context.Background(), pool); err != nil {
			t.Fatal(err)
		}
	}
	registry, err := NewCatalogTokenRegistry(pool)
	if err != nil {
		t.Fatal(err)
	}
	if err := registry.Bootstrap(context.Background(), 100); err != nil {
		t.Fatal(err)
	}
	for i := range statuses {
		tokenID := fmt.Sprintf("p13c001-status-token-%d", i)
		if _, ok := registry.MarketForToken(tokenID); ok {
			t.Fatalf("token %q with non-open status must be excluded", tokenID)
		}
	}
}

func TestCatalogTokenRegistryRefreshRemovesIneligibleMapping(t *testing.T) {
	pool := integrationPool(t)
	marketID := "p13c001-refresh-remove"
	tokenID := "p13c001-refresh-remove-token"
	seedCatalogTokenMapping(t, pool, marketID, tokenID)

	registry, err := NewCatalogTokenRegistry(pool)
	if err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	if err := registry.Bootstrap(ctx, 100); err != nil {
		t.Fatal(err)
	}
	if _, ok := registry.MarketForToken(tokenID); !ok {
		t.Fatal("expected token before refresh")
	}
	_, err = pool.Exec(ctx, `UPDATE markets_catalog_markets SET status = $1 WHERE market_id = $2`, CatalogMarketStatusClosed, marketID)
	if err != nil {
		t.Fatal(err)
	}
	if err := registry.Refresh(ctx); err != nil {
		t.Fatal(err)
	}
	if _, ok := registry.MarketForToken(tokenID); ok {
		t.Fatal("closed market token should be removed on refresh")
	}
}

func TestCatalogTokenRegistryRefreshReplacesChangedRelationship(t *testing.T) {
	pool := integrationPool(t)
	oldMarket := "p13c001-old-market"
	newMarket := "p13c001-new-market"
	tokenID := "p13c001-move-token"
	seedCatalogTokenMapping(t, pool, oldMarket, tokenID)

	registry, err := NewCatalogTokenRegistry(pool)
	if err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	if err := registry.Bootstrap(ctx, 100); err != nil {
		t.Fatal(err)
	}
	_, err = pool.Exec(ctx, `UPDATE markets_catalog_markets SET status = $1 WHERE market_id = $2`, CatalogMarketStatusClosed, oldMarket)
	if err != nil {
		t.Fatal(err)
	}
	seedCatalogTokenMapping(t, pool, newMarket, tokenID)
	if err := registry.Refresh(ctx); err != nil {
		t.Fatal(err)
	}
	got, ok := registry.MarketForToken(tokenID)
	if !ok || got != newMarket {
		t.Fatalf("refresh relationship = (%q, %v), want (%q, true)", got, ok, newMarket)
	}
	if err := registry.ValidateToken(ctx, oldMarket, tokenID); err == nil {
		t.Fatal("old market pairing must be rejected after refresh")
	}
}

func TestCatalogTokenRegistryLookupDoesNotMarkReadyWithoutBootstrap(t *testing.T) {
	pool := integrationPool(t)
	marketID := "p13c001-readthrough"
	tokenID := "p13c001-readthrough-token"
	seedCatalogTokenMapping(t, pool, marketID, tokenID)

	registry, err := NewCatalogTokenRegistry(pool)
	if err != nil {
		t.Fatal(err)
	}
	if registry.Ready() || registry.Bootstrapped() {
		t.Fatal("registry must not be ready before bootstrap")
	}
	found, ok, err := registry.LookupMarket(context.Background(), tokenID)
	if err != nil {
		t.Fatal(err)
	}
	if ok || found != "" {
		t.Fatalf("cache lookup before bootstrap must miss: (%q, %v)", found, ok)
	}
	if registry.Ready() || registry.Bootstrapped() {
		t.Fatal("lookup must not mark registry ready or bootstrapped")
	}
	if err := registry.ValidateToken(context.Background(), marketID, tokenID); err == nil {
		t.Fatal("validate must fail before bootstrap")
	}
}

func TestCatalogTokenRegistryValidateRequiresBootstrap(t *testing.T) {
	pool := integrationPool(t)
	marketID := "p13c001-not-bootstrapped"
	tokenID := "p13c001-not-bootstrapped-token"
	seedCatalogTokenMapping(t, pool, marketID, tokenID)

	registry, err := NewCatalogTokenRegistry(pool)
	if err != nil {
		t.Fatal(err)
	}
	if err := registry.ValidateToken(context.Background(), marketID, tokenID); err == nil {
		t.Fatal("validate before bootstrap must fail")
	}
}

func TestCatalogTokenRegistryBootstrapDBErrorLeavesPriorSnapshot(t *testing.T) {
	pool := integrationPool(t)
	seedCatalogTokenMapping(t, pool, "p13c001-stable-market", "p13c001-stable-token")

	registry, err := NewCatalogTokenRegistry(pool)
	if err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	if err := registry.Bootstrap(ctx, 100); err != nil {
		t.Fatal(err)
	}
	before := registry.Size()

	cancelCtx, cancel := context.WithCancel(ctx)
	cancel()
	if err := registry.Bootstrap(cancelCtx, 100); err == nil {
		t.Fatal("expected bootstrap error")
	}
	if registry.Size() != before {
		t.Fatalf("snapshot size changed after failed bootstrap: before=%d after=%d", before, registry.Size())
	}
	if !registry.Bootstrapped() {
		t.Fatal("prior bootstrap state must remain after failed refresh")
	}
}

func TestCatalogTokenRegistryMultiPageBootstrapComplete(t *testing.T) {
	pool := integrationPool(t)
	ctx := context.Background()
	want := make(map[string]string)
	for i := 0; i < 5; i++ {
		marketID := fmt.Sprintf("p13c001-page-market-%d", i)
		tokenID := fmt.Sprintf("p13c001-page-token-%d", i)
		want[tokenID] = marketID
		seedCatalogTokenMapping(t, pool, marketID, tokenID)
	}

	registry, err := NewCatalogTokenRegistry(pool)
	if err != nil {
		t.Fatal(err)
	}
	registry.pageSize = 2
	if err := registry.Bootstrap(ctx, 2); err != nil {
		t.Fatal(err)
	}
	for tokenID, marketID := range want {
		got, ok := registry.MarketForToken(tokenID)
		if !ok || got != marketID {
			t.Fatalf("token %q = (%q, %v)", tokenID, got, ok)
		}
	}
}

func TestCatalogTokenRegistryConcurrentRefreshAndValidate(t *testing.T) {
	pool := integrationPool(t)
	seedCatalogTokenMapping(t, pool, "p13c001-race-market", "p13c001-race-token")

	registry, err := NewCatalogTokenRegistry(pool)
	if err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	if err := registry.Bootstrap(ctx, 100); err != nil {
		t.Fatal(err)
	}

	const workers = 16
	errCh := make(chan error, workers*3)
	for i := 0; i < workers; i++ {
		go func() {
			errCh <- registry.Refresh(ctx)
		}()
		go func() {
			_, _, err := registry.LookupMarket(ctx, "p13c001-race-token")
			errCh <- err
		}()
		go func() {
			errCh <- registry.ValidateToken(ctx, "p13c001-race-market", "p13c001-race-token")
		}()
	}
	for i := 0; i < workers*3; i++ {
		if err := <-errCh; err != nil {
			t.Fatal(err)
		}
	}
}
func TestCatalogTokenRegistryFailedRefreshPreservesSnapshotAndClearsReady(t *testing.T) {
	pool := integrationPool(t)
	marketID := "p13c001-refresh-fail"
	tokenID := "p13c001-refresh-fail-token"
	seedCatalogTokenMapping(t, pool, marketID, tokenID)

	registry, err := NewCatalogTokenRegistry(pool)
	if err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	if err := registry.Bootstrap(ctx, 100); err != nil {
		t.Fatal(err)
	}
	beforeSize := registry.Size()
	if !registry.Ready() {
		t.Fatalf("ready=%v size=%d", registry.Ready(), beforeSize)
	}
	if _, ok := registry.MarketForToken(tokenID); !ok {
		t.Fatal("expected token in snapshot before failed refresh")
	}

	cancelCtx, cancel := context.WithCancel(ctx)
	cancel()
	if err := registry.Refresh(cancelCtx); err == nil {
		t.Fatal("expected refresh failure")
	}
	if registry.Ready() {
		t.Fatal("ready must clear after failed refresh")
	}
	if registry.Size() != beforeSize {
		t.Fatalf("snapshot mutated on failed refresh: before=%d after=%d", beforeSize, registry.Size())
	}
	if _, ok := registry.MarketForToken(tokenID); !ok {
		t.Fatal("prior snapshot mapping must remain after failed refresh")
	}
	if err := registry.ValidateToken(ctx, marketID, tokenID); err == nil {
		t.Fatal("validate must fail when registry not ready")
	}
}

func TestCatalogTokenRegistryFailedRefreshDoesNotPartiallyMutateSnapshot(t *testing.T) {
	pool := integrationPool(t)
	ctx := context.Background()
	for i := 0; i < 3; i++ {
		seedCatalogTokenMapping(t, pool, fmt.Sprintf("p13c001-partial-m-%d", i), fmt.Sprintf("p13c001-partial-t-%d", i))
	}

	registry, err := NewCatalogTokenRegistry(pool)
	if err != nil {
		t.Fatal(err)
	}
	registry.pageSize = 2
	if err := registry.Bootstrap(ctx, 2); err != nil {
		t.Fatal(err)
	}
	before := registry.Size()

	cancelCtx, cancel := context.WithCancel(ctx)
	cancel()
	if err := registry.Refresh(cancelCtx); err == nil {
		t.Fatal("expected refresh failure")
	}
	if registry.Size() != before {
		t.Fatalf("partial refresh mutated snapshot: before=%d after=%d", before, registry.Size())
	}
}
