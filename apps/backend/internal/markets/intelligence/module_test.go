package intelligence_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"

	"retropick/apps/backend/internal/markets/intelligence"
	"retropick/apps/backend/internal/markets/intelligence/adapter/datatrades"
	"retropick/apps/backend/internal/markets/intelligence/model"
)

func TestWhaleFeedEndToEnd(t *testing.T) {
	fixed := time.Date(2026, 8, 9, 10, 5, 0, 0, time.UTC)
	mod, err := intelligence.NewModule(intelligence.Config{
		Enabled: true,
		Now:     func() time.Time { return fixed },
	})
	if err != nil {
		t.Fatal(err)
	}

	ctx := context.Background()
	_, err = mod.IngestFixture(ctx, model.NormalizedTrade{
		Source:          model.SourceDataTrades,
		UpstreamTradeID: "tr_1001",
		WalletAddress:   "0x1111111111111111111111111111111111111111",
		MarketID:        "market_demo_1",
		MarketTitle:     "Demo market",
		Side:            model.SideBuy,
		Outcome:         "YES",
		NotionalMinor:   42_500_000_000,
		TradedAt:        time.Date(2026, 8, 9, 10, 0, 0, 0, time.UTC),
		IngestedAt:      fixed,
	}, model.MarketContext{
		Vol24hMinor:       675_000_000_000,
		ImpactUnavailable: true,
	})
	if err != nil {
		t.Fatal(err)
	}

	r := chi.NewRouter()
	r.Route("/api/v1/markets", func(r chi.Router) {
		mod.RegisterRoutes(r)
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets/intelligence/whales", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}
	body := rec.Body.String()
	for _, part := range []string{"WHALE_NOTIONAL_THRESHOLD", "0x1111111111111111111111111111111111111111", "data_trades"} {
		if !strings.Contains(body, part) {
			t.Fatalf("missing %q in body %s", part, body)
		}
	}

	_, err = mod.IngestFixture(ctx, model.NormalizedTrade{
		Source:          model.SourceDataTrades,
		UpstreamTradeID: "tr_1001",
		WalletAddress:   "0x1111111111111111111111111111111111111111",
		MarketID:        "market_demo_1",
		Side:            model.SideBuy,
		Outcome:         "YES",
		NotionalMinor:   42_500_000_000,
		TradedAt:        time.Date(2026, 8, 9, 10, 0, 0, 0, time.UTC),
		IngestedAt:      fixed,
	}, model.MarketContext{Vol24hMinor: 675_000_000_000, ImpactUnavailable: true})
	if err != nil {
		t.Fatal(err)
	}
	if len(mod.Store().AllEvents()) != 1 {
		t.Fatalf("events = %d want 1", len(mod.Store().AllEvents()))
	}
}

func TestWhaleFeedDisabled(t *testing.T) {
	mod, err := intelligence.NewModule(intelligence.Config{Enabled: false})
	if err != nil {
		t.Fatal(err)
	}
	r := chi.NewRouter()
	r.Route("/api/v1/markets", func(r chi.Router) {
		mod.RegisterRoutes(r)
	})
	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets/intelligence/whales", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "feature_disabled") {
		t.Fatalf("body %s", rec.Body.String())
	}
}

func TestRejectNonDataTradesSource(t *testing.T) {
	mod, err := intelligence.NewModule(intelligence.Config{Enabled: true})
	if err != nil {
		t.Fatal(err)
	}
	_, err = mod.IngestFixture(context.Background(), model.NormalizedTrade{
		Source:          "market_ws",
		UpstreamTradeID: "x",
		WalletAddress:   "0x1111111111111111111111111111111111111111",
		MarketID:        "m",
		Side:            model.SideBuy,
		NotionalMinor:   10_000_000_000,
		TradedAt:        time.Now(),
	}, model.MarketContext{})
	if err == nil {
		t.Fatal("expected validation error for non data_trades source")
	}
}

func TestBootstrapFromFixtureClientWithoutVolume(t *testing.T) {
	fixed := time.Date(2026, 8, 9, 10, 5, 0, 0, time.UTC)
	client := datatrades.FixtureClient{Trades: []datatrades.RawTrade{{
		UpstreamTradeID: "tr_1001",
		WalletAddress:   "0x1111111111111111111111111111111111111111",
		MarketID:        "market_demo_1",
		Side:            model.SideBuy,
		Outcome:         "YES",
		NotionalMinor:   42_500_000_000,
		TradedAt:        time.Date(2026, 8, 9, 10, 0, 0, 0, time.UTC),
	}}}
	mod, err := intelligence.NewModule(intelligence.Config{
		Enabled: true,
		Now:     func() time.Time { return fixed },
		Client:  client,
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(mod.Store().AllEvents()) != 1 {
		t.Fatalf("large notional alone should publish whale event, got %d", len(mod.Store().AllEvents()))
	}
}
