package balances

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"strings"
	"testing"

	"retropick/apps/backend/internal/markets/wallet"
)

func TestBuildL2Signature_KnownVector(t *testing.T) {
	t.Parallel()

	secretKey := []byte("test-secret-key-32bytes-long!!")
	secretB64 := base64.StdEncoding.EncodeToString(secretKey)

	timestamp := "1700000000"
	method := "GET"
	path := "/balance-allowance"
	message := timestamp + method + path
	mac := hmac.New(sha256.New, secretKey)
	mac.Write([]byte(message))
	want := base64.StdEncoding.EncodeToString(mac.Sum(nil))
	want = strings.ReplaceAll(want, "+", "-")
	want = strings.ReplaceAll(want, "/", "_")

	got, err := buildL2Signature(secretB64, timestamp, method, path, "")
	if err != nil {
		t.Fatal(err)
	}
	if got != want {
		t.Fatalf("signature = %q want %q", got, want)
	}
}

func TestSignatureTypeForWallet(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name string
		wt   wallet.WalletType
		want int
		ok   bool
	}{
		{"EOA", wallet.WalletTypeEOA, 0, true},
		{"POLY_PROXY", wallet.WalletTypePolyProxy, 1, true},
		{"GNOSIS_SAFE", wallet.WalletTypeGnosisSafe, 2, true},
		{"DEPOSIT_WALLET", wallet.WalletTypeDepositWallet, 3, true},
		{"empty", "", 0, true},
		{"unknown", "UNKNOWN", 0, false},
	}
	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			got, err := signatureTypeForWallet(tc.wt)
			if tc.ok && err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if !tc.ok && err == nil {
				t.Fatal("expected error")
			}
			if tc.ok && got != tc.want {
				t.Fatalf("got %d want %d", got, tc.want)
			}
		})
	}
}
