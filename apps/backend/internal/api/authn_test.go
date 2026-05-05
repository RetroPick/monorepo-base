package api

import (
	"net/http/httptest"
	"testing"

	"github.com/golang-jwt/jwt/v5"
)

func TestPrincipalFromRequest(t *testing.T) {
	secret := "test-secret"
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":  "0x1111111111111111111111111111111111111111",
		"role": "operator",
	})
	signed, err := token.SignedString([]byte(secret))
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest("GET", "/x", nil)
	req.Header.Set("Authorization", "Bearer "+signed)
	p, err := PrincipalFromRequest(req, secret)
	if err != nil {
		t.Fatalf("principal parse failed: %v", err)
	}
	if p.Wallet != "0x1111111111111111111111111111111111111111" {
		t.Fatalf("unexpected wallet %s", p.Wallet)
	}
	if !p.IsOperator {
		t.Fatal("expected operator principal")
	}
}
