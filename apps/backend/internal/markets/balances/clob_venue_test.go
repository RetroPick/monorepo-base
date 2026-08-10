package balances_test

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"retropick/apps/backend/internal/markets/balances"
	"retropick/apps/backend/internal/markets/wallet"
)

func clobTestCreds() balances.L2Credentials {
	return balances.L2Credentials{
		SignerAddress: testSigner,
		APIKey: strings.Join(
			[]string{"unit", "test", "api", "key"},
			"-",
		),
		Secret: base64.StdEncoding.EncodeToString(bytes.Repeat([]byte{0x24}, 32)),
		Passphrase: strings.Join(
			[]string{"unit", "test", "passphrase"},
			"-",
		),
	}
}

func TestClobVenueSource_CollateralOK(t *testing.T) {
	t.Parallel()

	fixed := time.Date(2026, 8, 9, 12, 0, 0, 0, time.UTC)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/balance-allowance" {
			t.Fatalf("path %q", r.URL.Path)
		}
		if r.URL.Query().Get("asset_type") != "COLLATERAL" {
			t.Fatalf("asset_type = %q", r.URL.Query().Get("asset_type"))
		}
		if r.URL.Query().Get("signature_type") != "3" {
			t.Fatalf("signature_type = %q", r.URL.Query().Get("signature_type"))
		}
		if r.Header.Get("POLY_API_KEY") == "" || r.Header.Get("POLY_SIGNATURE") == "" {
			t.Fatal("missing L2 headers")
		}
		_ = json.NewEncoder(w).Encode(map[string]string{
			"balance":   "10500000",
			"allowance": "0",
		})
	}))
	t.Cleanup(srv.Close)

	client := balances.NewClobBalanceClient(srv.URL, 5*time.Second)
	client.SetNowForTest(func() time.Time { return fixed })
	venue := balances.NewClobVenueSource(client, balances.StaticL2CredentialStore{Creds: clobTestCreds()})

	result, err := venue.CollateralBalance(context.Background(), balances.VenueBalanceRequest{
		Session: balances.SessionContext{
			UserID:        testUserID,
			SignerAddress: testSigner,
		},
		AccountWallet: testAccount,
		WalletType:    wallet.WalletTypeDepositWallet,
	})
	if err != nil {
		t.Fatal(err)
	}
	if result.Collateral.Amount != "10500000" {
		t.Fatalf("amount = %q", result.Collateral.Amount)
	}
	if result.Provenance.UpstreamID != testAccount {
		t.Fatalf("upstream id = %q", result.Provenance.UpstreamID)
	}
}

func TestClobVenueSource_L2Unwired(t *testing.T) {
	t.Parallel()

	client := balances.NewClobBalanceClient("http://unused", time.Second)
	venue := balances.NewClobVenueSource(client, balances.UnwiredL2CredentialStore{})

	_, err := venue.CollateralBalance(context.Background(), balances.VenueBalanceRequest{
		Session: balances.SessionContext{
			UserID:        testUserID,
			SignerAddress: testSigner,
		},
		AccountWallet: testAccount,
		WalletType:    wallet.WalletTypeDepositWallet,
	})
	if !errors.Is(err, balances.ErrUpstreamUnavailable) {
		t.Fatalf("err = %v", err)
	}
}

func TestClobVenueSource_Upstream5xx(t *testing.T) {
	t.Parallel()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	t.Cleanup(srv.Close)

	client := balances.NewClobBalanceClient(srv.URL, 5*time.Second)
	venue := balances.NewClobVenueSource(client, balances.StaticL2CredentialStore{Creds: clobTestCreds()})

	_, err := venue.CollateralBalance(context.Background(), balances.VenueBalanceRequest{
		Session: balances.SessionContext{
			UserID:        testUserID,
			SignerAddress: testSigner,
		},
		AccountWallet: testAccount,
		WalletType:    wallet.WalletTypeDepositWallet,
	})
	if !errors.Is(err, balances.ErrUpstreamUnavailable) {
		t.Fatalf("err = %v", err)
	}
}

func TestClobVenueSource_UpstreamTimeout(t *testing.T) {
	t.Parallel()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		time.Sleep(200 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	}))
	t.Cleanup(srv.Close)

	client := balances.NewClobBalanceClient(srv.URL, 50*time.Millisecond)
	venue := balances.NewClobVenueSource(client, balances.StaticL2CredentialStore{Creds: clobTestCreds()})

	_, err := venue.CollateralBalance(context.Background(), balances.VenueBalanceRequest{
		Session: balances.SessionContext{
			UserID:        testUserID,
			SignerAddress: testSigner,
		},
		AccountWallet: testAccount,
		WalletType:    wallet.WalletTypeDepositWallet,
	})
	if !errors.Is(err, balances.ErrUpstreamUnavailable) {
		t.Fatalf("err = %v", err)
	}
}

func TestClobVenueSource_InvalidPayload(t *testing.T) {
	t.Parallel()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"balance":"-1","allowance":"0"}`))
	}))
	t.Cleanup(srv.Close)

	client := balances.NewClobBalanceClient(srv.URL, 5*time.Second)
	venue := balances.NewClobVenueSource(client, balances.StaticL2CredentialStore{Creds: clobTestCreds()})

	_, err := venue.CollateralBalance(context.Background(), balances.VenueBalanceRequest{
		Session: balances.SessionContext{
			UserID:        testUserID,
			SignerAddress: testSigner,
		},
		AccountWallet: testAccount,
		WalletType:    wallet.WalletTypeDepositWallet,
	})
	if !errors.Is(err, balances.ErrUpstreamUnavailable) {
		t.Fatalf("err = %v", err)
	}
}

func TestProductionHandlerConfig_EndToEnd(t *testing.T) {
	t.Parallel()

	fixed := time.Date(2026, 8, 9, 12, 0, 0, 0, time.UTC)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]string{
			"balance":   "5000000",
			"allowance": "0",
		})
	}))
	t.Cleanup(srv.Close)

	disc := linkedDiscoverer(fixed, testAccount, true)
	clobClient := balances.NewClobBalanceClient(srv.URL, 5*time.Second)
	clobClient.SetNowForTest(func() time.Time { return fixed })
	reader := balances.NewReader(balances.ReaderConfig{
		Discoverer: disc,
		Venue:      balances.NewClobVenueSource(clobClient, balances.StaticL2CredentialStore{Creds: clobTestCreds()}),
		Now:        func() time.Time { return fixed },
	})

	r := balanceRouter(balances.HandlerConfig{
		Sessions: stubSessionResolver{session: balances.SessionContext{
			UserID:        testUserID,
			SignerAddress: testSigner,
		}},
		Reader: reader,
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
	if body.Collateral.Amount != "5000000" {
		t.Fatalf("amount = %q", body.Collateral.Amount)
	}
}
