package orders_test

import (
	"context"
	"crypto/ecdsa"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/accounts"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/go-chi/chi/v5"
	siwe "github.com/spruceid/siwe-go"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/auth"
	"retropick/apps/backend/internal/markets/clob"
	"retropick/apps/backend/internal/markets/eligibility"
	"retropick/apps/backend/internal/markets/eligibility/geo"
	"retropick/apps/backend/internal/markets/eligibility/geoblock"
	"retropick/apps/backend/internal/markets/orders"
	"retropick/apps/backend/internal/markets/wallet"
)

type glueStubGeo struct {
	region string
}

func (s glueStubGeo) Resolve(_ context.Context, _ string) (geo.Location, error) {
	return geo.Location{RegionCode: s.region}, nil
}

type glueStubGeoblock struct {
	allowed bool
}

func (s glueStubGeoblock) Check(_ context.Context, _, _ string) (geoblock.Result, error) {
	return geoblock.Result{Allowed: s.allowed}, nil
}

type glueStubBooks struct{}

func (glueStubBooks) GetOrderBook(_ context.Context, _ string) (clob.OrderBook, error) {
	return clob.OrderBook{TickSize: "0.01", MinOrderSize: "1"}, nil
}

type glueStubMarkets struct{}

func (glueStubMarkets) GetMarket(_ context.Context, _ string) (markets.MarketDetail, error) {
	return markets.MarketDetail{
		Question: "Will glue test pass?",
		Outcomes: []markets.Outcome{{UpstreamID: "999001", Name: "Yes"}},
	}, nil
}

type glueFixedUserStore struct {
	auth.UserStore
	wallet string
	user   auth.User
}

func (s *glueFixedUserStore) GetOrCreate(_ context.Context, walletAddr string) (auth.User, error) {
	if strings.EqualFold(walletAddr, s.wallet) {
		return s.user, nil
	}
	return s.UserStore.GetOrCreate(context.Background(), walletAddr)
}

func glueAuthModule(t *testing.T, users auth.UserStore, eval *eligibility.Evaluator) (*auth.Module, *ecdsa.PrivateKey, time.Time) {
	t.Helper()
	fixed := time.Now().UTC().Truncate(time.Second)
	key, err := crypto.GenerateKey()
	if err != nil {
		t.Fatal(err)
	}
	if eval == nil {
		eval = eligibility.DefaultEvaluator()
	}
	eval.Now = func() time.Time { return fixed }

	mod := auth.NewModule(auth.ModuleConfig{
		Config: auth.Config{
			SessionSecret:  "test-markets-orders-glue-secret",
			AccessTTL:      15 * time.Minute,
			NonceTTL:       10 * time.Minute,
			ChainID:        137,
			CookieName:     "mkt_session",
			CSRFCookieName: "mkt_csrf",
			AllowedDomains: []string{"localhost"},
			AuthRateLimit:  100,
			AuthRateWindow: time.Minute,
		},
		Users:     users,
		Evaluator: eval,
		Now:       func() time.Time { return fixed },
	})
	return mod, key, fixed
}

func glueMarketsRouterWithOrders(t *testing.T, authMod *auth.Module, disc *wallet.Discoverer, fixed time.Time, submitEnabled bool, venue orders.VenueSubmitter) chi.Router {
	t.Helper()
	r := chi.NewRouter()
	h := markets.NewHandler(markets.NewService(markets.ServiceConfig{}))
	if disc == nil {
		disc = wallet.DefaultDiscoverer()
	}
	svc := orders.NewService(orders.ServiceConfig{
		Discoverer: disc,
		Markets:    glueStubMarkets{},
		Books:      glueStubBooks{},
		Now:        func() time.Time { return fixed },
		SaltFn:     func() (string, error) { return "42", nil },
		Submit: orders.SubmitConfig{
			OrderSubmitEnabled: submitEnabled,
			Venue:              venue,
		},
	})
	markets.RegisterRoutesWithDepsAndMarketRoutes(r, h, authMod, markets.RouteDeps{}, nil, []markets.EligibleMarketRouteRegistrar{
		func(r chi.Router) {
			orders.RegisterRoutes(r, orders.HandlerConfig{
				Service:  svc,
				Sessions: wallet.ContextSessionResolver{},
			})
		},
	})
	return r
}

func glueMarketsRouterWithOrdersAndMe(t *testing.T, authMod *auth.Module, disc *wallet.Discoverer, fixed time.Time, submitEnabled bool, venue orders.VenueSubmitter, cancelVenue orders.VenueCanceller) (chi.Router, *orders.Service) {
	t.Helper()
	r := chi.NewRouter()
	h := markets.NewHandler(markets.NewService(markets.ServiceConfig{}))
	if disc == nil {
		disc = wallet.DefaultDiscoverer()
	}
	svc := orders.NewService(orders.ServiceConfig{
		Discoverer: disc,
		Markets:    glueStubMarkets{},
		Books:      glueStubBooks{},
		Now:        func() time.Time { return fixed },
		SaltFn:     func() (string, error) { return "42", nil },
		Submit: orders.SubmitConfig{
			OrderSubmitEnabled: submitEnabled,
			Venue:              venue,
		},
		Cancel: orders.CancelConfig{
			OrderSubmitEnabled: submitEnabled,
			Venue:              cancelVenue,
		},
	})
	cfg := orders.HandlerConfig{Service: svc, Sessions: wallet.ContextSessionResolver{}}
	markets.RegisterRoutesWithDepsAndMarketRoutes(r, h, authMod, markets.RouteDeps{}, []markets.EligibleMeRouteRegistrar{
		func(r chi.Router) { orders.RegisterMeRoutes(r, cfg) },
	}, []markets.EligibleMarketRouteRegistrar{
		func(r chi.Router) { orders.RegisterRoutes(r, cfg) },
	})
	return r, svc
}

func glueSignedSIWE(t *testing.T, mod *auth.Module, key *ecdsa.PrivateKey, fixed time.Time, domain string) (string, string) {
	t.Helper()
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets/auth/nonce", nil)
	authRouter := chi.NewRouter()
	mod.RegisterRoutes(authRouter)
	authRouter.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("nonce status %d body %s", rec.Code, rec.Body.String())
	}
	var nonceBody struct {
		Nonce string `json:"nonce"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &nonceBody); err != nil {
		t.Fatal(err)
	}

	address := crypto.PubkeyToAddress(key.PublicKey)
	msg, err := siwe.InitMessage(domain, address.Hex(), "https://"+domain, nonceBody.Nonce, map[string]interface{}{
		"chainId":        137,
		"statement":      "Sign in to RetroPick Markets.",
		"issuedAt":       fixed.Format(time.RFC3339),
		"expirationTime": fixed.Add(10 * time.Minute).Format(time.RFC3339),
	})
	if err != nil {
		t.Fatal(err)
	}
	prepared := msg.String()
	hash := accounts.TextHash([]byte(prepared))
	sigBytes, err := crypto.Sign(hash, key)
	if err != nil {
		t.Fatal(err)
	}
	sigBytes[64] += 27
	signature := "0x" + hex.EncodeToString(sigBytes)
	return prepared, signature
}

func glueSessionCookie(t *testing.T, mod *auth.Module, key *ecdsa.PrivateKey, fixed time.Time) *http.Cookie {
	t.Helper()
	message, signature := glueSignedSIWE(t, mod, key, fixed, "localhost")
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/markets/auth/siwe", strings.NewReader(fmt.Sprintf(`{"message":%q,"signature":%q}`, message, signature)))
	req.Header.Set("Content-Type", "application/json")
	authRouter := chi.NewRouter()
	mod.RegisterRoutes(authRouter)
	authRouter.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("siwe status %d body %s", rec.Code, rec.Body.String())
	}
	for _, c := range rec.Result().Cookies() {
		if c.Name == "mkt_session" {
			return c
		}
	}
	t.Fatal("missing session cookie")
	return nil
}

func gluePreviewBody(maker string) string {
	return fmt.Sprintf(`{
		"marketId":"polymarket:market:456",
		"tokenId":"999001",
		"side":"BUY",
		"price":"0.42",
		"size":"100",
		"orderType":"LIMIT",
		"makerAddress":%q
	}`, maker)
}

func TestOrderPreview_Unauthenticated(t *testing.T) {
	t.Parallel()

	mod, _, fixed := glueAuthModule(t, auth.NewMemoryUserStore(), eligibility.DefaultEvaluator())
	router := glueMarketsRouterWithOrders(t, mod, nil, fixed, false, nil)

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/markets/orders/preview", strings.NewReader(gluePreviewBody("0x1111111111111111111111111111111111111111")))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}
}

func TestOrderPreview_AuthenticatedIneligible(t *testing.T) {
	t.Parallel()

	mod, key, fixed := glueAuthModule(t, auth.NewMemoryUserStore(), eligibility.DefaultEvaluator())
	router := glueMarketsRouterWithOrders(t, mod, nil, fixed, false, nil)
	sessionCookie := glueSessionCookie(t, mod, key, fixed)

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/markets/orders/preview", strings.NewReader(gluePreviewBody("0x1111111111111111111111111111111111111111")))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(sessionCookie)
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d body %s", rec.Code, rec.Body.String())
	}
	var body map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	errObj, _ := body["error"].(map[string]any)
	if errObj["code"] != "ELIGIBILITY_DENIED" {
		t.Fatalf("error %+v", errObj)
	}
}

func TestOrderPreview_AuthenticatedEligible(t *testing.T) {
	t.Parallel()

	key, err := crypto.GenerateKey()
	if err != nil {
		t.Fatal(err)
	}
	signer := strings.ToLower(crypto.PubkeyToAddress(key.PublicKey).Hex())
	userID := "glue-order-user-1"
	maker := "0x1111111111111111111111111111111111111111"

	users := &glueFixedUserStore{
		UserStore: auth.NewMemoryUserStore(),
		wallet:    signer,
		user: auth.User{
			UserID:               userID,
			Wallet:               signer,
			Standing:             eligibility.AccountStandingActive,
			TermsVersionAccepted: "",
		},
	}
	eval := eligibility.DefaultEvaluator()
	eval.Geo = glueStubGeo{region: "US"}
	eval.Geoblock = glueStubGeoblock{allowed: true}

	mod, _, fixed := glueAuthModule(t, users, eval)
	disc := wallet.NewDiscoverer(wallet.MemoryStore{Rows: map[string][]wallet.LinkedAccount{
		userID + "|" + signer: {{
			AccountWallet: maker,
			LinkStatus:    wallet.LinkStatusLinked,
			ChainID:       137,
		}},
	}}, nil)
	disc.Now = func() time.Time { return fixed }
	router := glueMarketsRouterWithOrders(t, mod, disc, fixed, false, nil)
	sessionCookie := glueSessionCookie(t, mod, key, fixed)

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/markets/orders/preview", strings.NewReader(gluePreviewBody(maker)))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(sessionCookie)
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body %s", rec.Code, rec.Body.String())
	}
	var body map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	for _, key := range []string{"previewId", "contentHash", "unsignedPayload", "humanSummary", "exchangeDomain"} {
		if body[key] == nil || body[key] == "" {
			t.Fatalf("missing %q in %+v", key, body)
		}
	}
	if hash, _ := body["contentHash"].(string); !strings.HasPrefix(hash, "0x") {
		t.Fatalf("contentHash = %v", body["contentHash"])
	}
}

type glueStubVenue struct{}

func (glueStubVenue) SubmitOrder(context.Context, clob.SubmitRequest) (clob.SubmitResult, error) {
	return clob.SubmitResult{OrderID: "venue-glue-1", Status: "live", Success: true}, nil
}

type glueStubCancelVenue struct{}

func (glueStubCancelVenue) CancelOrder(context.Context, string) (clob.CancelResult, error) {
	return clob.CancelResult{Canceled: []string{"0xvenue-glue-1"}, Success: true}, nil
}

func glueEligibleSubmitRouter(t *testing.T, submitEnabled bool, venue orders.VenueSubmitter, cancelVenue orders.VenueCanceller) (chi.Router, *auth.Module, *http.Cookie, time.Time, string) {
	t.Helper()
	key, err := crypto.GenerateKey()
	if err != nil {
		t.Fatal(err)
	}
	signer := strings.ToLower(crypto.PubkeyToAddress(key.PublicKey).Hex())
	userID := "glue-submit-user"
	maker := "0x1111111111111111111111111111111111111111"

	users := &glueFixedUserStore{
		UserStore: auth.NewMemoryUserStore(),
		wallet:    signer,
		user: auth.User{
			UserID:               userID,
			Wallet:               signer,
			Standing:             eligibility.AccountStandingActive,
			TermsVersionAccepted: "",
		},
	}
	eval := eligibility.DefaultEvaluator()
	eval.Geo = glueStubGeo{region: "US"}
	eval.Geoblock = glueStubGeoblock{allowed: true}

	mod, _, fixed := glueAuthModule(t, users, eval)
	disc := wallet.NewDiscoverer(wallet.MemoryStore{Rows: map[string][]wallet.LinkedAccount{
		userID + "|" + signer: {{
			AccountWallet: maker,
			LinkStatus:    wallet.LinkStatusLinked,
			ChainID:       137,
		}},
	}}, nil)
	disc.Now = func() time.Time { return fixed }
	router, _ := glueMarketsRouterWithOrdersAndMe(t, mod, disc, fixed, submitEnabled, venue, cancelVenue)
	return router, mod, glueSessionCookie(t, mod, key, fixed), fixed, maker
}

func glueCreatePreview(t *testing.T, router chi.Router, sessionCookie *http.Cookie, maker string) map[string]any {
	t.Helper()
	previewRec := httptest.NewRecorder()
	previewReq := httptest.NewRequest(http.MethodPost, "/api/v1/markets/orders/preview", strings.NewReader(gluePreviewBody(maker)))
	previewReq.Header.Set("Content-Type", "application/json")
	previewReq.AddCookie(sessionCookie)
	router.ServeHTTP(previewRec, previewReq)
	if previewRec.Code != http.StatusOK {
		t.Fatalf("preview status %d body %s", previewRec.Code, previewRec.Body.String())
	}
	var previewBody map[string]any
	if err := json.Unmarshal(previewRec.Body.Bytes(), &previewBody); err != nil {
		t.Fatal(err)
	}
	return previewBody
}

func gluePreviewAndSubmit(t *testing.T, router chi.Router, sessionCookie *http.Cookie, maker string, idempotencyKey string, contentHashOverride string) (*httptest.ResponseRecorder, map[string]any) {
	t.Helper()
	previewBody := glueCreatePreview(t, router, sessionCookie, maker)
	contentHash, _ := previewBody["contentHash"].(string)
	if contentHashOverride != "" {
		contentHash = contentHashOverride
	}
	submitRec := httptest.NewRecorder()
	submitBody := fmt.Sprintf(`{"previewId":%q,"contentHash":%q,"signature":"0x%s"}`,
		previewBody["previewId"], contentHash, strings.Repeat("ab", 64))
	submitReq := httptest.NewRequest(http.MethodPost, "/api/v1/markets/orders/submit", strings.NewReader(submitBody))
	submitReq.Header.Set("Content-Type", "application/json")
	if idempotencyKey != "" {
		submitReq.Header.Set("Idempotency-Key", idempotencyKey)
	}
	submitReq.AddCookie(sessionCookie)
	router.ServeHTTP(submitRec, submitReq)
	return submitRec, previewBody
}

func TestOrderSubmit_CapabilityDisabled503(t *testing.T) {
	t.Parallel()

	router, _, sessionCookie, _, maker := glueEligibleSubmitRouter(t, false, nil, nil)

	submitRec, _ := gluePreviewAndSubmit(t, router, sessionCookie, maker, "glue-submit-disabled", "")

	if submitRec.Code != http.StatusServiceUnavailable {
		t.Fatalf("status %d body %s", submitRec.Code, submitRec.Body.String())
	}
	var errBody map[string]any
	if err := json.Unmarshal(submitRec.Body.Bytes(), &errBody); err != nil {
		t.Fatal(err)
	}
	errObj, _ := errBody["error"].(map[string]any)
	if errObj["code"] != "capability_disabled" {
		t.Fatalf("error %+v", errObj)
	}
}

func TestOrderSubmit_IntegrityMismatch409(t *testing.T) {
	t.Parallel()

	router, _, sessionCookie, _, maker := glueEligibleSubmitRouter(t, true, glueStubVenue{}, glueStubCancelVenue{})

	submitRec, _ := gluePreviewAndSubmit(t, router, sessionCookie, maker, "glue-submit-409", "0x"+strings.Repeat("f", 64))

	if submitRec.Code != http.StatusConflict {
		t.Fatalf("status %d body %s", submitRec.Code, submitRec.Body.String())
	}
	var errBody map[string]any
	if err := json.Unmarshal(submitRec.Body.Bytes(), &errBody); err != nil {
		t.Fatal(err)
	}
	errObj, _ := errBody["error"].(map[string]any)
	if errObj["code"] != "integrity_mismatch" {
		t.Fatalf("error %+v", errObj)
	}
}

func TestOrderSubmit_HappyPath201(t *testing.T) {
	t.Parallel()

	router, _, sessionCookie, _, maker := glueEligibleSubmitRouter(t, true, glueStubVenue{}, glueStubCancelVenue{})

	submitRec, _ := gluePreviewAndSubmit(t, router, sessionCookie, maker, "glue-submit-201", "")

	if submitRec.Code != http.StatusCreated {
		t.Fatalf("status %d body %s", submitRec.Code, submitRec.Body.String())
	}
	var body map[string]any
	if err := json.Unmarshal(submitRec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body["venueOrderId"] != "venue-glue-1" || body["status"] != "open" {
		t.Fatalf("body %+v", body)
	}
}

func TestOrderSubmit_MissingIdempotencyKey400(t *testing.T) {
	t.Parallel()

	router, _, sessionCookie, _, maker := glueEligibleSubmitRouter(t, true, glueStubVenue{}, glueStubCancelVenue{})

	submitRec, _ := gluePreviewAndSubmit(t, router, sessionCookie, maker, "", "")

	if submitRec.Code != http.StatusBadRequest {
		t.Fatalf("status %d body %s", submitRec.Code, submitRec.Body.String())
	}
	var errBody map[string]any
	if err := json.Unmarshal(submitRec.Body.Bytes(), &errBody); err != nil {
		t.Fatal(err)
	}
	errObj, _ := errBody["error"].(map[string]any)
	if errObj["code"] != "missing_idempotency_key" {
		t.Fatalf("error %+v", errObj)
	}
}

func TestOrderSubmit_PreviewExpired410(t *testing.T) {
	t.Parallel()

	userID := "glue-submit-user-410"
	maker := "0x1111111111111111111111111111111111111111"

	users := &glueFixedUserStore{
		UserStore: auth.NewMemoryUserStore(),
	}
	eval := eligibility.DefaultEvaluator()
	eval.Geo = glueStubGeo{region: "US"}
	eval.Geoblock = glueStubGeoblock{allowed: true}
	mod, key, fixed := glueAuthModule(t, users, eval)
	signer := strings.ToLower(crypto.PubkeyToAddress(key.PublicKey).Hex())
	users.wallet = signer
	users.user = auth.User{
		UserID: userID, Wallet: signer, Standing: eligibility.AccountStandingActive,
	}
	disc := wallet.NewDiscoverer(wallet.MemoryStore{Rows: map[string][]wallet.LinkedAccount{
		userID + "|" + signer: {{AccountWallet: maker, LinkStatus: wallet.LinkStatusLinked, ChainID: 137}},
	}}, nil)
	disc.Now = func() time.Time { return fixed }

	store := orders.NewPreviewStore()
	buildRouter := func(nowFn func() time.Time) chi.Router {
		r := chi.NewRouter()
		h := markets.NewHandler(markets.NewService(markets.ServiceConfig{}))
		svc := orders.NewService(orders.ServiceConfig{
			Store:      store,
			Discoverer: disc,
			Markets:    glueStubMarkets{},
			Books:      glueStubBooks{},
			Now:        nowFn,
			SaltFn:     func() (string, error) { return "42", nil },
			Submit:     orders.SubmitConfig{OrderSubmitEnabled: true, Venue: glueStubVenue{}},
		})
		markets.RegisterRoutesWithDepsAndMarketRoutes(r, h, mod, markets.RouteDeps{}, nil, []markets.EligibleMarketRouteRegistrar{
			func(r chi.Router) {
				orders.RegisterRoutes(r, orders.HandlerConfig{Service: svc, Sessions: wallet.ContextSessionResolver{}})
			},
		})
		return r
	}

	sessionCookie := glueSessionCookie(t, mod, key, fixed)
	previewRouter := buildRouter(func() time.Time { return fixed })
	previewBody := glueCreatePreview(t, previewRouter, sessionCookie, maker)

	lateRouter := buildRouter(func() time.Time { return fixed.Add(6 * time.Minute) })
	expiredRec := httptest.NewRecorder()
	expiredBody := fmt.Sprintf(`{"previewId":%q,"contentHash":%q,"signature":"0x%s"}`,
		previewBody["previewId"], previewBody["contentHash"], strings.Repeat("ab", 64))
	expiredReq := httptest.NewRequest(http.MethodPost, "/api/v1/markets/orders/submit", strings.NewReader(expiredBody))
	expiredReq.Header.Set("Content-Type", "application/json")
	expiredReq.Header.Set("Idempotency-Key", "glue-submit-410-late")
	expiredReq.AddCookie(sessionCookie)
	lateRouter.ServeHTTP(expiredRec, expiredReq)

	if expiredRec.Code != http.StatusGone {
		t.Fatalf("status %d body %s", expiredRec.Code, expiredRec.Body.String())
	}
}

func TestOrderSubmit_IdempotencyConflict422(t *testing.T) {
	t.Parallel()

	router, _, sessionCookie, _, maker := glueEligibleSubmitRouter(t, true, glueStubVenue{}, glueStubCancelVenue{})

	submitRec1, previewBody := gluePreviewAndSubmit(t, router, sessionCookie, maker, "glue-submit-422", "")
	if submitRec1.Code != http.StatusCreated {
		t.Fatalf("first submit status %d body %s", submitRec1.Code, submitRec1.Body.String())
	}

	submitRec2 := httptest.NewRecorder()
	submitBody2 := fmt.Sprintf(`{"previewId":%q,"contentHash":%q,"signature":"0x02"}`,
		previewBody["previewId"], previewBody["contentHash"])
	submitReq2 := httptest.NewRequest(http.MethodPost, "/api/v1/markets/orders/submit", strings.NewReader(submitBody2))
	submitReq2.Header.Set("Content-Type", "application/json")
	submitReq2.Header.Set("Idempotency-Key", "glue-submit-422")
	submitReq2.AddCookie(sessionCookie)
	router.ServeHTTP(submitRec2, submitReq2)

	if submitRec2.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status %d body %s", submitRec2.Code, submitRec2.Body.String())
	}
	var errBody map[string]any
	if err := json.Unmarshal(submitRec2.Body.Bytes(), &errBody); err != nil {
		t.Fatal(err)
	}
	errObj, _ := errBody["error"].(map[string]any)
	if errObj["code"] != "idempotency_conflict" {
		t.Fatalf("error %+v", errObj)
	}
}

func TestListMyOrders_AfterSubmit(t *testing.T) {
	t.Parallel()

	router, _, sessionCookie, _, maker := glueEligibleSubmitRouter(t, true, glueStubVenue{}, glueStubCancelVenue{})

	submitRec, _ := gluePreviewAndSubmit(t, router, sessionCookie, maker, "glue-list-orders", "")
	if submitRec.Code != http.StatusCreated {
		t.Fatalf("submit status %d body %s", submitRec.Code, submitRec.Body.String())
	}

	listRec := httptest.NewRecorder()
	listReq := httptest.NewRequest(http.MethodGet, "/api/v1/markets/me/orders?status=open", nil)
	listReq.AddCookie(sessionCookie)
	router.ServeHTTP(listRec, listReq)

	if listRec.Code != http.StatusOK {
		t.Fatalf("status %d body %s", listRec.Code, listRec.Body.String())
	}
	var body map[string]any
	if err := json.Unmarshal(listRec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	ordersList, _ := body["orders"].([]any)
	if len(ordersList) != 1 {
		t.Fatalf("orders %+v", body["orders"])
	}
}

func glueSubmitOrderID(t *testing.T, router chi.Router, sessionCookie *http.Cookie, maker string, submitKey string) string {
	t.Helper()
	submitRec, _ := gluePreviewAndSubmit(t, router, sessionCookie, maker, submitKey, "")
	if submitRec.Code != http.StatusCreated {
		t.Fatalf("submit status %d body %s", submitRec.Code, submitRec.Body.String())
	}
	var submitBody map[string]any
	if err := json.Unmarshal(submitRec.Body.Bytes(), &submitBody); err != nil {
		t.Fatal(err)
	}
	orderID, _ := submitBody["orderId"].(string)
	if orderID == "" {
		t.Fatalf("missing orderId in %+v", submitBody)
	}
	return orderID
}

func glueCancelPreview(t *testing.T, router chi.Router, sessionCookie *http.Cookie, orderID string) map[string]any {
	t.Helper()
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/markets/orders/"+orderID+"/cancel-preview", nil)
	req.AddCookie(sessionCookie)
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("cancel-preview status %d body %s", rec.Code, rec.Body.String())
	}
	var body map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	return body
}

func glueCancelSubmit(t *testing.T, router chi.Router, sessionCookie *http.Cookie, orderID string, previewBody map[string]any, idempotencyKey string, signatureOverride string) *httptest.ResponseRecorder {
	t.Helper()
	previewID, _ := previewBody["previewId"].(string)
	contentHash, _ := previewBody["contentHash"].(string)
	sig := "0x" + strings.Repeat("ab", 64)
	if signatureOverride != "" {
		sig = signatureOverride
	}
	rec := httptest.NewRecorder()
	body := fmt.Sprintf(`{"previewId":%q,"contentHash":%q,"signature":%q}`, previewID, contentHash, sig)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/markets/orders/"+orderID+"/cancel", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if idempotencyKey != "" {
		req.Header.Set("Idempotency-Key", idempotencyKey)
	}
	req.AddCookie(sessionCookie)
	router.ServeHTTP(rec, req)
	return rec
}

func TestOrderCancel_HappyPath200(t *testing.T) {
	t.Parallel()

	router, _, sessionCookie, _, maker := glueEligibleSubmitRouter(t, true, glueStubVenue{}, glueStubCancelVenue{})
	orderID := glueSubmitOrderID(t, router, sessionCookie, maker, "glue-cancel-happy")
	previewBody := glueCancelPreview(t, router, sessionCookie, orderID)

	cancelRec := glueCancelSubmit(t, router, sessionCookie, orderID, previewBody, "glue-cancel-happy-key", "")
	if cancelRec.Code != http.StatusOK {
		t.Fatalf("status %d body %s", cancelRec.Code, cancelRec.Body.String())
	}
	var body map[string]any
	if err := json.Unmarshal(cancelRec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body["status"] != "canceled" {
		t.Fatalf("body %+v", body)
	}
}

func TestOrderCancel_IntegrityMismatch409(t *testing.T) {
	t.Parallel()

	router, _, sessionCookie, _, maker := glueEligibleSubmitRouter(t, true, glueStubVenue{}, glueStubCancelVenue{})
	orderID := glueSubmitOrderID(t, router, sessionCookie, maker, "glue-cancel-409")
	previewBody := glueCancelPreview(t, router, sessionCookie, orderID)
	previewBody["contentHash"] = "0x" + strings.Repeat("f", 64)

	cancelRec := glueCancelSubmit(t, router, sessionCookie, orderID, previewBody, "glue-cancel-409-key", "")
	if cancelRec.Code != http.StatusConflict {
		t.Fatalf("status %d body %s", cancelRec.Code, cancelRec.Body.String())
	}
	var errBody map[string]any
	if err := json.Unmarshal(cancelRec.Body.Bytes(), &errBody); err != nil {
		t.Fatal(err)
	}
	errObj, _ := errBody["error"].(map[string]any)
	if errObj["code"] != "integrity_mismatch" {
		t.Fatalf("error %+v", errObj)
	}
}

func TestOrderCancel_IdempotencyConflict422(t *testing.T) {
	t.Parallel()

	router, _, sessionCookie, _, maker := glueEligibleSubmitRouter(t, true, glueStubVenue{}, glueStubCancelVenue{})
	orderID := glueSubmitOrderID(t, router, sessionCookie, maker, "glue-cancel-422")
	previewBody := glueCancelPreview(t, router, sessionCookie, orderID)

	cancelRec1 := glueCancelSubmit(t, router, sessionCookie, orderID, previewBody, "glue-cancel-422-key", "")
	if cancelRec1.Code != http.StatusOK {
		t.Fatalf("first cancel status %d body %s", cancelRec1.Code, cancelRec1.Body.String())
	}

	cancelRec2 := glueCancelSubmit(t, router, sessionCookie, orderID, previewBody, "glue-cancel-422-key", "0x02")
	if cancelRec2.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status %d body %s", cancelRec2.Code, cancelRec2.Body.String())
	}
	var errBody map[string]any
	if err := json.Unmarshal(cancelRec2.Body.Bytes(), &errBody); err != nil {
		t.Fatal(err)
	}
	errObj, _ := errBody["error"].(map[string]any)
	if errObj["code"] != "idempotency_conflict" {
		t.Fatalf("error %+v", errObj)
	}
}

func TestListMyFills_Empty(t *testing.T) {
	t.Parallel()

	router, _, sessionCookie, _, maker := glueEligibleSubmitRouter(t, true, glueStubVenue{}, glueStubCancelVenue{})
	glueSubmitOrderID(t, router, sessionCookie, maker, "glue-fills-empty")

	listRec := httptest.NewRecorder()
	listReq := httptest.NewRequest(http.MethodGet, "/api/v1/markets/me/fills", nil)
	listReq.AddCookie(sessionCookie)
	router.ServeHTTP(listRec, listReq)

	if listRec.Code != http.StatusOK {
		t.Fatalf("status %d body %s", listRec.Code, listRec.Body.String())
	}
	var body map[string]any
	if err := json.Unmarshal(listRec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	fills, _ := body["fills"].([]any)
	if len(fills) != 0 {
		t.Fatalf("fills %+v", body["fills"])
	}
}
