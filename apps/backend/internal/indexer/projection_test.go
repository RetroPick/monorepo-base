package indexer

import (
	"math/big"
	"testing"
)

func TestComputeProjectionOutcomesCalculatesProbabilitiesAndMultipliers(t *testing.T) {
	outcomes := []projectionOutcomeState{
		{Index: 0, PoolAmount: big.NewInt(60)},
		{Index: 1, PoolAmount: big.NewInt(40)},
	}

	got := computeProjectionOutcomes(outcomes)

	if len(got) != 2 {
		t.Fatalf("len(got) = %d, want 2", len(got))
	}
	if got[0].ProbabilityBps != 6000 || got[1].ProbabilityBps != 4000 {
		t.Fatalf("unexpected probabilities: %#v", got)
	}
	if got[0].MultiplierBps != 16666 || got[1].MultiplierBps != 25000 {
		t.Fatalf("unexpected multipliers: %#v", got)
	}
}

func TestProbabilityPointNeededOnlyWhenProbabilitiesChange(t *testing.T) {
	prev := []projectionOutcomeState{
		{Index: 0, PoolAmount: big.NewInt(60), ProbabilityBps: 6000},
		{Index: 1, PoolAmount: big.NewInt(40), ProbabilityBps: 4000},
	}

	same := []projectionOutcomeState{
		{Index: 0, PoolAmount: big.NewInt(90), ProbabilityBps: 6000},
		{Index: 1, PoolAmount: big.NewInt(60), ProbabilityBps: 4000},
	}
	if probabilityPointNeeded(prev, same) {
		t.Fatal("expected unchanged probabilities to skip probability point append")
	}

	changed := []projectionOutcomeState{
		{Index: 0, PoolAmount: big.NewInt(70), ProbabilityBps: 7000},
		{Index: 1, PoolAmount: big.NewInt(30), ProbabilityBps: 3000},
	}
	if !probabilityPointNeeded(prev, changed) {
		t.Fatal("expected changed probabilities to append probability point")
	}
}
