package origin_test

import (
	"testing"

	"retropick/apps/backend/internal/markets/origin"
)

func TestNormalizeAcceptsStrictAuthorities(t *testing.T) {
	for _, tc := range []struct {
		raw  string
		want string
	}{
		{raw: "HTTPS://App.Example", want: "https://app.example"},
		{raw: "https://app.example:1", want: "https://app.example:1"},
		{raw: "https://app.example:65535", want: "https://app.example:65535"},
		{raw: "https://xn--bcher-kva.example", want: "https://xn--bcher-kva.example"},
		{raw: "https://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.ccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc.ddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd", want: "https://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.ccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc.ddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"},
		{raw: "http://127.0.0.1:3000", want: "http://127.0.0.1:3000"},
		{raw: "https://[2001:DB8::1]", want: "https://[2001:db8::1]"},
		{raw: "https://[2001:DB8::1]:443", want: "https://[2001:db8::1]:443"},
	} {
		t.Run(tc.raw, func(t *testing.T) {
			got, ok := origin.Normalize(tc.raw)
			if !ok || got != tc.want {
				t.Fatalf("Normalize(%q) = %q, %v; want %q, true", tc.raw, got, ok, tc.want)
			}
		})
	}
}

func TestNormalizeRejectsWhitespaceAndASCIIControlsWithoutSanitizing(t *testing.T) {
	for _, raw := range []string{
		" https://app.example",
		"https://app.example ",
		"https://app.example\r",
		"https://app.example\n",
		"https://app.\texample",
		"https://app.example\x01",
		"https://app.example\x1f",
		"https://app.example\x7f",
	} {
		t.Run(raw, func(t *testing.T) {
			if got, ok := origin.Normalize(raw); ok {
				t.Fatalf("Normalize(%q) = %q, true; want rejection", raw, got)
			}
		})
	}
}

func TestNormalizeRejectsNonASCIIAndAmbiguousDNSAuthorities(t *testing.T) {
	for _, raw := range []string{
		"https://bücher.example",
		"https://ｅxample.com",
		"https://example。com",
		"https://xn--bcher-kva.example。evil.example",
		"https://example.com.",
		"https://example..com",
		"https://-example.com",
		"https://example-.com",
		"https://exa_mple.com",
		"https://%65xample.com",
		"https://example%2ecom",
		"https://999.999.999.999",
		"https://127.0.0.01",
		"https://xn--.example",
		"https://xn--not-punycode-.example",
	} {
		t.Run(raw, func(t *testing.T) {
			if got, ok := origin.Normalize(raw); ok {
				t.Fatalf("Normalize(%q) = %q, true; want rejection", raw, got)
			}
		})
	}
}

func TestNormalizeRejectsDNSLengthViolations(t *testing.T) {
	longLabel := "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
	longHostname := "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa." +
		"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb." +
		"ccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc." +
		"ddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd.e"
	for _, raw := range []string{"https://" + longLabel + ".example", "https://" + longHostname} {
		t.Run(raw, func(t *testing.T) {
			if got, ok := origin.Normalize(raw); ok {
				t.Fatalf("Normalize(%q) = %q, true; want rejection", raw, got)
			}
		})
	}
}

func TestNormalizeRejectsInvalidOrigins(t *testing.T) {
	for _, raw := range []string{
		"https://app.example:",
		"https://app.example:0",
		"https://app.example:65536",
		"https://app.example:99999",
		"https://[fe80::1%25eth0]",
		"https://user@app.example",
		"https://app.example/path",
		"https://app.example?query",
		"https://app.example#fragment",
		"https://*.example",
		"null",
		"https://app.example\x00",
		"https://app.example,https://evil.example",
		"https://",
	} {
		t.Run(raw, func(t *testing.T) {
			if got, ok := origin.Normalize(raw); ok {
				t.Fatalf("Normalize(%q) = %q, true; want rejection", raw, got)
			}
		})
	}
}
