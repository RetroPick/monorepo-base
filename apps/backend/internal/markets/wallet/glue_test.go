package wallet_test

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

func glueAuthModule(t *testing.T, users auth.UserStore) (*auth.Module, *ecdsa.PrivateKey, time.Time) {
	t.Helper()
	fixed := time.Now().UTC().Truncate(time.Second)
	key, err := crypto.GenerateKey()
	if err != nil {
		t.Fatal(err)
	}
	eval := eligibility.DefaultEvaluator()
	eval.Now = func() time.Time { return fixed }
	eval.Geo = glueStubGeo{region: "US"}
	eval.Geoblock = glueStubGeoblock{allowed: true}

	mod := auth.NewModule(auth.ModuleConfig{
		Config: auth.Config{
			SessionSecret:  "test-markets-glue-secret",
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

func glueMarketsRouter(t *testing.T, authMod *auth.Module) chi.Router {
	t.Helper()
	r := chi.NewRouter()
	markets.RegisterRoutes(r, markets.NewHandler(markets.NewService(markets.ServiceConfig{})), authMod)
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
	cookie := glueFindCookie(rec.Result().Cookies(), "mkt_session")
	if cookie == nil {
		t.Fatal("missing session cookie")
	}
	return cookie
}

func glueFindCookie(cookies []*http.Cookie, name string) *http.Cookie {
	for _, c := range cookies {
		if c.Name == name {
			return c
		}
	}
	return nil
}

func TestMeWallets_Unauthenticated(t *testing.T) {
	t.Parallel()

	mod, _, _ := glueAuthModule(t, auth.NewMemoryUserStore())
	router := glueMarketsRouter(t, mod)

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets/me/wallets", nil)
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

func TestMeWallets_AuthenticatedEmptyWallets(t *testing.T) {
	t.Parallel()

	mod, key, fixed := glueAuthModule(t, auth.NewMemoryUserStore())
	router := glueMarketsRouter(t, mod)
	sessionCookie := glueSessionCookie(t, mod, key, fixed)
	signer := strings.ToLower(crypto.PubkeyToAddress(key.PublicKey).Hex())

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets/me/wallets", nil)
	req.AddCookie(sessionCookie)
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}
	var body wallet.WalletsListResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.SignerAddress != signer {
		t.Fatalf("signer %q want %q", body.SignerAddress, signer)
	}
	if len(body.Wallets) != 0 {
		t.Fatalf("expected empty wallets, got %+v", body.Wallets)
	}
}

func TestMeWallets_AuthenticatedWithMemoryStore(t *testing.T) {
	t.Parallel()

	fixed := time.Now().UTC().Truncate(time.Second)
	key, err := crypto.GenerateKey()
	if err != nil {
		t.Fatal(err)
	}
	signer := strings.ToLower(crypto.PubkeyToAddress(key.PublicKey).Hex())
	userID := "glue-user-1"
	accountWallet := "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"

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
	eval.Now = func() time.Time { return fixed }
	eval.Geo = glueStubGeo{region: "US"}
	eval.Geoblock = glueStubGeoblock{allowed: true}

	mod := auth.NewModule(auth.ModuleConfig{
		Config: auth.Config{
			SessionSecret:  "test-markets-glue-secret",
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

	r := chi.NewRouter()
	mod.RegisterRoutes(r)
	r.Route("/api/v1/markets", func(r chi.Router) {
		r.Use(mod.OptionalSession)
		r.Route("/me", func(r chi.Router) {
			r.Use(mod.RequireAuthenticated)
			wallet.RegisterRoutes(r, wallet.HandlerConfig{
				Sessions: wallet.ContextSessionResolver{},
				Discoverer: &wallet.Discoverer{
					Store: wallet.MemoryStore{Rows: map[string][]wallet.LinkedAccount{
						userID + "|" + signer: {{
							AccountWallet: accountWallet,
							WalletType:    wallet.WalletTypeDepositWallet,
							LinkStatus:    wallet.LinkStatusLinked,
							IsPrimary:     true,
							ChainID:       wallet.PolygonChainID,
						}},
					}},
					Now: func() time.Time { return fixed },
				},
			})
		})
	})

	sessionCookie := glueSessionCookie(t, mod, key, fixed)

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets/me/wallets", nil)
	req.AddCookie(sessionCookie)
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}
	var body wallet.WalletsListResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.SignerAddress != signer {
		t.Fatalf("signer %q", body.SignerAddress)
	}
	if len(body.Wallets) != 1 || body.Wallets[0].AccountWallet != accountWallet {
		t.Fatalf("wallets %+v", body.Wallets)
	}
}

type glueFixedUserStore struct {
	auth.UserStore
	wallet string
	user   auth.User
}

func (s *glueFixedUserStore) GetOrCreate(_ context.Context, wallet string) (auth.User, error) {
	if strings.EqualFold(wallet, s.wallet) {
		return s.user, nil
	}
	return s.UserStore.GetOrCreate(context.Background(), wallet)
}
