package clob

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"strings"
	"testing"
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

func TestBuildL2Signature_IncludesPOSTBody(t *testing.T) {
	t.Parallel()

	secretKey := []byte("test-secret-key-32bytes-long!!")
	secretB64 := base64.StdEncoding.EncodeToString(secretKey)

	timestamp := "1700000001"
	method := "POST"
	path := orderSubmitPath
	body := `{"orderType":"GTC"}`
	message := timestamp + method + path + body
	mac := hmac.New(sha256.New, secretKey)
	mac.Write([]byte(message))
	want := base64.StdEncoding.EncodeToString(mac.Sum(nil))
	want = strings.ReplaceAll(want, "+", "-")
	want = strings.ReplaceAll(want, "/", "_")

	got, err := buildL2Signature(secretB64, timestamp, method, path, body)
	if err != nil {
		t.Fatal(err)
	}
	if got != want {
		t.Fatalf("signature = %q want %q", got, want)
	}
}
