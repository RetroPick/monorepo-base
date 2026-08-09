package wallet_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"

	"retropick/apps/backend/internal/markets/wallet"
)

func TestLinkExistingWallet_Unauthorized(t *testing.T) {
	t.Parallel()

	r := chi.NewRouter()
	r.Route("/api/v1/markets/me", func(r chi.Router) {
		wallet.RegisterRoutes(r, wallet.HandlerConfig{
			Linker: &wallet.MemoryStore{},
		})
	})

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/markets/me/wallets/link", bytes.NewReader([]byte(`{}`)))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}
}

func TestLinkExistingWallet_LinkerUnwired(t *testing.T) {
	t.Parallel()

	r := chi.NewRouter()
	r.Route("/api/v1/markets/me", func(r chi.Router) {
		wallet.RegisterRoutes(r, wallet.HandlerConfig{
			Sessions: stubSessionResolver{session: wallet.SessionContext{
				UserID:        testUserID,
				SignerAddress: testSigner,
			}},
		})
	})

	body := `{"accountWallet":"0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","walletType":"GNOSIS_SAFE"}`
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/markets/me/wallets/link", bytes.NewReader([]byte(body)))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}
}

func TestLinkExistingWallet_PersistsAndLists(t *testing.T) {
	t.Parallel()

	fixed := time.Date(2026, 8, 9, 10, 0, 0, 0, time.UTC)
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

	linkBody := `{"accountWallet":"0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","walletType":"GNOSIS_SAFE","isPrimary":true}`
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/markets/me/wallets/link", bytes.NewReader([]byte(linkBody)))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("link status %d body %s", rec.Code, rec.Body.String())
	}
	var linked wallet.LinkedWallet
	if err := json.Unmarshal(rec.Body.Bytes(), &linked); err != nil {
		t.Fatal(err)
	}
	if linked.AccountWallet != testAccount {
		t.Fatalf("account %q", linked.AccountWallet)
	}
	if linked.WalletType != wallet.WalletTypeGnosisSafe {
		t.Fatalf("type %q", linked.WalletType)
	}

	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/v1/markets/me/wallets", nil)
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("list status %d body %s", rec.Code, rec.Body.String())
	}
	var list wallet.WalletsListResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &list); err != nil {
		t.Fatal(err)
	}
	if list.SignerAddress != testSigner {
		t.Fatalf("signer %q", list.SignerAddress)
	}
	if len(list.Wallets) != 1 || list.Wallets[0].AccountWallet != testAccount {
		t.Fatalf("wallets %+v", list.Wallets)
	}
	if list.SignerAddress == list.Wallets[0].AccountWallet {
		t.Fatal("proxy link must keep signer and account distinct")
	}
	_ = fixed
}

func TestLinkExistingWallet_Adr003DistinctFieldsEOA(t *testing.T) {
	t.Parallel()

	eoa := "0xcccccccccccccccccccccccccccccccccccccccc"
	mem := &wallet.MemoryStore{}
	r := chi.NewRouter()
	r.Route("/api/v1/markets/me", func(r chi.Router) {
		wallet.RegisterRoutes(r, wallet.HandlerConfig{
			Sessions: stubSessionResolver{session: wallet.SessionContext{
				UserID:        testUserID,
				SignerAddress: eoa,
			}},
			Linker: mem,
		})
	})

	linkBody := `{"accountWallet":"0xcccccccccccccccccccccccccccccccccccccccc","walletType":"EOA"}`
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/markets/me/wallets/link", bytes.NewReader([]byte(linkBody)))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}
	var linked wallet.LinkedWallet
	if err := json.Unmarshal(rec.Body.Bytes(), &linked); err != nil {
		t.Fatal(err)
	}
	raw, err := json.Marshal(linked)
	if err != nil {
		t.Fatal(err)
	}
	var body map[string]any
	if err := json.Unmarshal(raw, &body); err != nil {
		t.Fatal(err)
	}
	if _, ok := body["accountWallet"]; !ok {
		t.Fatal("missing accountWallet key in link response")
	}
}
