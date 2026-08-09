package balances_test

import (
	"encoding/json"
	"math"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"

	"retropick/apps/backend/internal/markets/balances"
	"retropick/apps/backend/internal/markets/wallet"
)

const (
	testSigner  = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
	testAccount = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
	testUserID  = "user-1"
)

type stubSessionResolver struct {
	session balances.SessionContext
	err     error
}

func (s stubSessionResolver) ResolveSession(*http.Request) (balances.SessionContext, error) {
	if s.err != nil {
		return balances.SessionContext{}, s.err
	}
	return s.session, nil
}

func linkedDiscoverer(fixed time.Time, account string, isPrimary bool) *wallet.Discoverer {
	return &wallet.Discoverer{
		Store: wallet.MemoryStore{Rows: map[string][]wallet.LinkedAccount{
			testUserID + "|" + testSigner: {{
				AccountWallet: account,
				WalletType:    wallet.WalletTypeDepositWallet,
				LinkStatus:    wallet.LinkStatusLinked,
				IsPrimary:     isPrimary,
				ChainID:       wallet.PolygonChainID,
			}},
		}},
		Now: func() time.Time { return fixed },
	}
}

func balanceRouter(cfg balances.HandlerConfig) chi.Router {
	r := chi.NewRouter()
	r.Route("/api/v1/markets/me", func(r chi.Router) {
		balances.RegisterRoutes(r, cfg)
	})
	return r
}

func TestListMyBalances_Unauthorized(t *testing.T) {
	t.Parallel()

	r := balanceRouter(balances.HandlerConfig{})
	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets/me/balances", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}
	var body balances.ErrorResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Error.Code != "unauthorized" {
		t.Fatalf("error %+v", body.Error)
	}
}

func TestListMyBalances_AccountNotLinked(t *testing.T) {
	t.Parallel()

	fixed := time.Date(2026, 8, 9, 10, 0, 0, 0, time.UTC)
	r := balanceRouter(balances.HandlerConfig{
		Sessions: stubSessionResolver{session: balances.SessionContext{
			UserID:        testUserID,
			SignerAddress: testSigner,
		}},
		Reader: balances.NewReader(balances.ReaderConfig{
			Discoverer: wallet.DefaultDiscoverer(),
			Now:        func() time.Time { return fixed },
		}),
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets/me/balances", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}
	var body balances.ErrorResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Error.Code != "account_not_linked" {
		t.Fatalf("error %+v", body.Error)
	}
}

func TestListMyBalances_UpstreamUnwired(t *testing.T) {
	t.Parallel()

	fixed := time.Date(2026, 8, 9, 10, 0, 0, 0, time.UTC)
	r := balanceRouter(balances.HandlerConfig{
		Sessions: stubSessionResolver{session: balances.SessionContext{
			UserID:        testUserID,
			SignerAddress: testSigner,
		}},
		Reader: balances.NewReader(balances.ReaderConfig{
			Discoverer: linkedDiscoverer(fixed, testAccount, true),
			Venue:      balances.UnwiredVenueSource{},
			Now:        func() time.Time { return fixed },
		}),
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets/me/balances", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadGateway {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}
}

func TestListMyBalances_PrimaryWalletSelection(t *testing.T) {
	t.Parallel()

	fixed := time.Date(2026, 8, 9, 10, 0, 0, 0, time.UTC)
	secondary := "0xcccccccccccccccccccccccccccccccccccccccc"
	disc := &wallet.Discoverer{
		Store: wallet.MemoryStore{Rows: map[string][]wallet.LinkedAccount{
			testUserID + "|" + testSigner: {
				{
					AccountWallet: secondary,
					WalletType:    wallet.WalletTypeGnosisSafe,
					LinkStatus:    wallet.LinkStatusLinked,
					IsPrimary:     false,
					ChainID:       wallet.PolygonChainID,
				},
				{
					AccountWallet: testAccount,
					WalletType:    wallet.WalletTypeDepositWallet,
					LinkStatus:    wallet.LinkStatusLinked,
					IsPrimary:     true,
					ChainID:       wallet.PolygonChainID,
				},
			},
		}},
		Now: func() time.Time { return fixed },
	}

	r := balanceRouter(balances.HandlerConfig{
		Sessions: stubSessionResolver{session: balances.SessionContext{
			UserID:        testUserID,
			SignerAddress: testSigner,
		}},
		Reader: balances.NewReader(balances.ReaderConfig{
			Discoverer: disc,
			Venue: balances.StubVenueSource{
				Wei:        "10500000",
				ObservedAt: fixed,
			},
			Now: func() time.Time { return fixed },
		}),
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets/me/balances", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}
	var body balances.BalancesListResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.AccountWallet != testAccount {
		t.Fatalf("accountWallet = %q want %q", body.AccountWallet, testAccount)
	}
}

func TestListMyBalances_MoneyAmountFixedPoint(t *testing.T) {
	t.Parallel()

	fixed := time.Date(2026, 8, 9, 10, 0, 0, 0, time.UTC)
	r := balanceRouter(balances.HandlerConfig{
		Sessions: stubSessionResolver{session: balances.SessionContext{
			UserID:        testUserID,
			SignerAddress: testSigner,
		}},
		Reader: balances.NewReader(balances.ReaderConfig{
			Discoverer: linkedDiscoverer(fixed, testAccount, true),
			Venue: balances.StubVenueSource{
				Wei:        "10500000",
				ObservedAt: fixed,
			},
			Now: func() time.Time { return fixed },
		}),
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets/me/balances", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}

	raw := rec.Body.Bytes()
	if err := assertNoBinaryFloats(t, raw); err != nil {
		t.Fatal(err)
	}

	var body map[string]any
	if err := json.Unmarshal(raw, &body); err != nil {
		t.Fatal(err)
	}
	collateral, ok := body["collateral"].(map[string]any)
	if !ok {
		t.Fatal("missing collateral object")
	}
	amount, ok := collateral["amount"].(string)
	if !ok {
		t.Fatalf("amount type %T", collateral["amount"])
	}
	if amount != "10500000" {
		t.Fatalf("amount = %q", amount)
	}
	if collateral["currency"] != "pUSD" {
		t.Fatalf("currency = %v", collateral["currency"])
	}
	decimals, ok := collateral["decimals"].(float64)
	if !ok {
		t.Fatalf("decimals type %T", collateral["decimals"])
	}
	if int(decimals) != 6 {
		t.Fatalf("decimals = %v", decimals)
	}
}

func TestListMyBalances_JSONContract(t *testing.T) {
	t.Parallel()

	fixed := time.Date(2026, 8, 9, 10, 0, 0, 0, time.UTC)
	r := balanceRouter(balances.HandlerConfig{
		Sessions: stubSessionResolver{session: balances.SessionContext{
			UserID:        testUserID,
			SignerAddress: testSigner,
		}},
		Reader: balances.NewReader(balances.ReaderConfig{
			Discoverer: linkedDiscoverer(fixed, testAccount, true),
			Venue: balances.StubVenueSource{
				Wei:        "10500000",
				ObservedAt: fixed,
			},
			Now: func() time.Time { return fixed },
		}),
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets/me/balances", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}

	var body balances.BalancesListResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.SchemaVersion != "1" {
		t.Fatalf("schemaVersion = %q", body.SchemaVersion)
	}
	if body.SignerAddress != testSigner {
		t.Fatalf("signer %q", body.SignerAddress)
	}
	if body.AccountWallet != testAccount {
		t.Fatalf("account %q", body.AccountWallet)
	}
	if body.Collateral.Amount != "10500000" || body.Collateral.Currency != "pUSD" || body.Collateral.Decimals != 6 {
		t.Fatalf("collateral %+v", body.Collateral)
	}
	if body.Provenance.Source != "polymarket_clob" {
		t.Fatalf("provenance source %q", body.Provenance.Source)
	}
	if !body.CheckedAt.Equal(fixed) {
		t.Fatalf("checkedAt = %v", body.CheckedAt)
	}
}

func TestPrimaryAccountWallet(t *testing.T) {
	t.Parallel()

	primary := "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
	secondary := "0xcccccccccccccccccccccccccccccccccccccccc"

	addr, ok := balances.PrimaryAccountWallet([]wallet.LinkedWallet{
		{AccountWallet: secondary, LinkStatus: wallet.LinkStatusLinked, IsPrimary: false},
		{AccountWallet: primary, LinkStatus: wallet.LinkStatusLinked, IsPrimary: true},
	})
	if !ok || addr != primary {
		t.Fatalf("got %q ok=%v", addr, ok)
	}

	addr, ok = balances.PrimaryAccountWallet([]wallet.LinkedWallet{
		{AccountWallet: secondary, LinkStatus: wallet.LinkStatusLinked, IsPrimary: false},
	})
	if !ok || addr != secondary {
		t.Fatalf("fallback got %q ok=%v", addr, ok)
	}

	_, ok = balances.PrimaryAccountWallet(nil)
	if ok {
		t.Fatal("expected no wallet")
	}
}

func assertNoBinaryFloats(t *testing.T, raw []byte) error {
	t.Helper()
	var value any
	if err := json.Unmarshal(raw, &value); err != nil {
		return err
	}
	return walkNoBinaryFloats(value, "$")
}

func walkNoBinaryFloats(value any, path string) error {
	switch v := value.(type) {
	case map[string]any:
		for key, child := range v {
			if err := walkNoBinaryFloats(child, path+"."+key); err != nil {
				return err
			}
		}
	case []any:
		for i, child := range v {
			if err := walkNoBinaryFloats(child, path+"["+string(rune('0'+i))+"]"); err != nil {
				return err
			}
		}
	case float64:
		if math.Mod(v, 1) != 0 {
			return &floatError{path: path}
		}
	}
	return nil
}

type floatError struct {
	path string
}

func (e *floatError) Error() string {
	return "binary float at " + e.path
}
