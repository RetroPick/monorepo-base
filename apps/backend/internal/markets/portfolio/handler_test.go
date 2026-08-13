package portfolio_test

import (
	"context"
	"encoding/json"
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

const (
	testUser    = "portfolio-user"
	otherUser   = "other-user"
	testSigner  = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
	testWallet  = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
	otherWallet = "0xcccccccccccccccccccccccccccccccccccccccc"
)

var checkedAt = time.Date(2026, 8, 13, 12, 0, 0, 0, time.UTC)

type sessionResolver struct {
	session wallet.SessionContext
	err     error
}

func (s sessionResolver) ResolveSession(*http.Request) (wallet.SessionContext, error) {
	return s.session, s.err
}

type activityReader struct{ events []activity.Event }

func (s activityReader) List(_ context.Context, userID string, req activity.PageRequest) (activity.Page, error) {
	out := activity.Page{Events: []activity.Event{}}
	for _, event := range s.events {
		if event.UserID == userID && event.AccountWallet == req.AccountWallet {
			out.Events = append(out.Events, event)
		}
	}
	return out, nil
}

type positionReader struct{ rows []positions.PositionRecord }

func (s positionReader) List(_ context.Context, userID, accountWallet string) ([]positions.PositionRecord, error) {
	out := []positions.PositionRecord{}
	for _, row := range s.rows {
		if row.UserID == userID && row.AccountWallet == accountWallet {
			out = append(out, row)
		}
	}
	return out, nil
}

func discoverer() *wallet.Discoverer {
	return &wallet.Discoverer{Store: wallet.MemoryStore{Rows: map[string][]wallet.LinkedAccount{
		testUser + "|" + testSigner: {{AccountWallet: testWallet, LinkStatus: wallet.LinkStatusLinked, IsPrimary: true}},
	}}, Now: func() time.Time { return checkedAt }}
}

func router(activityRows []activity.Event, positionRows []positions.PositionRecord, session sessionResolver) chi.Router {
	r := chi.NewRouter()
	h := portfolio.NewHandler(portfolio.HandlerConfig{
		Sessions:   session,
		Discoverer: discoverer(),
		Activity:   activityReader{events: activityRows},
		Positions:  positionReader{rows: positionRows},
		Now:        func() time.Time { return checkedAt },
	})
	r.Route("/api/v1/markets/me", func(r chi.Router) { portfolio.RegisterMeRoutes(r, h) })
	return r
}

func TestActivityIsDurableUserAndWalletScoped(t *testing.T) {
	eventAt := checkedAt.Add(-time.Minute)
	r := router([]activity.Event{
		{ID: "55555555-5555-4555-8555-555555555555", UserID: testUser, AccountWallet: testWallet, Kind: activity.KindFill, MarketID: "polymarket:market:1", TokenID: "yes", Amount: "25", UpstreamSource: "polymarket_clob", UpstreamID: "trade-1", ObservedAt: eventAt},
		{ID: "66666666-6666-4666-8666-666666666666", UserID: otherUser, AccountWallet: testWallet, Kind: activity.KindFill, Amount: "99", UpstreamSource: "polymarket_clob", UpstreamID: "trade-other", ObservedAt: eventAt},
		{ID: "77777777-7777-4777-8777-777777777777", UserID: testUser, AccountWallet: otherWallet, Kind: activity.KindFill, Amount: "88", UpstreamSource: "polymarket_clob", UpstreamID: "trade-wallet", ObservedAt: eventAt},
	}, nil, sessionResolver{session: wallet.SessionContext{UserID: testUser, SignerAddress: testSigner}})

	rec := request(t, r, "/api/v1/markets/me/activity")
	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}
	var body struct {
		Events []map[string]any `json:"events"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if len(body.Events) != 1 || body.Events[0]["eventType"] != "order_filled" || body.Events[0]["size"] != "25" {
		t.Fatalf("events=%v", body.Events)
	}
	if body.Events[0]["provenance"].(map[string]any)["upstreamId"] != "trade-1" {
		t.Fatalf("provenance=%v", body.Events[0]["provenance"])
	}
	assertPrivateNoStore(t, rec)
}

func TestSummaryCompleteAndExplicitZero(t *testing.T) {
	rows := []positions.PositionRecord{
		row(testUser, testWallet, "10", "0.4", "4000000", "1", "0", "0", true),
		row(otherUser, testWallet, "999", "1", "999000000", "999", "999", "999", true),
		row(testUser, otherWallet, "888", "1", "888000000", "888", "888", "888", true),
	}
	rec := request(t, router(nil, rows, sessionResolver{session: wallet.SessionContext{UserID: testUser, SignerAddress: testSigner}}), "/api/v1/markets/me/portfolio/summary")
	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}
	body := decode(t, rec)
	agg := body["aggregate"].(map[string]any)
	assertMoney(t, agg["totalMarkValue"], "4000000")
	assertMoney(t, agg["totalCostBasis"], "4000000")
	assertMoney(t, agg["unrealizedPnl"], "1000000")
	assertMoney(t, agg["realizedPnl"], "0")
	assertMoney(t, agg["claimableValue"], "0")
	if agg["openPositionCount"] != float64(1) {
		t.Fatalf("count=%v", agg["openPositionCount"])
	}
	assertPrivateNoStore(t, rec)
}

func TestSummaryPartialCoverageNullsMarkMetricsAndSeparatesFreshness(t *testing.T) {
	complete := row(testUser, testWallet, "10", "0.4", "4000000", "1", "0.5", "0", true)
	partial := row(testUser, testWallet, "5", "", "1000000", "", "0", "0", false)
	partial.CostBasisObserved = true
	partial.RealizedPnLObserved = true
	partial.ClaimableAmountObserved = true
	partial.SyncStatus = positions.SyncStatusReconciling
	partial.ObservedAt = checkedAt.Add(-time.Hour)
	rec := request(t, router(nil, []positions.PositionRecord{complete, partial}, sessionResolver{session: wallet.SessionContext{UserID: testUser, SignerAddress: testSigner}}), "/api/v1/markets/me/portfolio/summary")
	body := decode(t, rec)
	agg := body["aggregate"].(map[string]any)
	if agg["totalMarkValue"] != nil || agg["unrealizedPnl"] != nil {
		t.Fatalf("mark metrics=%v/%v", agg["totalMarkValue"], agg["unrealizedPnl"])
	}
	assertMoney(t, agg["realizedPnl"], "500000")
	availability := agg["availability"].(map[string]any)["markValue"].(map[string]any)
	if availability["state"] != "unavailable" || availability["availableOpenPositionCount"] != float64(1) || availability["unavailableOpenPositionCount"] != float64(1) {
		t.Fatalf("availability=%v", availability)
	}
	if body["freshness"].(map[string]any)["state"] != "resyncing" {
		t.Fatalf("freshness=%v", body["freshness"])
	}
}

func TestSummaryZeroOpenIsKnownZeroButRealizedUnavailable(t *testing.T) {
	rec := request(t, router(nil, nil, sessionResolver{session: wallet.SessionContext{UserID: testUser, SignerAddress: testSigner}}), "/api/v1/markets/me/portfolio/summary")
	agg := decode(t, rec)["aggregate"].(map[string]any)
	for _, name := range []string{"totalMarkValue", "totalCostBasis", "unrealizedPnl", "claimableValue"} {
		assertMoney(t, agg[name], "0")
	}
	if agg["realizedPnl"] != nil {
		t.Fatalf("realized=%v", agg["realizedPnl"])
	}
	if agg["availability"].(map[string]any)["realizedPnl"].(map[string]any)["state"] != "unavailable" {
		t.Fatalf("availability=%v", agg["availability"])
	}
}

func TestHandlersFailClosedWithoutSessionAndDoNotCacheErrors(t *testing.T) {
	r := router(nil, nil, sessionResolver{err: wallet.ErrUnauthorized})
	for _, path := range []string{"/api/v1/markets/me/activity", "/api/v1/markets/me/portfolio/summary"} {
		rec := request(t, r, path)
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("%s status=%d body=%s", path, rec.Code, rec.Body.String())
		}
		assertPrivateNoStore(t, rec)
	}
}

func row(user, account, size, mark, cost, unrealized, realized, claimable string, markAvailable bool) positions.PositionRecord {
	return positions.PositionRecord{UserID: user, AccountWallet: account, TokenID: size, Size: size, MarkPrice: mark, MarkPriceObserved: markAvailable, CostBasisAmount: cost, CostBasisObserved: true, UnrealizedPnL: unrealized, UnrealizedPnLObserved: markAvailable, RealizedPnL: realized, RealizedPnLObserved: true, ClaimableAmount: claimable, ClaimableAmountObserved: true, SyncStatus: positions.SyncStatusSynced, UpstreamSource: "polymarket_data_api", ObservedAt: checkedAt.Add(-time.Minute)}
}

func request(t *testing.T, h http.Handler, path string) *httptest.ResponseRecorder {
	t.Helper()
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
	return rec
}
func decode(t *testing.T, rec *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}
	var body map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	return body
}
func assertMoney(t *testing.T, value any, amount string) {
	t.Helper()
	money, ok := value.(map[string]any)
	if !ok || money["amount"] != amount || money["currency"] != "pUSD" || money["decimals"] != float64(6) {
		t.Fatalf("money=%v want=%s", value, amount)
	}
}
func assertPrivateNoStore(t *testing.T, rec *httptest.ResponseRecorder) {
	t.Helper()
	if rec.Header().Get("Cache-Control") != "private, no-store" {
		t.Fatalf("cache-control=%q", rec.Header().Get("Cache-Control"))
	}
}
