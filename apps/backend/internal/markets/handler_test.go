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
}
