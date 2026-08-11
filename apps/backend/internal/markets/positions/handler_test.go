package positions_test

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"

	"retropick/apps/backend/internal/markets/positions"
	"retropick/apps/backend/internal/markets/wallet"
)

const (
	testSigner  = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
	testAccount = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
	testUserID  = "user-1"
)

type stubSessionResolver struct {
	session positions.SessionContext
	err     error
}

func (s stubSessionResolver) ResolveSession(*http.Request) (positions.SessionContext, error) {
	if s.err != nil {
		return positions.SessionContext{}, s.err
	}
	return s.session, nil
}

func linkedDiscoverer(fixed time.Time) *wallet.Discoverer {
	return &wallet.Discoverer{
		Store: wallet.MemoryStore{Rows: map[string][]wallet.LinkedAccount{
			testUserID + "|" + testSigner: {{
				AccountWallet: testAccount,
				WalletType:    wallet.WalletTypeDepositWallet,
				LinkStatus:    wallet.LinkStatusLinked,
				IsPrimary:     true,
				ChainID:       wallet.PolygonChainID,
			}},
		}},
		Now: func() time.Time { return fixed },
	}
}

func positionsRouter(cfg positions.HandlerConfig) chi.Router {
	r := chi.NewRouter()
	r.Route("/api/v1/markets/me", func(r chi.Router) {
		positions.RegisterMeRoutes(r, cfg)
	})
	return r
}

func TestListMyPositions_Unauthorized(t *testing.T) {
	t.Parallel()

	r := positionsRouter(positions.HandlerConfig{})
	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets/me/positions", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}
}

func TestListMyPositions_AccountNotLinked(t *testing.T) {
	t.Parallel()

	fixed := time.Date(2026, 8, 10, 10, 0, 0, 0, time.UTC)
	r := positionsRouter(positions.HandlerConfig{
		Sessions: stubSessionResolver{session: positions.SessionContext{
			UserID:        testUserID,
			SignerAddress: testSigner,
		}},
		Reader: positions.NewReader(positions.ReaderConfig{
			Discoverer: wallet.DefaultDiscoverer(),
			Now:        func() time.Time { return fixed },
		}),
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets/me/positions", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}
}

func TestListMyPositions_FixedPointJSON(t *testing.T) {
	t.Parallel()

	fixed := time.Date(2026, 8, 10, 10, 0, 0, 0, time.UTC)
	store := positions.NewProjectionStore()
	store.Upsert(positions.PositionRecord{
		UserID:         testUserID,
		AccountWallet:  testAccount,
		TokenID:        "tok-1",
		MarketID:       "polymarket:market:test",
		Size:           "12.5",
		AvgPrice:       "0.55",
		SyncStatus:     positions.SyncStatusSynced,
		UpstreamSource: "polymarket_data_api",
		ObservedAt:     fixed,
		UpdatedAt:      fixed,
	})

	venue := stubVenue{rows: []positions.VenuePosition{{
		TokenID: "tok-1",
		Size:    "12.5",
	}}, at: fixed}

	r := positionsRouter(positions.HandlerConfig{
		Sessions: stubSessionResolver{session: positions.SessionContext{
			UserID:        testUserID,
			SignerAddress: testSigner,
		}},
		Reader: positions.NewReader(positions.ReaderConfig{
			Discoverer: linkedDiscoverer(fixed),
			Store:      store,
			Venue:      venue,
			Now:        func() time.Time { return fixed },
		}),
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets/me/positions", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), `"size":"12.5"`) {
		t.Fatalf("body %s", rec.Body.String())
	}
	assertNoFloatMoneyFields(t, rec.Body.Bytes())
}

func TestListMyPositions_VenueDownServesLastProjection(t *testing.T) {
	t.Parallel()

	fixed := time.Date(2026, 8, 10, 10, 0, 0, 0, time.UTC)
	store := positions.NewProjectionStore()
	store.Upsert(positions.PositionRecord{
		UserID:         testUserID,
		AccountWallet:  testAccount,
		TokenID:        "tok-1",
		Size:           "7",
		SyncStatus:     positions.SyncStatusSynced,
		UpstreamSource: "polymarket_data_api",
		ObservedAt:     fixed,
		UpdatedAt:      fixed,
	})

	r := positionsRouter(positions.HandlerConfig{
		Sessions: stubSessionResolver{session: positions.SessionContext{
			UserID:        testUserID,
			SignerAddress: testSigner,
		}},
		Reader: positions.NewReader(positions.ReaderConfig{
			Discoverer: linkedDiscoverer(fixed),
			Store:      store,
			Venue:      stubVenue{err: positions.ErrUpstreamUnavailable},
			Now:        func() time.Time { return fixed },
		}),
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets/me/positions", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}
	var body positions.PositionsListResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if len(body.Positions) != 1 || string(body.Positions[0].Size) != "7" {
		t.Fatalf("positions = %+v", body.Positions)
	}
	if body.Freshness == nil || body.Freshness.State != "stale" {
		t.Fatalf("freshness = %+v", body.Freshness)
	}
}

func assertNoFloatMoneyFields(t *testing.T, raw []byte) {
	t.Helper()
	var value any
	if err := json.Unmarshal(raw, &value); err != nil {
		t.Fatal(err)
	}
	walkNoFloatSizes(t, value, "$")
}

func walkNoFloatSizes(t *testing.T, value any, path string) {
	t.Helper()
	switch v := value.(type) {
	case map[string]any:
		for key, child := range v {
			if key == "size" || key == "avgPrice" {
				if _, ok := child.(float64); ok {
					t.Fatalf("float at %s.%s", path, key)
				}
			}
			walkNoFloatSizes(t, child, path+"."+key)
		}
	case []any:
		for i, child := range v {
			walkNoFloatSizes(t, child, fmt.Sprintf("%s[%d]", path, i))
		}
	}
}
