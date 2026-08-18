package api

import (
	"math/big"
	"testing"
)

func TestAccumulateClaimedAmount_UsesMaxAcrossOutcomeRows(t *testing.T) {
	current := new(big.Int)

	// Simulate two outcome rows carrying the same claimed amount.
	accumulateClaimedAmount(current, "1770000000000000000000")
	accumulateClaimedAmount(current, "1770000000000000000000")

	if got := current.String(); got != "1770000000000000000000" {
		t.Fatalf("claimed amount double-counted, got %s", got)
	}
}

func TestAccumulateClaimedAmount_UpdatesWhenLargerValueSeen(t *testing.T) {
	current := new(big.Int)

	accumulateClaimedAmount(current, "100")
	accumulateClaimedAmount(current, "250")

	if got := current.String(); got != "250" {
		t.Fatalf("expected max claimed amount, got %s", got)
	}
}

func TestAccumulateClaimedAmount_IgnoresInvalidValues(t *testing.T) {
	current := big.NewInt(42)

	accumulateClaimedAmount(current, "not-a-number")

	if got := current.String(); got != "42" {
		t.Fatalf("invalid claimed text should be ignored, got %s", got)
	}
}
