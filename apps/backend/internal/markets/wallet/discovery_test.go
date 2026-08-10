package wallet_test

import (
	"context"
	"encoding/json"
	"math"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"

	"retropick/apps/backend/internal/markets/wallet"
)

const (
	testSigner  = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
	testAccount = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
	testUserID  = "user-1"
)

type stubSessionResolver struct {
	session wallet.SessionContext
	err     error
}

func (s stubSessionResolver) ResolveSession(*http.Request) (wallet.SessionContext, error) {
	if s.err != nil {
		return wallet.SessionContext{}, s.err
	}
	return s.session, nil
}

func TestDiscoverer_ProxySignerAccountSeparation(t *testing.T) {
	t.Parallel()

	fixed := time.Date(2026, 8, 9, 10, 0, 0, 0, time.UTC)
	disc := &wallet.Discoverer{
		Store: wallet.MemoryStore{Rows: map[string][]wallet.LinkedAccount{
			testUserID + "|" + testSigner: {{
				AccountWallet: testAccount,
				WalletType:    wallet.WalletTypeGnosisSafe,
				LinkStatus:    wallet.LinkStatusLinked,
				IsPrimary:     true,
				ChainID:       wallet.PolygonChainID,
			}},
		}},
		Now: func() time.Time { return fixed },
	}

	resp, err := disc.ListWallets(context.Background(), wallet.SessionContext{
		UserID:        testUserID,
		SignerAddress: testSigner,
	})
	if err != nil {
		t.Fatal(err)
	}
	if resp.SignerAddress != testSigner {
		t.Fatalf("signer %q", resp.SignerAddress)
	}
	if len(resp.Wallets) != 1 {
		t.Fatalf("wallets len %d", len(resp.Wallets))
	}
	if resp.Wallets[0].AccountWallet != testAccount {
		t.Fatalf("account %q", resp.Wallets[0].AccountWallet)
	}
	if resp.SignerAddress == resp.Wallets[0].AccountWallet {
		t.Fatal("signer must differ from account wallet in proxy scenario")
	}
}

func TestDiscoverer_EOADistinctFields(t *testing.T) {
	t.Parallel()

	fixed := time.Date(2026, 8, 9, 10, 0, 0, 0, time.UTC)
	eoa := "0xcccccccccccccccccccccccccccccccccccccccc"
	disc := &wallet.Discoverer{
		Store: wallet.MemoryStore{Rows: map[string][]wallet.LinkedAccount{
			testUserID + "|" + eoa: {{
				AccountWallet: eoa,
				WalletType:    wallet.WalletTypeEOA,
				LinkStatus:    wallet.LinkStatusLinked,
				IsPrimary:     true,
				ChainID:       wallet.PolygonChainID,
			}},
		}},
		Now: func() time.Time { return fixed },
	}

	resp, err := disc.ListWallets(context.Background(), wallet.SessionContext{
		UserID:        testUserID,
		SignerAddress: eoa,
	})
	if err != nil {
		t.Fatal(err)
	}

	raw, err := json.Marshal(resp)
	if err != nil {
		t.Fatal(err)
	}
	var body map[string]json.RawMessage
	if err := json.Unmarshal(raw, &body); err != nil {
		t.Fatal(err)
	}
	if _, ok := body["signerAddress"]; !ok {
		t.Fatal("missing top-level signerAddress key")
	}

	var wallets []map[string]any
	if err := json.Unmarshal(body["wallets"], &wallets); err != nil {
		t.Fatal(err)
	}
	if len(wallets) != 1 {
		t.Fatalf("wallets len %d", len(wallets))
	}
	if _, ok := wallets[0]["accountWallet"]; !ok {
		t.Fatal("missing wallets[0].accountWallet key")
	}
	if resp.SignerAddress != resp.Wallets[0].AccountWallet {
		t.Fatal("expected equal EOA values")
	}
}

func TestDiscoverer_NeverInventsAddress(t *testing.T) {
	t.Parallel()

	disc := wallet.DefaultDiscoverer()
	resp, err := disc.ListWallets(context.Background(), wallet.SessionContext{
		UserID:        testUserID,
		SignerAddress: testSigner,
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(resp.Wallets) != 0 {
		t.Fatalf("expected empty wallets, got %+v", resp.Wallets)
	}
	if resp.SignerAddress != testSigner {
		t.Fatalf("signer %q", resp.SignerAddress)
	}
}

func TestListMyWallets_Unauthorized(t *testing.T) {
	t.Parallel()

	r := chi.NewRouter()
	r.Route("/api/v1/markets/me", func(r chi.Router) {
		wallet.RegisterRoutes(r, wallet.HandlerConfig{})
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets/me/wallets", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}
	var body wallet.ErrorResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Error.Code != "unauthorized" {
		t.Fatalf("error %+v", body.Error)
	}
}

func TestListMyWallets_LinkedWithStubAuth(t *testing.T) {
	t.Parallel()

	fixed := time.Date(2026, 8, 9, 10, 0, 0, 0, time.UTC)
	r := chi.NewRouter()
	r.Route("/api/v1/markets/me", func(r chi.Router) {
		wallet.RegisterRoutes(r, wallet.HandlerConfig{
			Sessions: stubSessionResolver{session: wallet.SessionContext{
				UserID:        testUserID,
				SignerAddress: testSigner,
			}},
			Discoverer: &wallet.Discoverer{
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
			},
		})
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets/me/wallets", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}
	var body wallet.WalletsListResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.SignerAddress != testSigner {
		t.Fatalf("signer %q", body.SignerAddress)
	}
	if len(body.Wallets) != 1 || body.Wallets[0].AccountWallet != testAccount {
		t.Fatalf("wallets %+v", body.Wallets)
	}
}

func TestWalletsListResponse_JSONContract(t *testing.T) {
	t.Parallel()

	fixed := time.Date(2026, 8, 9, 10, 0, 0, 0, time.UTC)
	resp := wallet.WalletsListResponse{
		SchemaVersion: wallet.SchemaVersion,
		SignerAddress: testSigner,
		Wallets: []wallet.LinkedWallet{{
			AccountWallet: testAccount,
			WalletType:    wallet.WalletTypeGnosisSafe,
			LinkStatus:    wallet.LinkStatusLinked,
			IsPrimary:     true,
			ChainID:       wallet.PolygonChainID,
		}},
		CheckedAt: fixed,
	}

	raw, err := json.Marshal(resp)
	if err != nil {
		t.Fatal(err)
	}
	var body map[string]any
	if err := json.Unmarshal(raw, &body); err != nil {
		t.Fatal(err)
	}
	for _, key := range []string{"schemaVersion", "signerAddress", "wallets", "checkedAt"} {
		if _, ok := body[key]; !ok {
			t.Fatalf("missing key %q", key)
		}
	}
	if body["schemaVersion"] != wallet.SchemaVersion {
		t.Fatalf("schemaVersion %v", body["schemaVersion"])
	}
	wallets, ok := body["wallets"].([]any)
	if !ok || len(wallets) != 1 {
		t.Fatalf("wallets %v", body["wallets"])
	}
	entry, ok := wallets[0].(map[string]any)
	if !ok {
		t.Fatal("wallet entry type")
	}
	for _, key := range []string{"accountWallet", "walletType", "linkStatus", "isPrimary", "chainId"} {
		if _, ok := entry[key]; !ok {
			t.Fatalf("missing wallet key %q", key)
		}
	}
	assertNoBinaryFloats(t, raw)
}

func assertNoBinaryFloats(t *testing.T, raw []byte) {
	t.Helper()
	var v any
	if err := json.Unmarshal(raw, &v); err != nil {
		t.Fatal(err)
	}
	walkJSON(t, v)
}

func walkJSON(t *testing.T, v any) {
	t.Helper()
	switch x := v.(type) {
	case map[string]any:
		for _, child := range x {
			walkJSON(t, child)
		}
	case []any:
		for _, child := range x {
			walkJSON(t, child)
		}
	case float64:
		if math.IsNaN(x) || math.IsInf(x, 0) || x != math.Trunc(x) {
			t.Fatalf("binary float in JSON: %v", x)
		}
	case float32:
		t.Fatalf("binary float32 in JSON: %v", x)
	}
}
