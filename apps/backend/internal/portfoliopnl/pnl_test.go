package portfoliopnl

import (
	"encoding/json"
	"math/big"
	"testing"

	"retropick/apps/backend/internal/dbqueries"
)

func TestCostBasisWeiFromEvents(t *testing.T) {
	mk := func(name string, payload map[string]any) dbqueries.ChainEvent {
		b, _ := json.Marshal(payload)
		return dbqueries.ChainEvent{EventName: name, Payload: b}
	}
	rows := []dbqueries.ChainEvent{
		mk("PositionDeposited", map[string]any{"amount": "100", "outcomeIndex": float64(0)}),
		mk("SideSwitched", map[string]any{"feeAmount": "5", "grossAmount": "50", "netAmount": "45"}),
		mk("Claimed", map[string]any{"amount": "200"}),
	}
	got := CostBasisWeiFromEvents(rows)
	want := big.NewInt(105)
	if got.Cmp(want) != 0 {
		t.Fatalf("cost basis: got %s want %s", got, want)
	}
}

func TestUnrealizedWei(t *testing.T) {
	if v := UnrealizedWei(true, big.NewInt(100), big.NewInt(40)); v.Sign() != 0 {
		t.Fatalf("claimed: got %s", v)
	}
	if v := UnrealizedWei(false, big.NewInt(100), big.NewInt(40)); v.Cmp(big.NewInt(60)) != 0 {
		t.Fatalf("open: got %s", v)
	}
}
