package ethops

import (
	"math/big"
	"testing"

	"github.com/ethereum/go-ethereum/common"
)

func TestToJSONMap_OperatorGlobalView(t *testing.T) {
	v := OperatorGlobalView{
		GlobalPaused:               true,
		YieldRouter:                common.HexToAddress("0x1111111111111111111111111111111111111111"),
		YieldRouterDisabled:        false,
		YieldRouterFailureCount:    2,
		TotalRoutedPrincipal:       big.NewInt(42),
		TotalUnreconciledRecovered: big.NewInt(0),
		Admin:                      common.HexToAddress("0x2222222222222222222222222222222222222222"),
		Treasury:                   common.Address{},
		WorkerAuthority:            common.Address{},
		PriceOracle:                common.Address{},
		RateOracle:                 common.Address{},
		SmartDataOracle:            common.Address{},
		MacroOracle:                common.Address{},
		EquityOracle:               common.Address{},
	}
	m, ok := ToJSONMap(v).(map[string]any)
	if !ok {
		t.Fatalf("expected map")
	}
	if m["globalPaused"] != true {
		t.Fatalf("globalPaused")
	}
	if m["yieldRouter"] != "0x1111111111111111111111111111111111111111" {
		t.Fatalf("yieldRouter got %v", m["yieldRouter"])
	}
	if m["totalRoutedPrincipal"] != "42" {
		t.Fatalf("totalRoutedPrincipal got %v", m["totalRoutedPrincipal"])
	}
}

func TestToJSONMap_EpochCheckpoint(t *testing.T) {
	v := EpochView{
		TemplateId: common.Hash{1},
		EpochId:    7,
		CheckpointA: OracleCheckpoint{
			ValueE8:      big.NewInt(-100),
			ConfidenceE8: big.NewInt(99),
			PublishTime:  1,
			Written:      true,
		},
	}
	m, ok := ToJSONMap(v).(map[string]any)
	if !ok {
		t.Fatalf("expected map")
	}
	if m["epochId"].(uint64) != 7 {
		t.Fatalf("epochId: %v", m["epochId"])
	}
	cp, ok := m["checkpointA"].(map[string]any)
	if !ok {
		t.Fatalf("checkpointA map: %T", m["checkpointA"])
	}
	if cp["valueE8"] != "-100" {
		t.Fatalf("valueE8: %v", cp["valueE8"])
	}
}
