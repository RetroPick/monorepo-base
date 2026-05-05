package api

import (
	"testing"

	"retropick/apps/backend/internal/funding"
)

func TestRequiresIdempotencyKey(t *testing.T) {
	cases := []struct {
		status string
		want   bool
	}{
		{funding.StatusExecutionStarted, true},
		{funding.StatusSourceTxSubmitted, true},
		{funding.StatusBridging, true},
		{funding.StatusRouteSelected, false},
		{funding.StatusOptionsReady, false},
	}
	for _, tc := range cases {
		if got := requiresIdempotencyKey(tc.status); got != tc.want {
			t.Fatalf("status=%s got=%v want=%v", tc.status, got, tc.want)
		}
	}
}

func TestRequiresTxHash(t *testing.T) {
	if !requiresTxHash(funding.StatusSourceTxSubmitted) {
		t.Fatal("source tx submitted must require tx hash")
	}
	if requiresTxHash(funding.StatusExecutionStarted) {
		t.Fatal("execution started should not require tx hash")
	}
}

func TestIsValidTxHash(t *testing.T) {
	valid := "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
	if !isValidTxHash(valid) {
		t.Fatal("expected valid tx hash")
	}
	invalid := []string{
		"",
		"0x",
		"0x1234",
		"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
		"0xzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
	}
	for _, bad := range invalid {
		if isValidTxHash(bad) {
			t.Fatalf("expected invalid tx hash: %s", bad)
		}
	}
}

func TestFundingDecimalValid(t *testing.T) {
	okCases := []string{"0", "1", "1000000", " 42 "}
	for _, raw := range okCases {
		if _, ok := fundingDecimalValid(raw); !ok {
			t.Fatalf("expected valid decimal amount: %q", raw)
		}
	}
	badCases := []string{"", " ", "-1", "1.5", "abc"}
	for _, raw := range badCases {
		if _, ok := fundingDecimalValid(raw); ok {
			t.Fatalf("expected invalid decimal amount: %q", raw)
		}
	}
}
