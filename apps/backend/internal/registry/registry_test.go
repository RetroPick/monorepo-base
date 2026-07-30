package registry

import (
	"path/filepath"
	"testing"
)

func TestValidateTreasuryDeployed_rejectsPlaceholders(t *testing.T) {
	t.Parallel()
	path := filepath.Join("testdata", "placeholder-alfajores.json")
	reg, err := LoadFromFile(path)
	if err != nil {
		t.Fatalf("LoadFromFile: %v", err)
	}
	if err := ValidateTreasuryDeployed(reg); err == nil {
		t.Fatal("expected placeholder alfajores registry to fail validation")
	}
}

func TestValidateTreasuryDeployed_acceptsPopulated(t *testing.T) {
	t.Parallel()
	reg := &Registry{
		Environment: "test",
		Contracts: Contracts{
			MarketEngineProxy: "0x1111111111111111111111111111111111111111",
			FeeRouter:         "0x2222222222222222222222222222222222222222",
			TreasuryVault:     "0x3333333333333333333333333333333333333333",
			RewardsVault:      "0x4444444444444444444444444444444444444444",
			CommunityPool:     "0x5555555555555555555555555555555555555555",
		},
	}
	if err := ValidateTreasuryDeployed(reg); err != nil {
		t.Fatalf("expected populated registry to pass: %v", err)
	}
}
