package balances_test

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
	"retropick/apps/backend/internal/markets/balances"
	"retropick/apps/backend/internal/markets/eligibility"
	"retropick/apps/backend/internal/markets/eligibility/geo"
	"retropick/apps/backend/internal/markets/eligibility/geoblock"
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
			SessionSecret:  "test-markets-balances-glue-secret",
			AccessTTL:      15 * time.Minute,
			NonceTTL:       10 * time.Minute,
			ChainID:        137,
			CookieName:     "mkt_session",
			CSRFCookieName: "mkt_csrf",
			AuthRateLimit:  100,
			AuthRateWindow: time.Minute,
		},
		Users:     users,
		Evaluator: eval,
		Now:       func() time.Time { return fixed },
	})
	return mod, key, fixed
}

func glueMarketsRouterWithBalances(t *testing.T, authMod *auth.Module, disc *wallet.Discoverer) chi.Router {
	t.Helper()
	r := chi.NewRouter()
	h := markets.NewHandler(markets.NewService(markets.ServiceConfig{}))
	if disc == nil {
		disc = wallet.DefaultDiscoverer()
	}
	markets.RegisterRoutesWithDeps(r, h, authMod, markets.RouteDeps{}, func(r chi.Router) {
		balances.RegisterRoutes(r, balances.NewProductionHandlerConfig(balances.ProductionConfig{
			Discoverer: disc,
			L2Store:    balances.UnwiredL2CredentialStore{},
		}))
	})
	return r
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

func TestMeBalances_Unauthenticated(t *testing.T) {
	t.Parallel()

	mod, _, _ := glueAuthModule(t, auth.NewMemoryUserStore(), eligibility.DefaultEvaluator())
	router := glueMarketsRouterWithBalances(t, mod, nil)

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets/me/balances", nil)
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}
	var body map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	errObj, _ := body["error"].(map[string]any)
	if errObj["code"] != "UNAUTHENTICATED" {
		t.Fatalf("error %+v", errObj)
	}
}

func TestMeBalances_AuthenticatedIneligible(t *testing.T) {
	t.Parallel()

	mod, key, fixed := glueAuthModule(t, auth.NewMemoryUserStore(), eligibility.DefaultEvaluator())
	router := glueMarketsRouterWithBalances(t, mod, nil)
	sessionCookie := glueSessionCookie(t, mod, key, fixed)

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets/me/balances", nil)
	req.AddCookie(sessionCookie)
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("BLK-001 default evaluator should deny balances, got %d body %s", rec.Code, rec.Body.String())
	}
	var body map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	errObj, _ := body["error"].(map[string]any)
	if errObj["code"] != "ELIGIBILITY_DENIED" {
		t.Fatalf("error %+v", errObj)
	}
	details, _ := errObj["details"].(map[string]any)
	if details["reason"] == nil || details["reason"] == "" {
		t.Fatalf("expected details.reason, got %+v", details)
	}
}

func TestMeBalances_AuthenticatedEligibleNoWallet(t *testing.T) {
	t.Parallel()

	fixed := time.Now().UTC().Truncate(time.Second)
	eval := eligibility.DefaultEvaluator()
	eval.Geo = glueStubGeo{region: "US"}
	eval.Geoblock = glueStubGeoblock{allowed: true}

	mod, key, fixed := glueAuthModule(t, auth.NewMemoryUserStore(), eval)
	disc := wallet.NewDiscoverer(wallet.UnwiredStore{}, nil)
	disc.Now = func() time.Time { return fixed }
	router := glueMarketsRouterWithBalances(t, mod, disc)
	sessionCookie := glueSessionCookie(t, mod, key, fixed)

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets/me/balances", nil)
	req.AddCookie(sessionCookie)
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404 account_not_linked, got %d body %s", rec.Code, rec.Body.String())
	}
	var body map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	errObj, _ := body["error"].(map[string]any)
	if errObj["code"] != "account_not_linked" {
		t.Fatalf("error %+v", errObj)
	}
}
