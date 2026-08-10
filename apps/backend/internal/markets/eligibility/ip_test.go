package eligibility_test

import (
	"net/http/httptest"
	"testing"

	"retropick/apps/backend/internal/markets/eligibility"
)

func TestClientIPFromRequestIgnoresXFFWithoutTrustedProxy(t *testing.T) {
	t.Parallel()

	req := httptest.NewRequest("GET", "/api/v1/markets/eligibility", nil)
	req.RemoteAddr = "10.0.0.9:1234"
	req.Header.Set("X-Forwarded-For", "198.51.100.9")

	got := eligibility.ClientIPFromRequest(req, eligibility.IPTrustOptions{
		TrustForwardedFor: true,
		TrustedProxyCIDRs: []string{"10.0.0.0/8"},
	})
	if got != "198.51.100.9" {
		t.Fatalf("got %q", got)
	}
}

func TestClientIPFromRequestIgnoresXFFFromUntrustedProxy(t *testing.T) {
	t.Parallel()

	req := httptest.NewRequest("GET", "/api/v1/markets/eligibility", nil)
	req.RemoteAddr = "203.0.113.9:1234"
	req.Header.Set("X-Forwarded-For", "198.51.100.9")
	req.Header.Set("X-Geo-Country", "US")

	got := eligibility.ClientIPFromRequest(req, eligibility.IPTrustOptions{
		TrustForwardedFor: true,
		TrustedProxyCIDRs: []string{"10.0.0.0/8"},
	})
	if got != "203.0.113.9" {
		t.Fatalf("got %q want direct remote", got)
	}
}

func TestHashIPRedactedIPv4(t *testing.T) {
	t.Parallel()

	got := eligibility.HashIPRedacted("203.0.113.42")
	if got != "203.0.113.0" {
		t.Fatalf("got %q", got)
	}
}
