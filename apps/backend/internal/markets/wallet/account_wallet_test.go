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

func TestAccountWalletRelay_IsDisabledUntilOwnershipIsVerified(t *testing.T) {
	t.Parallel()

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

	relayBody := `{"accountWallet":"0xdddddddddddddddddddddddddddddddddddddddd","isPrimary":true}`
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/relay", bytes.NewReader([]byte(relayBody)))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("relay status %d body %s", rec.Code, rec.Body.String())
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
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}
}
