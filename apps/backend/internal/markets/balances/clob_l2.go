package balances

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"strings"
)

const balanceAllowancePath = "/balance-allowance"

// buildL2Signature produces the Polymarket CLOB L2 HMAC signature for a request.
// message = timestamp + method + requestPath (+ body when non-empty).
func buildL2Signature(secret, timestamp, method, requestPath, body string) (string, error) {
	key, err := decodeBase64Secret(secret)
	if err != nil {
		return "", fmt.Errorf("decode l2 secret: %w", err)
	}
	message := timestamp + method + requestPath
	if body != "" {
		message += body
	}
	mac := hmac.New(sha256.New, key)
	if _, err := mac.Write([]byte(message)); err != nil {
		return "", err
	}
	sig := base64.StdEncoding.EncodeToString(mac.Sum(nil))
	sig = strings.ReplaceAll(sig, "+", "-")
	sig = strings.ReplaceAll(sig, "/", "_")
	return sig, nil
}

func decodeBase64Secret(secret string) ([]byte, error) {
	sanitized := strings.TrimSpace(secret)
	sanitized = strings.ReplaceAll(sanitized, "-", "+")
	sanitized = strings.ReplaceAll(sanitized, "_", "/")
	switch len(sanitized) % 4 {
	case 2:
		sanitized += "=="
	case 3:
		sanitized += "="
	}
	return base64.StdEncoding.DecodeString(sanitized)
}

// l2AuthHeaders returns the five POLY_* headers for an authenticated CLOB request.
func l2AuthHeaders(creds L2Credentials, timestamp, method, requestPath, body string) (map[string]string, error) {
	sig, err := buildL2Signature(creds.Secret, timestamp, method, requestPath, body)
	if err != nil {
		return nil, err
	}
	return map[string]string{
		"POLY_ADDRESS":    creds.SignerAddress,
		"POLY_SIGNATURE":  sig,
		"POLY_TIMESTAMP": timestamp,
		"POLY_API_KEY":    creds.APIKey,
		"POLY_PASSPHRASE": creds.Passphrase,
	}, nil
}
