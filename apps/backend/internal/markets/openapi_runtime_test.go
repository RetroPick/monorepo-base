// Package markets runtime smoke tests exercise handlers without full OpenAPI schema validation.
// Full OpenAPI 3.1 conformance remains a follow-up gate (MKT-P1R-FIX-006).
package markets

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"

)

func TestOpenAPIRuntimeCapabilitiesResponse(t *testing.T) {
	t.Parallel()
	fixed := time.Date(2026, 7, 30, 12, 0, 0, 0, time.UTC)
	svc := NewService(ServiceConfig{
		CatalogEnabled: true,
		CatalogProjection: stubProjection{
			observed: fixed,
			events:   []EventSummary{{ID: "polymarket:event:1", Title: "One"}},
		},
		CatalogWorker: projectionTestWorker(),
		Now:           func() time.Time { return fixed },
	})
	r := chi.NewRouter()
	RegisterRoutes(r, NewHandler(svc))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets/capabilities", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}
	if ct := rec.Header().Get("Content-Type"); ct == "" {
		t.Fatal("missing content type")
	}
	var body map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body["version"] == "" {
		t.Fatalf("capabilities %+v", body)
	}
	if features, ok := body["features"].(map[string]any); !ok || features["catalog_read"] != true {
		t.Fatalf("features %+v", body["features"])
	}
}

func TestRuntimeSmokeEventsListWeakETag(t *testing.T) {
	t.Parallel()
	fixed := time.Date(2026, 7, 30, 12, 0, 0, 0, time.UTC)
	svc := NewService(ServiceConfig{
		CatalogEnabled: true,
		CatalogProjection: stubProjection{
			observed: fixed,
			events: []EventSummary{
				{ID: "polymarket:event:1", Title: "One", Provenance: UpstreamProvenance{ContentHash: "h1"}},
			},
		},
		CatalogWorker: projectionTestWorker(),
		Now:           func() time.Time { return fixed },
	})
	r := chi.NewRouter()
	RegisterRoutes(r, NewHandler(svc))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets/events", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status %d", rec.Code)
	}
	etag := rec.Header().Get("ETag")
	if etag == "" {
		t.Fatal("missing ETag")
	}
	if etag[:3] != `W/"` {
		t.Fatalf("expected weak etag, got %q", etag)
	}
	req2 := httptest.NewRequest(http.MethodGet, "/api/v1/markets/events", nil)
	req2.Header.Set("If-None-Match", etag)
	rec2 := httptest.NewRecorder()
	r.ServeHTTP(rec2, req2)
	if rec2.Code != http.StatusNotModified {
		t.Fatalf("expected 304, got %d", rec2.Code)
	}
}

func TestMarketsHealthLiveWithoutLegacyDeps(t *testing.T) {
	t.Parallel()
	r := chi.NewRouter()
	RegisterHealthRoutes(r, HealthChecker{
		Service:     NewService(ServiceConfig{}),
		Worker:      CatalogWorkerSnapshotFrom(false, false, false),
		ServiceName: "retropick-markets-api",
	})
	req := httptest.NewRequest(http.MethodGet, "/health/live", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}
}
