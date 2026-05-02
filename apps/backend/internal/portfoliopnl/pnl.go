package portfoliopnl

import (
	"encoding/json"
	"math/big"

	"retropick/apps/backend/internal/dbqueries"
)

// V1 definitions (see API docs on /api/v1/user/portfolio-summary):
// - costBasisWei = sum(PositionDeposited.amount) + sum(SideSwitched.feeAmount) for the pair.
// - markValueWei = PositionView.TotalStake (live locked stake proxy for MTM).
// - unrealizedWei = markValueWei - costBasisWei when the position is not claimed; else 0.

// CostBasisWeiFromEvents aggregates indexed cash flows for one (wallet, template, epoch).
func CostBasisWeiFromEvents(rows []dbqueries.ChainEvent) *big.Int {
	out := new(big.Int)
	for _, row := range rows {
		var payload map[string]any
		if len(row.Payload) == 0 {
			continue
		}
		if err := json.Unmarshal(row.Payload, &payload); err != nil {
			continue
		}
		switch row.EventName {
		case "PositionDeposited":
			if s, ok := payload["amount"].(string); ok {
				if n, ok := stringToBig(s); ok {
					out.Add(out, n)
				}
			}
		case "SideSwitched":
			if s, ok := payload["feeAmount"].(string); ok {
				if n, ok := stringToBig(s); ok {
					out.Add(out, n)
				}
			}
		}
	}
	return out
}

func stringToBig(s string) (*big.Int, bool) {
	if s == "" {
		return nil, false
	}
	n, ok := new(big.Int).SetString(s, 10)
	if !ok || n.Sign() < 0 {
		return nil, false
	}
	return n, true
}

// UnrealizedWei returns markValue - costBasis when not claimed; otherwise zero.
func UnrealizedWei(claimed bool, markValue *big.Int, costBasis *big.Int) *big.Int {
	if claimed {
		return new(big.Int)
	}
	if markValue == nil {
		markValue = new(big.Int)
	}
	if costBasis == nil {
		costBasis = new(big.Int)
	}
	return new(big.Int).Sub(markValue, costBasis)
}
