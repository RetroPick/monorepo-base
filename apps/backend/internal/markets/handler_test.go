package markets_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/clob"
	"retropick/apps/backend/internal/markets/gamma"
	"retropick/apps/backend/internal/markets/marketdata"
)

type catalogStub struct {
	event gamma.Event
}

func (s catalogStub) ListEvents(_ context.Context, _, _ int) ([]gamma.Event, error) {
	return []gamma.Event{s.event}, nil
}

func (s catalogStub) GetEvent(_ context.Context, _ string) (gamma.Event, error) {
	return s.event, nil
}

func (s catalogStub) GetMarket(_ context.Context, _ string) (gamma.Market, error) {
	return s.event.Markets[0], nil
}

type marketDataStub struct {
	now time.Time
}

func (s marketDataStub) GetOrderBook(_ context.Context, tokenID string) (clob.OrderBook, error) {
	return clob.OrderBook{
		ConditionID:  "0xabc",
		TokenID:      tokenID,
		Timestamp:    s.now,
		Hash:         "hash-1",
		Bids:         []clob.Level{{Price: "0.4", Size: "2"}},
		Asks:         []clob.Level{{Price: "0.6", Size: "3"}},
		MinOrderSize: "1",
		TickSize:     "0.01",
	}, nil
}

func (s marketDataStub) GetPriceHistory(_ context.Context, _ clob.PriceHistoryRequest) ([]clob.PricePoint, error) {
	return []clob.PricePoint{{Timestamp: s.now, Price: "0.5"}}, nil
}

func TestEligibilityHTTP(t *testing.T) {
	r := chi.NewRouter()
	markets.RegisterRoutes(r, markets.NewHandler(markets.NewService(markets.ServiceConfig{})))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets/eligibility", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status %d", rec.Code)
	}
	var body map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body["eligible"] != false {
		t.Fatalf("expected eligible false, got %v", body["eligible"])
	}
}

func TestInvalidPaginationUsesStructuredBadRequest(t *testing.T) {
	t.Parallel()

	r := newPhaseOneRouter(t)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets/events?cursor=bad&limit=nope", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}
	var body markets.ErrorResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Error.Code != "invalid_request" {
		t.Fatalf("error %+v", body.Error)
	}
}

func TestEventDetailRouteReturnsCanonicalID(t *testing.T) {
	t.Parallel()

	r := newPhaseOneRouter(t)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets/events/123", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}
	var body markets.EventDetail
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.ID != "polymarket:event:123" || len(body.Markets) != 1 {
		t.Fatalf("event %+v", body)
	}
}

func TestMarketReadRoutes(t *testing.T) {
	t.Parallel()

	r := newPhaseOneRouter(t)
	paths := []string{
		"/api/v1/markets/markets/456",
		"/api/v1/markets/markets/456/orderbook?tokenId=token-yes",
		"/api/v1/markets/markets/456/history?tokenId=token-yes&interval=1d&fidelity=60",
		"/api/v1/markets/markets/456/health?tokenId=token-yes",
		"/api/v1/markets/intelligence/signals",
	}
	for _, path := range paths {
		path := path
		t.Run(path, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, path, nil)
			rec := httptest.NewRecorder()
			r.ServeHTTP(rec, req)
			if rec.Code != http.StatusOK {
				t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
			}
			if got := rec.Header().Get("Cache-Control"); got == "" {
				t.Fatal("missing Cache-Control")
			}
		})
	}
}

func TestOrderBookRequiresTokenID(t *testing.T) {
	t.Parallel()

	r := newPhaseOneRouter(t)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets/markets/456/orderbook", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}
}

func newPhaseOneRouter(t *testing.T) http.Handler {
	t.Helper()
	now := time.Date(2026, 7, 30, 6, 0, 0, 0, time.UTC)
	event := gamma.Event{
		ID:     "123",
		Title:  "Event A",
		Active: true,
		Markets: []gamma.Market{{
			ID:               "456",
			ConditionID:      "0xabc",
			Question:         "Will A happen?",
			Description:      "Resolve Yes if A happens.",
			ResolutionSource: "https://example.com/rule",
			Active:           true,
			EnableOrderBook:  true,
			Outcomes: []gamma.Outcome{
				{Name: "Yes", TokenID: "token-yes", Price: "0.4"},
				{Name: "No", TokenID: "token-no", Price: "0.6"},
			},
		}},
	}
	svc := markets.NewService(markets.ServiceConfig{
		CatalogEnabled:    true,
		Catalog:           catalogStub{event: event},
		MarketDataEnabled: true,
		MarketData:        marketDataStub{now: now},
		MarketProcessor:   marketdata.Processor{},
		BookMaxAge:        5 * time.Second,
		Now:               func() time.Time { return now },
	})
	r := chi.NewRouter()
	markets.RegisterRoutes(r, markets.NewHandler(svc))
	return r
}
