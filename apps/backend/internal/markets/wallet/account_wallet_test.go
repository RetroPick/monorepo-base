package wallet_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"

	"retropick/apps/backend/internal/markets/wallet"
)

func TestAccountWalletPreview_DeployAction(t *testing.T) {
	t.Parallel()

	mem := &wallet.MemoryStore{}
	r := chi.NewRouter()
	wallet.RegisterAccountWalletRoutes(r, wallet.HandlerConfig{
		Sessions: stubSessionResolver{session: wallet.SessionContext{
			UserID:        testUserID,
			SignerAddress: testSigner,
		}},
		Linker: mem,
	})

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/preview", bytes.NewReader([]byte(`{"action":"deploy_deposit_wallet"}`)))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}
	var body wallet.AccountWalletPreviewResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.SignerAddress != testSigner {
		t.Fatalf("signer %q", body.SignerAddress)
	}
	if body.Action != wallet.ActionDeployDepositWallet {
		t.Fatalf("action %q", body.Action)
	}
	if body.ChainID != wallet.PolygonChainID {
		t.Fatalf("chainId %d", body.ChainID)
	}
}

func TestAccountWalletRelay_PersistsDepositWallet(t *testing.T) {
	t.Parallel()

	deployed := "0xdddddddddddddddddddddddddddddddddddddddd"
	mem := &wallet.MemoryStore{}
	r := chi.NewRouter()
	r.Route("/api/v1/markets/me", func(r chi.Router) {
		wallet.RegisterRoutes(r, wallet.HandlerConfig{
			Sessions: stubSessionResolver{session: wallet.SessionContext{
				UserID:        testUserID,
				SignerAddress: testSigner,
			}},
			Discoverer: wallet.NewDiscoverer(mem, wallet.NopRecorder{}),
			Linker:     mem,
		})
	})
	wallet.RegisterAccountWalletRoutes(r, wallet.HandlerConfig{
		Sessions: stubSessionResolver{session: wallet.SessionContext{
			UserID:        testUserID,
			SignerAddress: testSigner,
		}},
		Linker: mem,
	})

	// Empty before relay
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets/me/wallets", nil)
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("list status %d", rec.Code)
	}
	var before wallet.WalletsListResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &before); err != nil {
		t.Fatal(err)
	}
	if len(before.Wallets) != 0 {
		t.Fatalf("expected empty wallets before relay, got %+v", before.Wallets)
	}

	relayBody := `{"accountWallet":"0xdddddddddddddddddddddddddddddddddddddddd","isPrimary":true}`
	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/relay", bytes.NewReader([]byte(relayBody)))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("relay status %d body %s", rec.Code, rec.Body.String())
	}

	// Idempotent second relay
	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/relay", bytes.NewReader([]byte(relayBody)))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("relay retry status %d body %s", rec.Code, rec.Body.String())
	}

	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/v1/markets/me/wallets", nil)
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("list status %d body %s", rec.Code, rec.Body.String())
	}
	var after wallet.WalletsListResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &after); err != nil {
		t.Fatal(err)
	}
	if len(after.Wallets) != 1 {
		t.Fatalf("wallets %+v", after.Wallets)
	}
	if after.Wallets[0].AccountWallet != deployed {
		t.Fatalf("account %q want %q", after.Wallets[0].AccountWallet, deployed)
	}
	if after.Wallets[0].WalletType != wallet.WalletTypeDepositWallet {
		t.Fatalf("type %q", after.Wallets[0].WalletType)
	}
}

func TestAccountWalletRelay_NeverInventsAddress(t *testing.T) {
	t.Parallel()

	mem := &wallet.MemoryStore{}
	r := chi.NewRouter()
	wallet.RegisterAccountWalletRoutes(r, wallet.HandlerConfig{
		Sessions: stubSessionResolver{session: wallet.SessionContext{
			UserID:        testUserID,
			SignerAddress: testSigner,
		}},
		Linker: mem,
	})

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/relay", bytes.NewReader([]byte(`{}`)))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}
}
