package markets_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"

	"retropick/apps/backend/internal/markets/activity"
	"retropick/apps/backend/internal/markets/portfolio"
	"retropick/apps/backend/internal/markets/positions"
	"retropick/apps/backend/internal/markets/wallet"
)

type portfolioContractSession struct{}

func (portfolioContractSession) ResolveSession(*http.Request) (wallet.SessionContext, error) {
	return wallet.SessionContext{UserID: "contract-user", SignerAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}, nil
}

type portfolioContractActivity struct{}

func (portfolioContractActivity) List(context.Context, string, activity.PageRequest) (activity.Page, error) {
	return activity.Page{Events: []activity.Event{}}, nil
}

type portfolioContractPositions struct{}

func (portfolioContractPositions) List(context.Context, string, string) ([]positions.PositionRecord, error) {
	return []positions.PositionRecord{}, nil
}

func TestPortfolioRuntimeResponsesConformToOpenAPI(t *testing.T) {
	fixed := time.Date(2026, 8, 13, 12, 0, 0, 0, time.UTC)
	discoverer := &wallet.Discoverer{Store: wallet.MemoryStore{Rows: map[string][]wallet.LinkedAccount{
		"contract-user|0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa": {{AccountWallet: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", LinkStatus: wallet.LinkStatusLinked, IsPrimary: true}},
	}}, Now: func() time.Time { return fixed }}
	h := portfolio.NewHandler(portfolio.HandlerConfig{Sessions: portfolioContractSession{}, Discoverer: discoverer, Activity: portfolioContractActivity{}, Positions: portfolioContractPositions{}, Now: func() time.Time { return fixed }})
	r := chi.NewRouter()
	r.Route("/api/v1/markets/me", func(r chi.Router) { portfolio.RegisterMeRoutes(r, h) })
	_, openapiRouter := loadMarketsOpenAPISpec(t)
	for _, path := range []string{"/api/v1/markets/me/activity", "/api/v1/markets/me/portfolio/summary"} {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("%s status=%d body=%s", path, rec.Code, rec.Body.String())
		}
		validateOpenAPIResponse(t, openapiRouter, req, rec)
	}
}
