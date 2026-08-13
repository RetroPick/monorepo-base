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
	for _, fragment := range []string{
		"mark_price_observed BOOLEAN NOT NULL DEFAULT FALSE",
		"cost_basis_observed BOOLEAN NOT NULL DEFAULT FALSE",
		"unrealized_pnl_observed BOOLEAN NOT NULL DEFAULT FALSE",
		"realized_pnl_observed BOOLEAN NOT NULL DEFAULT FALSE",
		"redeemable_observed BOOLEAN NOT NULL DEFAULT FALSE",
		"claimable_amount_observed BOOLEAN NOT NULL DEFAULT FALSE",
		"mark_price", "unrealized_pnl", "realized_pnl", "claimable_amount",
	} {
		if !strings.Contains(string(up), fragment) {
			t.Errorf("economics migration missing %q", fragment)
		}
	}
	for _, column := range []string{"mark_price_observed", "cost_basis_observed", "unrealized_pnl_observed", "realized_pnl_observed", "redeemable_observed", "claimable_amount_observed"} {
		if !strings.Contains(string(down), "DROP COLUMN IF EXISTS "+column) {
			t.Errorf("economics rollback does not remove %s", column)
		}
	}
}
