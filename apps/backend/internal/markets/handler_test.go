package markets_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"

	"retropick/apps/backend/internal/markets"
)

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
	assertNoBinaryFloats(t, rec.Body.Bytes())
}

func TestInvalidPaginationUsesStructuredBadRequest(t *testing.T) {
	t.Parallel()

	_, router := loadMarketsOpenAPISpec(t)
	r := newPhaseOneRouter(t)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets/events?cursor=bad&limit=nope", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}
	validateOpenAPIResponse(t, router, req, rec)
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
	assertFreshnessProvenance(t, decodeJSONBody(t, rec.Body.Bytes()))
	assertNoBinaryFloats(t, rec.Body.Bytes())
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
			assertNoBinaryFloats(t, rec.Body.Bytes())
		})
	}
}

func TestOrderBookRequiresTokenID(t *testing.T) {
	t.Parallel()

	_, router := loadMarketsOpenAPISpec(t)
	r := newPhaseOneRouter(t)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets/markets/456/orderbook", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}
	validateOpenAPIResponse(t, router, req, rec)
}
