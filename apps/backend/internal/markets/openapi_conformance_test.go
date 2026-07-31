package markets_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/getkin/kin-openapi/openapi3filter"
	"github.com/getkin/kin-openapi/routers"
	"github.com/getkin/kin-openapi/routers/legacy"
	"github.com/go-chi/chi/v5"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/clob"
	"retropick/apps/backend/internal/markets/marketdata"
)

func TestOpenAPIRuntimeConformancePhaseOne(t *testing.T) {
	specPath := filepath.Join("..", "..", "..", "..", "schemas", "openapi", "markets-v1.yaml")
	loader := openapi3.NewLoader()
	doc, err := loader.LoadFromFile(specPath)
	if err != nil {
		t.Fatalf("load spec: %v", err)
	}
	if err := doc.Validate(context.Background()); err != nil {
		t.Fatalf("validate spec: %v", err)
	}
	router, err := legacy.NewRouter(doc)
	if err != nil {
		t.Fatalf("router: %v", err)
	}

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
	projection := conformanceProjection{fixed: fixed, event: event, market: market}
	svc := markets.NewService(markets.ServiceConfig{
		CatalogEnabled:        true,
		CatalogProjection:     projection,
		CatalogWorker:         conformanceWorker{},
		MarketDataEnabled:     true,
		MarketData:            conformanceMarketData{now: fixed},
		MarketProcessor:       marketdata.Processor{},
		SignalsOperational:    false,
		BookMaxAge:            10 * time.Second,
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
	markets.RegisterRoutes(r, markets.NewHandler(svc))

	cases := []struct {
		name       string
		method     string
		path       string
		wantStatus int
	}{
		{name: "eligibility", method: http.MethodGet, path: "/api/v1/markets/eligibility", wantStatus: http.StatusOK},
		{name: "capabilities", method: http.MethodGet, path: "/api/v1/markets/capabilities", wantStatus: http.StatusOK},
		{name: "events", method: http.MethodGet, path: "/api/v1/markets/events", wantStatus: http.StatusOK},
		{name: "event detail", method: http.MethodGet, path: "/api/v1/markets/events/polymarket:event:1", wantStatus: http.StatusOK},
		{name: "market detail", method: http.MethodGet, path: "/api/v1/markets/markets/polymarket:market:1", wantStatus: http.StatusOK},
		{name: "orderbook", method: http.MethodGet, path: "/api/v1/markets/markets/polymarket:market:1/orderbook?tokenId=token-1", wantStatus: http.StatusOK},
		{name: "history", method: http.MethodGet, path: "/api/v1/markets/markets/polymarket:market:1/history?tokenId=token-1&interval=1d&fidelity=60", wantStatus: http.StatusOK},
		{name: "market health", method: http.MethodGet, path: "/api/v1/markets/markets/polymarket:market:1/health?tokenId=token-1", wantStatus: http.StatusOK},
		{name: "signals", method: http.MethodGet, path: "/api/v1/markets/intelligence/signals", wantStatus: http.StatusOK},
		{name: "health live", method: http.MethodGet, path: "/api/v1/health/live", wantStatus: http.StatusOK},
		{name: "health ready", method: http.MethodGet, path: "/api/v1/health/ready", wantStatus: http.StatusServiceUnavailable},
		{name: "events bad request", method: http.MethodGet, path: "/api/v1/markets/events?cursor=bad&limit=nope", wantStatus: http.StatusBadRequest},
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
}

func validateOpenAPIResponse(t *testing.T, router routers.Router, req *http.Request, rec *httptest.ResponseRecorder) {
	t.Helper()
	if rec.Code == http.StatusNotModified {
		return
	}
	route, pathParams, err := router.FindRoute(req)
	if err != nil {
		t.Fatalf("find route %s: %v", req.URL.Path, err)
	}
	input := &openapi3filter.ResponseValidationInput{
		RequestValidationInput: &openapi3filter.RequestValidationInput{
			Request:    req,
			PathParams: pathParams,
			Route:      route,
		},
		Status: rec.Code,
		Header: rec.Header(),
	}
	input.SetBodyBytes(rec.Body.Bytes())
	if err := openapi3filter.ValidateResponse(context.Background(), input); err != nil {
		t.Fatalf("openapi response validation failed for %s: %v body=%s", req.URL.Path, err, rec.Body.String())
	}
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
