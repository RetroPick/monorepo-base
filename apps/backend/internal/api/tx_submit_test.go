package api

import (
	"net/http/httptest"
	"testing"

	"github.com/golang-jwt/jwt/v5"
)

func TestTxSubmitBodyValidateRequiresIdempotencyKey(t *testing.T) {
	body := txSubmitRequest{
		Wallet: "0x1111111111111111111111111111111111111111",
		TxHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
		Action: "enter",
	}
	if err := validateTxSubmitBody(body); err == nil {
		t.Fatal("expected missing idempotency key to fail")
	}
}

func TestAuthorizeOptionalWalletPrincipalAllowsUnsigned(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/v1/tx/submit", nil)
	if err := authorizeOptionalWalletPrincipal(req, "0x1111111111111111111111111111111111111111", "secret"); err != nil {
		t.Fatalf("unsigned request should remain guest-safe: %v", err)
	}
}

func TestAuthorizeOptionalWalletPrincipalRejectsWalletMismatch(t *testing.T) {
	secret := "test-secret"
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": "0x1111111111111111111111111111111111111111",
	})
	signed, err := token.SignedString([]byte(secret))
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest("POST", "/api/v1/tx/submit", nil)
	req.Header.Set("Authorization", "Bearer "+signed)
	if err := authorizeOptionalWalletPrincipal(req, "0x2222222222222222222222222222222222222222", secret); err == nil {
		t.Fatal("expected wallet mismatch to fail")
	}
}
