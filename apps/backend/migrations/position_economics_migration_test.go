package migrations

import (
	"strings"
	"testing"
)

func TestMarketsV1PositionEconomicsMigrationUsesFixedPointAndCoverage(t *testing.T) {
	t.Parallel()
	up, err := Files.ReadFile("000025_markets_position_projection_economics_check.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	down, err := Files.ReadFile("000025_markets_position_projection_economics_check.down.sql")
	if err != nil {
		t.Fatal(err)
	}
	for _, fragment := range []string{"redeemable_observed BOOLEAN NOT NULL DEFAULT FALSE", "mark_price", "unrealized_pnl", "realized_pnl", "claimable_amount"} {
		if !strings.Contains(string(up), fragment) {
			t.Errorf("economics migration missing %q", fragment)
		}
	}
	if !strings.Contains(string(down), "DROP COLUMN IF EXISTS redeemable_observed") {
		t.Fatal("economics rollback does not remove coverage column")
	}
}
