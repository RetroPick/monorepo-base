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
	event := markets.EventDetail{
		ID:     "polymarket:event:123",
		Title:  "Event A",
		Status: markets.MarketStatusOpen,
		Markets: []markets.MarketSummary{{
			ID:          "polymarket:market:456",
			ConditionID: "0xabc",
			Question:    "Will A happen?",
			Status:      markets.MarketStatusOpen,
			Outcomes: []markets.Outcome{
				{Name: "Yes", UpstreamID: "token-yes"},
				{Name: "No", UpstreamID: "token-no"},
			},
			Capabilities: markets.MarketCapability{OrderBook: true, History: true},
		}},
	}
	market := markets.MarketDetail{
		ID:          "polymarket:market:456",
		ConditionID: "0xabc",
		Question:    "Will A happen?",
		Status:      markets.MarketStatusOpen,
		Outcomes: []markets.Outcome{
			{Name: "Yes", UpstreamID: "token-yes"},
			{Name: "No", UpstreamID: "token-no"},
		},
		Capabilities: markets.MarketCapability{OrderBook: true, History: true},
		Resolution: markets.ResolutionRule{
			Description: "Resolve Yes if A happens.",
			ContentHash: "rule-hash",
			Sources:     []markets.ResolutionSource{{URL: "https://example.com/rule"}},
		},
	}
	projection := marketsCatalogProjectionStub{
		observed: now,
		event:    event,
		market:   market,
		events:   []markets.EventSummary{{ID: event.ID, Title: event.Title}},
	}
	svc := markets.NewService(markets.ServiceConfig{
		CatalogEnabled:    true,
		CatalogProjection: projection,
		CatalogWorker:     marketsCatalogWorkerStub{ready: true, hasProjection: true},
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

type marketsCatalogProjectionStub struct {
	events   []markets.EventSummary
	event    markets.EventDetail
	market   markets.MarketDetail
	observed time.Time
}

func (s marketsCatalogProjectionStub) ListEvents(_ context.Context, _ string, limit, offset int) ([]markets.EventSummary, error) {
	if offset >= len(s.events) {
		return []markets.EventSummary{}, nil
	}
	end := offset + limit
	if end > len(s.events) {
		end = len(s.events)
	}
	return s.events[offset:end], nil
}

func (s marketsCatalogProjectionStub) GetEvent(_ context.Context, eventID string) (markets.EventDetail, error) {
	if s.event.ID == eventID {
		return s.event, nil
	}
	return markets.EventDetail{}, markets.ErrNotFound
}

func (s marketsCatalogProjectionStub) GetMarket(_ context.Context, marketID string) (markets.MarketDetail, error) {
	if s.market.ID == marketID {
		return s.market, nil
	}
	return markets.MarketDetail{}, markets.ErrNotFound
}

func (s marketsCatalogProjectionStub) ProjectionStatus(context.Context) (markets.CatalogProjectionStatus, error) {
	return markets.CatalogProjectionStatus{
		LatestObserved: s.observed,
		HasProjection:  true,
		EventCount:     int64(len(s.events)),
	}, nil
}

type marketsCatalogWorkerStub struct {
	ready         bool
	degraded      bool
	hasProjection bool
}

func (s marketsCatalogWorkerStub) WorkerReady() bool         { return s.ready }
func (s marketsCatalogWorkerStub) WorkerDegraded() bool      { return s.degraded }
func (s marketsCatalogWorkerStub) ProjectionAvailable() bool { return s.hasProjection }
