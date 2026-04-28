package ethops

import (
	"math/big"
	"strings"
	"testing"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"

	"retropick/apps/backend/internal/abis"
)

// loadMarketABI parses the embedded IMarketEngine ABI for tests.
func loadMarketABI(t *testing.T) abi.ABI {
	t.Helper()
	a, err := abi.JSON(strings.NewReader(string(abis.IMarketEngineJSON)))
	if err != nil {
		t.Fatalf("parse IMarketEngine ABI: %v", err)
	}
	return a
}

// TestUnpackSingleTuple_PositionView_RoundTrip exercises the exact code path
// that was failing on /api/v1/user/positions: a Solidity function with a
// SINGLE output of type tuple. Packing a populated PositionView via the ABI
// and then decoding it through unpackSingleTuple must round-trip.
func TestUnpackSingleTuple_PositionView_RoundTrip(t *testing.T) {
	marketABI := loadMarketABI(t)

	want := PositionView{
		Initialized:  true,
		Claimed:      false,
		ClaimableNow: true,
		Status:       3,
		Stakes: [8]*big.Int{
			big.NewInt(100), big.NewInt(200), big.NewInt(0), big.NewInt(0),
			big.NewInt(0), big.NewInt(0), big.NewInt(0), big.NewInt(0),
		},
		TotalStake:                 big.NewInt(300),
		EntryFeesPaid:              big.NewInt(5),
		SwitchFeesPaid:             big.NewInt(2),
		ClaimedAmount:              big.NewInt(150),
		PendingClaimAmount:         big.NewInt(75),
		PendingRefundAmount:        big.NewInt(0),
		WinningStake:               big.NewInt(100),
		SettledClaimRoutingEnabled: true,
	}

	raw, err := marketABI.Methods["getPositionView"].Outputs.Pack(want)
	if err != nil {
		t.Fatalf("pack outputs: %v", err)
	}

	got, err := unpackSingleTuple[PositionView](marketABI, "getPositionView", raw)
	if err != nil {
		t.Fatalf("unpackSingleTuple: %v", err)
	}

	if got.Initialized != want.Initialized ||
		got.Claimed != want.Claimed ||
		got.ClaimableNow != want.ClaimableNow ||
		got.Status != want.Status ||
		got.SettledClaimRoutingEnabled != want.SettledClaimRoutingEnabled {
		t.Fatalf("scalar fields mismatch: got %#v want %#v", got, want)
	}
	for i, s := range want.Stakes {
		if got.Stakes[i] == nil || got.Stakes[i].Cmp(s) != 0 {
			t.Fatalf("stakes[%d]: got %v want %v", i, got.Stakes[i], s)
		}
	}
	for _, kv := range []struct {
		name     string
		got, exp *big.Int
	}{
		{"totalStake", got.TotalStake, want.TotalStake},
		{"entryFeesPaid", got.EntryFeesPaid, want.EntryFeesPaid},
		{"switchFeesPaid", got.SwitchFeesPaid, want.SwitchFeesPaid},
		{"claimedAmount", got.ClaimedAmount, want.ClaimedAmount},
		{"pendingClaimAmount", got.PendingClaimAmount, want.PendingClaimAmount},
		{"pendingRefundAmount", got.PendingRefundAmount, want.PendingRefundAmount},
		{"winningStake", got.WinningStake, want.WinningStake},
	} {
		if kv.got == nil || kv.got.Cmp(kv.exp) != 0 {
			t.Fatalf("%s: got %v want %v", kv.name, kv.got, kv.exp)
		}
	}
}

// TestUnpackSingleTuple_PositionView_BugRegression locks in why we needed the
// helper at all. Calling go-ethereum's UnpackIntoInterface DIRECTLY on a flat
// mirror struct (the previous broken implementation) must still error with
// "cannot unmarshal struct {...} in to bool". If go-ethereum ever changes its
// copyAtomic semantics, this guard fires so we can drop the wrapper.
func TestUnpackSingleTuple_PositionView_BugRegression(t *testing.T) {
	marketABI := loadMarketABI(t)
	pv := PositionView{
		Stakes: [8]*big.Int{
			big.NewInt(0), big.NewInt(0), big.NewInt(0), big.NewInt(0),
			big.NewInt(0), big.NewInt(0), big.NewInt(0), big.NewInt(0),
		},
		TotalStake:          big.NewInt(0),
		EntryFeesPaid:       big.NewInt(0),
		SwitchFeesPaid:      big.NewInt(0),
		ClaimedAmount:       big.NewInt(0),
		PendingClaimAmount:  big.NewInt(0),
		PendingRefundAmount: big.NewInt(0),
		WinningStake:        big.NewInt(0),
	}
	raw, err := marketABI.Methods["getPositionView"].Outputs.Pack(pv)
	if err != nil {
		t.Fatalf("pack: %v", err)
	}
	var direct PositionView
	err = marketABI.UnpackIntoInterface(&direct, "getPositionView", raw)
	if err == nil {
		t.Fatalf("direct UnpackIntoInterface unexpectedly succeeded; helper may no longer be needed")
	}
	if !strings.Contains(err.Error(), "cannot unmarshal") || !strings.Contains(err.Error(), "in to bool") {
		t.Fatalf("expected go-ethereum 'cannot unmarshal ... in to bool' error, got: %v", err)
	}
}

// TestUnpackSingleTuple_OperatorGlobalView_RoundTrip exercises the operator
// global view path used by /api/v1/ops/* dashboards.
func TestUnpackSingleTuple_OperatorGlobalView_RoundTrip(t *testing.T) {
	marketABI := loadMarketABI(t)

	want := OperatorGlobalView{
		GlobalPaused:               true,
		YieldRouter:                common.HexToAddress("0x1111111111111111111111111111111111111111"),
		YieldRouterDisabled:        false,
		YieldRouterFailureCount:    2,
		TotalRoutedPrincipal:       big.NewInt(42),
		TotalUnreconciledRecovered: big.NewInt(0),
		Admin:                      common.HexToAddress("0x2222222222222222222222222222222222222222"),
		Treasury:                   common.HexToAddress("0x3333333333333333333333333333333333333333"),
		WorkerAuthority:            common.HexToAddress("0x4444444444444444444444444444444444444444"),
		PriceOracle:                common.HexToAddress("0x5555555555555555555555555555555555555555"),
		RateOracle:                 common.HexToAddress("0x6666666666666666666666666666666666666666"),
		SmartDataOracle:            common.HexToAddress("0x7777777777777777777777777777777777777777"),
		MacroOracle:                common.HexToAddress("0x8888888888888888888888888888888888888888"),
		EquityOracle:               common.HexToAddress("0x9999999999999999999999999999999999999999"),
	}

	raw, err := marketABI.Methods["getOperatorGlobalView"].Outputs.Pack(want)
	if err != nil {
		t.Fatalf("pack: %v", err)
	}
	got, err := unpackSingleTuple[OperatorGlobalView](marketABI, "getOperatorGlobalView", raw)
	if err != nil {
		t.Fatalf("unpackSingleTuple: %v", err)
	}
	if got.GlobalPaused != want.GlobalPaused ||
		got.YieldRouter != want.YieldRouter ||
		got.YieldRouterDisabled != want.YieldRouterDisabled ||
		got.YieldRouterFailureCount != want.YieldRouterFailureCount ||
		got.Admin != want.Admin ||
		got.Treasury != want.Treasury ||
		got.WorkerAuthority != want.WorkerAuthority ||
		got.PriceOracle != want.PriceOracle ||
		got.RateOracle != want.RateOracle ||
		got.SmartDataOracle != want.SmartDataOracle ||
		got.MacroOracle != want.MacroOracle ||
		got.EquityOracle != want.EquityOracle {
		t.Fatalf("operator global view fields mismatch: got %#v want %#v", got, want)
	}
	if got.TotalRoutedPrincipal.Cmp(want.TotalRoutedPrincipal) != 0 ||
		got.TotalUnreconciledRecovered.Cmp(want.TotalUnreconciledRecovered) != 0 {
		t.Fatalf("operator global view bigint mismatch: got %v / %v want %v / %v",
			got.TotalRoutedPrincipal, got.TotalUnreconciledRecovered,
			want.TotalRoutedPrincipal, want.TotalUnreconciledRecovered)
	}
}

// TestUnpackSingleTuple_OperatorTemplateView_RoundTrip covers
// getOperatorTemplateView(templateId).
func TestUnpackSingleTuple_OperatorTemplateView_RoundTrip(t *testing.T) {
	marketABI := loadMarketABI(t)

	want := OperatorTemplateView{
		ActiveEpochId:                        7,
		LastResolvedEpochId:                  6,
		HaltedAtEpochId:                      0,
		RollingNextEpochId:                   8,
		RollingPhase:                         1,
		RollingHaltReason:                    0,
		ActiveVault:                          big.NewInt(1_000_000),
		ClaimsVault:                          big.NewInt(500_000),
		FeesVault:                            big.NewInt(2_500),
		TemplateRoutedPrincipal:              big.NewInt(900_000),
		TemplateSettledClaimsRoutedPrincipal: big.NewInt(100_000),
		UnreconciledRecoveredAmount:          big.NewInt(0),
		UserOpsBlocked:                       false,
		UnsafeToUnpauseForTemplate:           true,
	}

	raw, err := marketABI.Methods["getOperatorTemplateView"].Outputs.Pack(want)
	if err != nil {
		t.Fatalf("pack: %v", err)
	}
	got, err := unpackSingleTuple[OperatorTemplateView](marketABI, "getOperatorTemplateView", raw)
	if err != nil {
		t.Fatalf("unpackSingleTuple: %v", err)
	}
	if got.ActiveEpochId != want.ActiveEpochId ||
		got.LastResolvedEpochId != want.LastResolvedEpochId ||
		got.HaltedAtEpochId != want.HaltedAtEpochId ||
		got.RollingNextEpochId != want.RollingNextEpochId ||
		got.RollingPhase != want.RollingPhase ||
		got.RollingHaltReason != want.RollingHaltReason ||
		got.UserOpsBlocked != want.UserOpsBlocked ||
		got.UnsafeToUnpauseForTemplate != want.UnsafeToUnpauseForTemplate {
		t.Fatalf("operator template scalar mismatch: got %#v want %#v", got, want)
	}
	for _, kv := range []struct {
		name     string
		got, exp *big.Int
	}{
		{"activeVault", got.ActiveVault, want.ActiveVault},
		{"claimsVault", got.ClaimsVault, want.ClaimsVault},
		{"feesVault", got.FeesVault, want.FeesVault},
		{"templateRoutedPrincipal", got.TemplateRoutedPrincipal, want.TemplateRoutedPrincipal},
		{"templateSettledClaimsRoutedPrincipal", got.TemplateSettledClaimsRoutedPrincipal, want.TemplateSettledClaimsRoutedPrincipal},
		{"unreconciledRecoveredAmount", got.UnreconciledRecoveredAmount, want.UnreconciledRecoveredAmount},
	} {
		if kv.got == nil || kv.got.Cmp(kv.exp) != 0 {
			t.Fatalf("%s: got %v want %v", kv.name, kv.got, kv.exp)
		}
	}
}

// TestUnpackSingleTuple_EpochView_RoundTrip covers getEpochView, the most
// complex tuple (nested OracleCheckpoint structs).
func TestUnpackSingleTuple_EpochView_RoundTrip(t *testing.T) {
	marketABI := loadMarketABI(t)

	tid := common.HexToHash("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
	want := EpochView{
		TemplateId:                       tid,
		EpochId:                          11,
		Status:                           2,
		CancelReason:                     0,
		OpenAt:                           1_700_000_000,
		LockAt:                           1_700_001_000,
		ResolveAt:                        1_700_002_000,
		CreatedAt:                        1_699_999_000,
		LockedAt:                         1_700_001_500,
		ResolvedAt:                       1_700_002_500,
		TotalPool:                        big.NewInt(10_000_000),
		TotalPositions:                   42,
		Claimable:                        true,
		RefundMode:                       false,
		WinningOutcomeMask:               big.NewInt(1),
		ClaimLiabilityTotal:              big.NewInt(7_000_000),
		TotalRefundLiability:             big.NewInt(0),
		SettlementFeeTotal:               big.NewInt(50_000),
		ClaimedTotal:                     big.NewInt(3_000_000),
		RemainingWinningStake:            big.NewInt(4_000_000),
		RoutedPrincipal:                  big.NewInt(9_000_000),
		SettledClaimRoutingEnabled:       true,
		SettledClaimBaseOutstanding:      big.NewInt(100),
		SettledClaimPrincipalOutstanding: big.NewInt(200),
		SettledClaimCurrentValue:         big.NewInt(305),
		OracleMaxDelaySeconds:            300,
		OracleMaxConfidenceBps:           500,
		CheckpointA: OracleCheckpoint{
			ValueE8:      big.NewInt(123_45000000),
			ConfidenceE8: big.NewInt(50_00000000),
			PublishTime:  1_700_001_400,
			Written:      true,
		},
		CheckpointB: OracleCheckpoint{
			ValueE8:      big.NewInt(124_00000000),
			ConfidenceE8: big.NewInt(40_00000000),
			PublishTime:  1_700_002_400,
			Written:      true,
		},
		HasSecondaryCheckpoints: false,
		HasCompositeCheckpoints: false,
	}

	raw, err := marketABI.Methods["getEpochView"].Outputs.Pack(want)
	if err != nil {
		t.Fatalf("pack: %v", err)
	}
	got, err := unpackSingleTuple[EpochView](marketABI, "getEpochView", raw)
	if err != nil {
		t.Fatalf("unpackSingleTuple: %v", err)
	}

	if got.TemplateId != want.TemplateId ||
		got.EpochId != want.EpochId ||
		got.Status != want.Status ||
		got.CancelReason != want.CancelReason ||
		got.OpenAt != want.OpenAt ||
		got.LockAt != want.LockAt ||
		got.ResolveAt != want.ResolveAt ||
		got.CreatedAt != want.CreatedAt ||
		got.LockedAt != want.LockedAt ||
		got.ResolvedAt != want.ResolvedAt ||
		got.TotalPositions != want.TotalPositions ||
		got.Claimable != want.Claimable ||
		got.RefundMode != want.RefundMode ||
		got.SettledClaimRoutingEnabled != want.SettledClaimRoutingEnabled ||
		got.OracleMaxDelaySeconds != want.OracleMaxDelaySeconds ||
		got.OracleMaxConfidenceBps != want.OracleMaxConfidenceBps ||
		got.HasSecondaryCheckpoints != want.HasSecondaryCheckpoints ||
		got.HasCompositeCheckpoints != want.HasCompositeCheckpoints {
		t.Fatalf("epoch view scalar mismatch: got %#v want %#v", got, want)
	}

	for _, kv := range []struct {
		name     string
		got, exp *big.Int
	}{
		{"totalPool", got.TotalPool, want.TotalPool},
		{"winningOutcomeMask", got.WinningOutcomeMask, want.WinningOutcomeMask},
		{"claimLiabilityTotal", got.ClaimLiabilityTotal, want.ClaimLiabilityTotal},
		{"totalRefundLiability", got.TotalRefundLiability, want.TotalRefundLiability},
		{"settlementFeeTotal", got.SettlementFeeTotal, want.SettlementFeeTotal},
		{"claimedTotal", got.ClaimedTotal, want.ClaimedTotal},
		{"remainingWinningStake", got.RemainingWinningStake, want.RemainingWinningStake},
		{"routedPrincipal", got.RoutedPrincipal, want.RoutedPrincipal},
		{"settledClaimBaseOutstanding", got.SettledClaimBaseOutstanding, want.SettledClaimBaseOutstanding},
		{"settledClaimPrincipalOutstanding", got.SettledClaimPrincipalOutstanding, want.SettledClaimPrincipalOutstanding},
		{"settledClaimCurrentValue", got.SettledClaimCurrentValue, want.SettledClaimCurrentValue},
	} {
		if kv.got == nil || kv.got.Cmp(kv.exp) != 0 {
			t.Fatalf("%s: got %v want %v", kv.name, kv.got, kv.exp)
		}
	}

	for _, cp := range []struct {
		name string
		got  OracleCheckpoint
		exp  OracleCheckpoint
	}{
		{"checkpointA", got.CheckpointA, want.CheckpointA},
		{"checkpointB", got.CheckpointB, want.CheckpointB},
	} {
		if cp.got.PublishTime != cp.exp.PublishTime || cp.got.Written != cp.exp.Written {
			t.Fatalf("%s scalar mismatch: got %#v want %#v", cp.name, cp.got, cp.exp)
		}
		if cp.got.ValueE8 == nil || cp.got.ValueE8.Cmp(cp.exp.ValueE8) != 0 {
			t.Fatalf("%s.valueE8: got %v want %v", cp.name, cp.got.ValueE8, cp.exp.ValueE8)
		}
		if cp.got.ConfidenceE8 == nil || cp.got.ConfidenceE8.Cmp(cp.exp.ConfidenceE8) != 0 {
			t.Fatalf("%s.confidenceE8: got %v want %v", cp.name, cp.got.ConfidenceE8, cp.exp.ConfidenceE8)
		}
	}
}
