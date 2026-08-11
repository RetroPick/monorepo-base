package auth_test

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

	"retropick/apps/backend/internal/markets/auth"
	"retropick/apps/backend/internal/markets/eligibility"
	"retropick/apps/backend/internal/markets/eligibility/geo"
	"retropick/apps/backend/internal/markets/eligibility/geoblock"
)

type stubGeo struct {
	region string
}

func (s stubGeo) Resolve(_ context.Context, _ string) (geo.Location, error) {
	return geo.Location{RegionCode: s.region}, nil
}

type stubGeoblock struct {
	allowed bool
}

func (s stubGeoblock) Check(_ context.Context, _, _ string) (geoblock.Result, error) {
	return geoblock.Result{Allowed: s.allowed}, nil
}

func testModule(t *testing.T, users auth.UserStore) (*auth.Module, *ecdsa.PrivateKey, time.Time) {
	t.Helper()
	fixed := time.Now().UTC().Truncate(time.Second)
	key, err := crypto.GenerateKey()
	if err != nil {
		t.Fatal(err)
	}
	eval := eligibility.DefaultEvaluator()
	eval.Now = func() time.Time { return fixed }
	eval.Geo = stubGeo{region: "US"}
	eval.Geoblock = stubGeoblock{allowed: true}

	cfg := auth.Config{
		SessionSecret:  "test-markets-auth-secret",
		AccessTTL:      15 * time.Minute,
		NonceTTL:       10 * time.Minute,
		ChainID:        137,
		CookieName:     "mkt_session",
		CSRFCookieName: "mkt_csrf",
		AllowedDomains: []string{"localhost"},
		AuthRateLimit:  100,
		AuthRateWindow: time.Minute,
	}
	mod := auth.NewModule(auth.ModuleConfig{
		Config:    cfg,
		Users:     users,
		Evaluator: eval,
		Now:       func() time.Time { return fixed },
	})
	return mod, key, fixed
}

func TestSIWEFailsClosedWithoutAllowedDomains(t *testing.T) {
	t.Parallel()
	mod, key, fixed := testModule(t, auth.NewMemoryUserStore())
	message, signature := buildSignedSIWE(t, mod, key, fixed, "localhost")

	_, err := auth.VerifySIWE(auth.Config{ChainID: 137}, message, signature, "")
	if err == nil || !strings.Contains(err.Error(), "domain not allowed") {
		t.Fatalf("expected unconfigured allowlist rejection, got %v", err)
	}
}

func TestLoadConfigRejectsEmptyAllowedDomains(t *testing.T) {
	t.Setenv("MARKETS_AUTH_SESSION_SECRET", "test-secret")
	t.Setenv("AUTH_SESSION_SECRET", "")
	t.Setenv("MARKETS_AUTH_ALLOWED_DOMAINS", "")
	if _, err := auth.LoadConfig(); err == nil {
		t.Fatal("expected missing allowlist to fail configuration")
	}
}

func buildSignedSIWE(t *testing.T, mod *auth.Module, key *ecdsa.PrivateKey, fixed time.Time, domain string) (string, string) {
	t.Helper()
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets/auth/nonce", nil)
	router := chi.NewRouter()
	mod.RegisterRoutes(router)
	router.ServeHTTP(rec, req)
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

func TestNonceAndSIWESessionRoundTrip(t *testing.T) {
	t.Parallel()
	mod, key, fixed := testModule(t, auth.NewMemoryUserStore())
	router := chi.NewRouter()
	mod.RegisterRoutes(router)

	message, signature := buildSignedSIWE(t, mod, key, fixed, "localhost")

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/markets/auth/siwe", strings.NewReader(fmt.Sprintf(`{"message":%q,"signature":%q}`, message, signature)))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("siwe status %d body %s", rec.Code, rec.Body.String())
	}

	cookies := rec.Result().Cookies()
	var sessionCookie *http.Cookie
	for _, c := range cookies {
		if c.Name == "mkt_session" {
			sessionCookie = c
			break
		}
	}
	if sessionCookie == nil || sessionCookie.Value == "" {
		t.Fatalf("missing session cookie: %+v", cookies)
	}

	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/v1/markets/auth/session", nil)
	req.AddCookie(sessionCookie)
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("session status %d body %s", rec.Code, rec.Body.String())
	}
}

func TestSIWERejectsReplayedNonce(t *testing.T) {
	t.Parallel()
	mod, key, fixed := testModule(t, auth.NewMemoryUserStore())
	router := chi.NewRouter()
	mod.RegisterRoutes(router)
	message, signature := buildSignedSIWE(t, mod, key, fixed, "localhost")

	post := func() int {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/api/v1/markets/auth/siwe", strings.NewReader(fmt.Sprintf(`{"message":%q,"signature":%q}`, message, signature)))
		req.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(rec, req)
		return rec.Code
	}
	if post() != http.StatusOK {
		t.Fatal("first siwe should succeed")
	}
	if post() == http.StatusOK {
		t.Fatal("replayed nonce should fail")
	}
}

func TestRequireEligibleUsesSharedEvaluator(t *testing.T) {
	t.Parallel()
	mod, key, fixed := testModule(t, auth.NewMemoryUserStore())
	router := chi.NewRouter()
	router.Use(mod.OptionalSession)
	router.With(mod.RequireAuthenticated, mod.RequireEligible).Get("/protected", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	message, signature := buildSignedSIWE(t, mod, key, fixed, "localhost")
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/markets/auth/siwe", strings.NewReader(fmt.Sprintf(`{"message":%q,"signature":%q}`, message, signature)))
	req.Header.Set("Content-Type", "application/json")
	authRouter := chi.NewRouter()
	mod.RegisterRoutes(authRouter)
	authRouter.ServeHTTP(rec, req)
	sessionCookie := findCookie(rec.Result().Cookies(), "mkt_session")
	if sessionCookie == nil {
		t.Fatal("missing session cookie")
	}

	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.AddCookie(sessionCookie)
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("eligible session should pass gate, got %d body %s", rec.Code, rec.Body.String())
	}
}

func TestRequireEligibleFailsClosedWithDefaultEvaluator(t *testing.T) {
	t.Parallel()
	fixed := time.Now().UTC().Truncate(time.Second)
	mod := auth.NewModule(auth.ModuleConfig{
		Config: auth.Config{
			SessionSecret:  "test-markets-auth-secret",
			AccessTTL:      15 * time.Minute,
			NonceTTL:       10 * time.Minute,
			ChainID:        137,
			CookieName:     "mkt_session",
			CSRFCookieName: "mkt_csrf",
			AllowedDomains: []string{"localhost"},
			AuthRateLimit:  100,
		},
		Evaluator: eligibility.DefaultEvaluator(),
		Now:       func() time.Time { return fixed },
	})
	router := chi.NewRouter()
	router.Use(mod.OptionalSession)
	router.With(mod.RequireAuthenticated, mod.RequireEligible).Get("/protected", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	key, err := crypto.GenerateKey()
	if err != nil {
		t.Fatal(err)
	}
	message, signature := buildSignedSIWE(t, mod, key, fixed, "localhost")
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/markets/auth/siwe", strings.NewReader(fmt.Sprintf(`{"message":%q,"signature":%q}`, message, signature)))
	req.Header.Set("Content-Type", "application/json")
	authRouter := chi.NewRouter()
	mod.RegisterRoutes(authRouter)
	authRouter.ServeHTTP(rec, req)
	sessionCookie := findCookie(rec.Result().Cookies(), "mkt_session")

	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.AddCookie(sessionCookie)
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("BLK-001 default evaluator should deny, got %d body %s", rec.Code, rec.Body.String())
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

type suspendedUserStore struct {
	auth.UserStore
	wallet string
	user   auth.User
}

func (s *suspendedUserStore) GetOrCreate(_ context.Context, wallet string) (auth.User, error) {
	if strings.EqualFold(wallet, s.wallet) {
		return s.user, nil
	}
	return s.UserStore.GetOrCreate(context.Background(), wallet)
}

func TestSuspendedAccountEligibilityInjection(t *testing.T) {
	t.Parallel()
	fixed := time.Now().UTC().Truncate(time.Second)
	eval := eligibility.DefaultEvaluator()
	eval.Now = func() time.Time { return fixed }
	eval.Geo = stubGeo{region: "US"}
	eval.Geoblock = stubGeoblock{allowed: true}

	key, err := crypto.GenerateKey()
	if err != nil {
		t.Fatal(err)
	}
	wallet := strings.ToLower(crypto.PubkeyToAddress(key.PublicKey).Hex())
	baseStore := auth.NewMemoryUserStore()
	store := &suspendedUserStore{
		UserStore: baseStore,
		wallet:    wallet,
		user: auth.User{
			UserID:               "user-suspended",
			Wallet:               wallet,
			Standing:             eligibility.AccountStandingSuspended,
			TermsVersionAccepted: "",
		},
	}
	mod := auth.NewModule(auth.ModuleConfig{
		Config: auth.Config{
			SessionSecret:  "test-markets-auth-secret",
			AccessTTL:      15 * time.Minute,
			NonceTTL:       10 * time.Minute,
			ChainID:        137,
			CookieName:     "mkt_session",
			AllowedDomains: []string{"localhost"},
			AuthRateLimit:  100,
		},
		Users:     store,
		Evaluator: eval,
		Now:       func() time.Time { return fixed },
	})

	message, signature := buildSignedSIWE(t, mod, key, fixed, "localhost")
	authRouter := chi.NewRouter()
	mod.RegisterRoutes(authRouter)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/markets/auth/siwe", strings.NewReader(fmt.Sprintf(`{"message":%q,"signature":%q}`, message, signature)))
	req.Header.Set("Content-Type", "application/json")
	authRouter.ServeHTTP(rec, req)
	sessionCookie := findCookie(rec.Result().Cookies(), "mkt_session")

	router := chi.NewRouter()
	router.Use(mod.OptionalSession)
	router.With(mod.RequireAuthenticated, mod.RequireEligible).Get("/protected", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.AddCookie(sessionCookie)
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("suspended account should be denied, got %d", rec.Code)
	}
}

func findCookie(cookies []*http.Cookie, name string) *http.Cookie {
	for _, c := range cookies {
		if c.Name == name {
			return c
		}
	}
	return nil
}
