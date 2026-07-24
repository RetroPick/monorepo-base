package referrals

import (
	"math/big"
	"testing"

	"github.com/ethereum/go-ethereum/common"
)

func TestAllocation_fullTree(t *testing.T) {
	fee := big.NewInt(10000)
	a1 := common.HexToAddress("0x0000000000000000000000000000000000000001")
	a2 := common.HexToAddress("0x0000000000000000000000000000000000000002")
	a3 := common.HexToAddress("0x0000000000000000000000000000000000000003")
	a4 := common.HexToAddress("0x0000000000000000000000000000000000000004")
	rewards, treasury := Allocation(fee, []common.Address{a1, a2, a3, a4})
	if len(rewards) != 4 {
		t.Fatalf("rewards %d", len(rewards))
	}
	var sum int64
	for _, r := range rewards {
		sum += r.Amount.Int64()
	}
	sum += treasury.Int64()
	if sum != fee.Int64() {
		t.Fatalf("sum %d fee %d treasury %d", sum, fee.Int64(), treasury.Int64())
	}
	if treasury.Int64() != 4000 {
		t.Fatalf("treasury %d", treasury.Int64())
	}
}

func TestAllocation_missingLevelsGoToTreasury(t *testing.T) {
	fee := big.NewInt(10000)
	a1 := common.HexToAddress("0x0000000000000000000000000000000000000001")
	rewards, treasury := Allocation(fee, []common.Address{a1})
	if len(rewards) != 1 {
		t.Fatalf("rewards %d", len(rewards))
	}
	if rewards[0].Amount.Int64() != 3000 {
		t.Fatalf("l1 %d", rewards[0].Amount.Int64())
	}
	// 40% base + 15% + 9% + 6% missing = 70%
	if treasury.Int64() != 7000 {
		t.Fatalf("treasury %d", treasury.Int64())
	}
}

func TestAllocation_noReferrerAllTreasury(t *testing.T) {
	fee := big.NewInt(1000)
	rewards, treasury := Allocation(fee, nil)
	if len(rewards) != 0 {
		t.Fatalf("expected no rewards")
	}
	if treasury.Int64() != 1000 {
		t.Fatalf("treasury %d", treasury.Int64())
	}
}
