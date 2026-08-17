package markets_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/positions"
)

// portfolioRouter mirrors the W1-006 main.go wiring: the portfolio read surface
// (positions handler + activity/portfolio-summary placeholders) mounted under
// /api/v1/markets/me behind the PortfolioReadGate.
func portfolioRouter(svc *markets.Service) http.Handler {
	r := chi.NewRouter()
	r.Route("/api/v1/markets/me", func(r chi.Router) {
		r.Use(markets.PortfolioReadGate(svc))
		positions.RegisterMeRoutes(r, positions.HandlerConfig{})
		r.Get("/activity", markets.PortfolioNotImplementedHandler())
		r.Route("/portfolio", func(r chi.Router) {
			r.Get("/summary", markets.PortfolioNotImplementedHandler())
		})
	})
	return r
}

func TestPortfolioReadRoutesGatedWhenCapabilityDisabled(t *testing.T) {
	t.Parallel()

	svc := markets.NewService(markets.ServiceConfig{})
	// MKT-P4 capability gate invariant: portfolio_read stays false until QA green.
	if caps := svc.Capabilities(t.Context()); caps.Features["portfolio_read"] {
		t.Fatal("portfolio_read must stay false until QA green (MKT-P4 capability gate)")
	}

	r := portfolioRouter(svc)
	_, openAPIRouter := loadMarketsOpenAPISpec(t)

	cases := []struct {
		name string
		path string
	}{
		{name: "positions", path: "/api/v1/markets/me/positions"},
		{name: "activity", path: "/api/v1/markets/me/activity"},
		{name: "portfolio summary", path: "/api/v1/markets/me/portfolio/summary"},
	}
	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tc.path, nil)
			rec := httptest.NewRecorder()
			r.ServeHTTP(rec, req)

			if rec.Code != http.StatusServiceUnavailable {
				t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
			}
			if cc := rec.Header().Get("Cache-Control"); cc != "private, no-store" {
				t.Fatalf("Cache-Control = %q, want private, no-store", cc)
			}
			// Contract conformance: the 503 body must match the OpenAPI ApiError
			// schema and the capabilityDisabled example.
			validateOpenAPIResponse(t, openAPIRouter, req, rec)
			errObj := decodeJSONBody(t, rec.Body.Bytes())["error"].(map[string]any)
			if code, _ := errObj["code"].(string); code != "capability_disabled" {
				t.Fatalf("error.code = %q, want capability_disabled", code)
			}
			if msg, _ := errObj["message"].(string); msg != "portfolio_read is disabled" {
				t.Fatalf("error.message = %q, want portfolio_read is disabled", msg)
			}
		})
	}
}
