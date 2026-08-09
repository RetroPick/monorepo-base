package markets_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/clob"
	"retropick/apps/backend/internal/markets/marketdata"
)

func TestOpenAPIRuntimeConformancePhaseOne(t *testing.T) {
	_, router := loadMarketsOpenAPISpec(t)

	fixed := time.Date(2026, 7, 30, 12, 0, 0, 0, time.UTC)
	event := markets.EventDetail{
		SchemaVersion: markets.SchemaVersion,
		ID:            "polymarket:event:1",
		UpstreamID:    "1",
		Title:         "Conformance Event",
		Status:        markets.MarketStatusOpen,
		MarketCount:   1,
		Markets: []markets.MarketSummary{{
			SchemaVersion: markets.SchemaVersion,
			ID:            "polymarket:market:1",
			UpstreamID:    "1",
			ConditionID:   "0xconformance",
			Question:      "Conformance?",
			Status:        markets.MarketStatusOpen,
			Outcomes:      []markets.Outcome{{ID: "polymarket:token:1", UpstreamID: "token-1", Name: "Yes"}},
			Capabilities:  markets.MarketCapability{OrderBook: true, History: true},
			Freshness:     markets.MarketFreshness{State: markets.FreshnessFresh, ObservedAt: fixed},
			Provenance:    markets.UpstreamProvenance{Source: "retropick_projection", ObservedAt: fixed, ContentHash: "market-hash"},
		}},
		Freshness:  markets.MarketFreshness{State: markets.FreshnessFresh, ObservedAt: fixed},
		Provenance: markets.UpstreamProvenance{Source: "retropick_projection", ObservedAt: fixed, ContentHash: "event-hash"},
	}
	market := markets.MarketDetail{
		SchemaVersion: markets.SchemaVersion,
		ID:            "polymarket:market:1",
		UpstreamID:    "1",
		EventID:       event.ID,
		ConditionID:   "0xconformance",
		Question:      "Conformance?",
		Status:        markets.MarketStatusOpen,
		Outcomes:      []markets.Outcome{{ID: "polymarket:token:1", UpstreamID: "token-1", Name: "Yes"}},
		Capabilities:  markets.MarketCapability{OrderBook: true, History: true},
		Resolution: markets.ResolutionRule{
			Description: "Rule",
			ContentHash: "rule-hash",
			Sources:     []markets.ResolutionSource{{Name: "Example", URL: "https://example.com/rule"}},
		},
		Freshness:  markets.MarketFreshness{State: markets.FreshnessFresh, ObservedAt: fixed},
		Provenance: markets.UpstreamProvenance{Source: "retropick_projection", ObservedAt: fixed, ContentHash: "market-hash"},
	}
	r := newConformanceRouter(fixed, event, market, conformanceMarketData{now: fixed}, 10*time.Second)

	cases := []struct {
		name       string
		method     string
		path       string
		wantStatus int
		semantics  bool
	}{
		{name: "eligibility", method: http.MethodGet, path: "/api/v1/markets/eligibility", wantStatus: http.StatusOK},
		{name: "capabilities", method: http.MethodGet, path: "/api/v1/markets/capabilities", wantStatus: http.StatusOK},
		{name: "events", method: http.MethodGet, path: "/api/v1/markets/events", wantStatus: http.StatusOK, semantics: true},
		{name: "event detail", method: http.MethodGet, path: "/api/v1/markets/events/polymarket:event:1", wantStatus: http.StatusOK, semantics: true},
		{name: "market detail", method: http.MethodGet, path: "/api/v1/markets/markets/polymarket:market:1", wantStatus: http.StatusOK, semantics: true},
		{name: "orderbook", method: http.MethodGet, path: "/api/v1/markets/markets/polymarket:market:1/orderbook?tokenId=token-1", wantStatus: http.StatusOK, semantics: true},
		{name: "history", method: http.MethodGet, path: "/api/v1/markets/markets/polymarket:market:1/history?tokenId=token-1&interval=1d&fidelity=60", wantStatus: http.StatusOK, semantics: true},
		{name: "market health", method: http.MethodGet, path: "/api/v1/markets/markets/polymarket:market:1/health?tokenId=token-1", wantStatus: http.StatusOK, semantics: true},
		{name: "signals", method: http.MethodGet, path: "/api/v1/markets/intelligence/signals", wantStatus: http.StatusOK},
		{name: "health live", method: http.MethodGet, path: "/api/v1/health/live", wantStatus: http.StatusOK},
		{name: "health ready", method: http.MethodGet, path: "/api/v1/health/ready", wantStatus: http.StatusServiceUnavailable},
		{name: "events bad request", method: http.MethodGet, path: "/api/v1/markets/events?cursor=bad&limit=nope", wantStatus: http.StatusBadRequest},
		{name: "orderbook missing tokenId", method: http.MethodGet, path: "/api/v1/markets/markets/polymarket:market:1/orderbook", wantStatus: http.StatusBadRequest},
	}
	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(tc.method, tc.path, nil)
			rec := httptest.NewRecorder()
			r.ServeHTTP(rec, req)
			if rec.Code != tc.wantStatus {
				t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
			}
			validateOpenAPIResponse(t, router, req, rec)
			if tc.semantics && rec.Code == http.StatusOK {
				assertNoBinaryFloats(t, rec.Body.Bytes())
				assertNoMoneyAmountObjects(t, rec.Body.Bytes())
				assertPhaseOneReadSemantics(t, tc.path, rec.Body.Bytes())
			}
		})
	}

	t.Run("events etag 304", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/markets/events", nil)
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)
		etag := rec.Header().Get("ETag")
		if etag == "" {
			t.Fatal("missing etag")
		}
		req2 := httptest.NewRequest(http.MethodGet, "/api/v1/markets/events", nil)
		req2.Header.Set("If-None-Match", etag)
		rec2 := httptest.NewRecorder()
		r.ServeHTTP(rec2, req2)
		if rec2.Code != http.StatusNotModified {
			t.Fatalf("status %d", rec2.Code)
		}
	})

	t.Run("event detail accepts upstream id", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/markets/events/1", nil)
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
		}
		validateOpenAPIResponse(t, router, req, rec)
		assertNoBinaryFloats(t, rec.Body.Bytes())
		assertNoMoneyAmountObjects(t, rec.Body.Bytes())
		body := decodeJSONBody(t, rec.Body.Bytes())
		assertEventDetailSemantics(t, body)
		if id, _ := body["id"].(string); id != "polymarket:event:1" {
			t.Fatalf("id = %q", id)
		}
	})

	t.Run("orderbook stale when snapshot age exceeded", func(t *testing.T) {
		staleRouter := newConformanceRouter(
			fixed,
			event,
			market,
			conformanceMarketData{now: fixed.Add(-10 * time.Second)},
			5*time.Second,
		)
		path := "/api/v1/markets/markets/polymarket:market:1/orderbook?tokenId=token-1"
		req := httptest.NewRequest(http.MethodGet, path, nil)
		rec := httptest.NewRecorder()
		staleRouter.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
		}
		validateOpenAPIResponse(t, router, req, rec)
		assertNoBinaryFloats(t, rec.Body.Bytes())
		assertOrderBookSemantics(t, decodeJSONBody(t, rec.Body.Bytes()))
		freshness := decodeJSONBody(t, rec.Body.Bytes())["freshness"].(map[string]any)
		if state, _ := freshness["state"].(string); state != "stale" {
			t.Fatalf("freshness.state = %q", state)
		}
	})
}

func newConformanceRouter(
	fixed time.Time,
	event markets.EventDetail,
	market markets.MarketDetail,
	marketData conformanceMarketData,
	bookMaxAge time.Duration,
) http.Handler {
	projection := conformanceProjection{fixed: fixed, event: event, market: market}
	svc := markets.NewService(markets.ServiceConfig{
		CatalogEnabled:        true,
		CatalogProjection:     projection,
		CatalogWorker:         conformanceWorker{},
		MarketDataEnabled:     true,
		MarketData:            marketData,
		MarketProcessor:       marketdata.Processor{},
		SignalsOperational:    false,
		BookMaxAge:            bookMaxAge,
		Now:                   func() time.Time { return fixed },
	})
	r := chi.NewRouter()
	markets.RegisterHealthRoutes(r, markets.HealthChecker{
		Service:               svc,
		Worker:                conformanceWorker{},
		SignalsOperational:    false,
		MarketDataOperational: true,
		RealtimeState:         nil,
	})
	markets.RegisterRoutes(r, markets.NewHandler(svc), nil)
	return r
}

type conformanceProjection struct {
	fixed  time.Time
	event  markets.EventDetail
	market markets.MarketDetail
}

func (p conformanceProjection) ListEvents(_ context.Context, _ string, limit, offset int) ([]markets.EventSummary, error) {
	if offset > 0 {
		return []markets.EventSummary{}, nil
	}
	return []markets.EventSummary{{
		SchemaVersion: markets.SchemaVersion,
		ID:            p.event.ID,
		UpstreamID:    p.event.UpstreamID,
		Title:         p.event.Title,
		Status:        p.event.Status,
		MarketCount:   1,
		Freshness:     p.event.Freshness,
		Provenance:    p.event.Provenance,
	}}, nil
}

func (p conformanceProjection) GetEvent(_ context.Context, eventID string) (markets.EventDetail, error) {
	if eventID == p.event.ID {
		return p.event, nil
	}
	return markets.EventDetail{}, markets.ErrNotFound
}

func (p conformanceProjection) GetMarket(_ context.Context, marketID string) (markets.MarketDetail, error) {
	if marketID == p.market.ID {
		return p.market, nil
	}
	return markets.MarketDetail{}, markets.ErrNotFound
}

func (p conformanceProjection) ProjectionStatus(context.Context) (markets.CatalogProjectionStatus, error) {
	return markets.CatalogProjectionStatus{
		EventCount:     1,
		LatestObserved: p.fixed,
		HasProjection:  true,
	}, nil
}

type conformanceWorker struct{}

func (conformanceWorker) WorkerReady() bool         { return true }
func (conformanceWorker) WorkerDegraded() bool      { return false }
func (conformanceWorker) ProjectionAvailable() bool { return true }

type conformanceMarketData struct {
	now time.Time
}

func (c conformanceMarketData) GetOrderBook(_ context.Context, tokenID string) (clob.OrderBook, error) {
	return clob.OrderBook{
		ConditionID:  "0xconformance",
		TokenID:      tokenID,
		Timestamp:    c.now,
		Hash:         "hash-1",
		Bids:         []clob.Level{{Price: "0.4", Size: "2"}},
		Asks:         []clob.Level{{Price: "0.6", Size: "3"}},
		MinOrderSize: "1",
		TickSize:     "0.01",
	}, nil
}

func (c conformanceMarketData) GetPriceHistory(_ context.Context, _ clob.PriceHistoryRequest) ([]clob.PricePoint, error) {
	return []clob.PricePoint{{Timestamp: c.now, Price: "0.5"}}, nil
}

func TestPhaseOneReadHandlerSemantics(t *testing.T) {
	t.Parallel()

	_, router := loadMarketsOpenAPISpec(t)
	r := newPhaseOneRouter(t)
	paths := []string{
		"/api/v1/markets/events",
		"/api/v1/markets/events/123",
		"/api/v1/markets/markets/456",
		"/api/v1/markets/markets/456/orderbook?tokenId=token-yes",
		"/api/v1/markets/markets/456/history?tokenId=token-yes&interval=1d&fidelity=60",
		"/api/v1/markets/markets/456/health?tokenId=token-yes",
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
			validateOpenAPIResponse(t, router, req, rec)
			assertPhaseOneReadSemantics(t, path, rec.Body.Bytes())
		})
	}
}

func newPhaseOneRouter(t *testing.T) http.Handler {
	t.Helper()
	now := time.Date(2026, 7, 30, 6, 0, 0, 0, time.UTC)
	freshness := markets.MarketFreshness{State: markets.FreshnessFresh, ObservedAt: now}
	provenance := markets.UpstreamProvenance{Source: "retropick_projection", ObservedAt: now, ContentHash: "stub-hash"}
	event := markets.EventDetail{
		SchemaVersion: markets.SchemaVersion,
		ID:            "polymarket:event:123",
		UpstreamID:    "123",
		Title:         "Event A",
		Status:        markets.MarketStatusOpen,
		MarketCount:   1,
		Freshness:     freshness,
		Provenance:    provenance,
		Markets: []markets.MarketSummary{{
			SchemaVersion: markets.SchemaVersion,
			ID:            "polymarket:market:456",
			UpstreamID:    "456",
			ConditionID:   "0xabc",
			Question:      "Will A happen?",
			Status:        markets.MarketStatusOpen,
			Outcomes: []markets.Outcome{
				{ID: "polymarket:token:token-yes", UpstreamID: "token-yes", Name: "Yes"},
				{ID: "polymarket:token:token-no", UpstreamID: "token-no", Name: "No"},
			},
			Capabilities: markets.MarketCapability{OrderBook: true, History: true},
			Freshness:    freshness,
			Provenance:   provenance,
		}},
	}
	market := markets.MarketDetail{
		SchemaVersion: markets.SchemaVersion,
		ID:            "polymarket:market:456",
		UpstreamID:    "456",
		EventID:       event.ID,
		ConditionID:   "0xabc",
		Question:      "Will A happen?",
		Status:        markets.MarketStatusOpen,
		Outcomes: []markets.Outcome{
			{ID: "polymarket:token:token-yes", UpstreamID: "token-yes", Name: "Yes"},
			{ID: "polymarket:token:token-no", UpstreamID: "token-no", Name: "No"},
		},
		Capabilities: markets.MarketCapability{OrderBook: true, History: true},
		Freshness:    freshness,
		Provenance:   provenance,
		Resolution: markets.ResolutionRule{
			Description: "Resolve Yes if A happens.",
			ContentHash: "rule-hash",
			Sources:     []markets.ResolutionSource{{Name: "Example", URL: "https://example.com/rule"}},
		},
	}
	projection := marketsCatalogProjectionStub{
		observed: now,
		event:    event,
		market:   market,
		events: []markets.EventSummary{{
			SchemaVersion: markets.SchemaVersion,
			ID:            event.ID,
			UpstreamID:    event.UpstreamID,
			Title:         event.Title,
			Status:        event.Status,
			MarketCount:   1,
			Freshness:     freshness,
			Provenance:    provenance,
		}},
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
	markets.RegisterRoutes(r, markets.NewHandler(svc), nil)
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
