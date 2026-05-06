package api

import (
	"net/http/httptest"
	"testing"

	"github.com/golang-jwt/jwt/v5"
)

func TestRequireAuthorizedWalletQueryRejectsInvalidWallet(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/v1/user/balance?wallet=bad", nil)
	req = WithAuthSecret(req, "test-secret")
	rr := httptest.NewRecorder()

	if _, ok := requireAuthorizedWalletQuery(rr, req, "wallet"); ok {
		t.Fatal("expected invalid wallet to fail")
	}
	if rr.Code != 400 {
		t.Fatalf("expected 400, got %d", rr.Code)
	}
}

func TestRequireAuthorizedWalletValueRejectsInvalidWallet(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/v1/user/balance", nil)
	req = WithAuthSecret(req, "test-secret")
	rr := httptest.NewRecorder()

	if _, ok := requireAuthorizedWalletValue(rr, req, "bad"); ok {
		t.Fatal("expected invalid wallet to fail")
	}
	if rr.Code != 400 {
		t.Fatalf("expected 400, got %d", rr.Code)
	}
}

func TestRequireAuthorizedWalletQueryRejectsUnauthorizedWallet(t *testing.T) {
	secret := "test-secret"
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": "0x1111111111111111111111111111111111111111",
	})
	signed, err := token.SignedString([]byte(secret))
	if err != nil {
		t.Fatal(err)
	}

	req := httptest.NewRequest("GET", "/api/v1/user/balance?wallet=0x2222222222222222222222222222222222222222", nil)
	req.Header.Set("Authorization", "Bearer "+signed)
	req = WithAuthSecret(req, secret)
	rr := httptest.NewRecorder()

	if _, ok := requireAuthorizedWalletQuery(rr, req, "wallet"); ok {
		t.Fatal("expected wallet mismatch to fail")
	}
	if rr.Code != 401 {
		t.Fatalf("expected 401, got %d", rr.Code)
	}
}

func TestRequireAuthorizedWalletValueNormalizesAuthorizedWallet(t *testing.T) {
	secret := "test-secret"
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": "0x1111111111111111111111111111111111111111",
	})
	signed, err := token.SignedString([]byte(secret))
	if err != nil {
		t.Fatal(err)
	}

	req := httptest.NewRequest("GET", "/api/v1/user/balance", nil)
	req.Header.Set("Authorization", "Bearer "+signed)
	req = WithAuthSecret(req, secret)
	rr := httptest.NewRecorder()

	got, ok := requireAuthorizedWalletValue(rr, req, "0x1111111111111111111111111111111111111111")
	if !ok {
		t.Fatal("expected authorized wallet to pass")
	}
	if got != "0x1111111111111111111111111111111111111111" {
		t.Fatalf("unexpected normalized wallet %q", got)
	}
}

func TestRequireAuthorizedWalletQueryNormalizesAuthorizedWallet(t *testing.T) {
	secret := "test-secret"
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": "0x1111111111111111111111111111111111111111",
	})
	signed, err := token.SignedString([]byte(secret))
	if err != nil {
		t.Fatal(err)
	}

	req := httptest.NewRequest("GET", "/api/v1/user/balance?wallet=0x1111111111111111111111111111111111111111", nil)
	req.Header.Set("Authorization", "Bearer "+signed)
	req = WithAuthSecret(req, secret)
	rr := httptest.NewRecorder()

	got, ok := requireAuthorizedWalletQuery(rr, req, "wallet")
	if !ok {
		t.Fatal("expected authorized wallet to pass")
	}
	if got != "0x1111111111111111111111111111111111111111" {
		t.Fatalf("unexpected normalized wallet %q", got)
	}
}
