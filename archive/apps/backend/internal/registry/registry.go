package registry

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"retropick/apps/backend/internal/registrydata"
)

type Explorers struct {
	Basescan   string `json:"basescan"`
	Blockscout string `json:"blockscout"`
}

type Contracts struct {
	MarketEngineProxy            string `json:"marketEngineProxy"`
	MarketEngineImplementation   string `json:"marketEngineImplementation"`
	FeeRouter                    string `json:"feeRouter"`
	TreasuryVault                string `json:"treasuryVault"`
	RewardsVault                 string `json:"rewardsVault"`
	CommunityPool                string `json:"communityPool"`
	StakeToken                   string `json:"stakeToken"`
	TokenFaucet                  string `json:"tokenFaucet"`
	ChainlinkAdapter             string `json:"chainlinkAdapter"`
	RateAdapter                  string `json:"rateAdapter"`
	SmartDataAdapter             string `json:"smartDataAdapter"`
	MacroAdapter                 string `json:"macroAdapter"`
	EquityAdapter                string `json:"equityAdapter"`
	AdminModule                  string `json:"adminModule"`
	ViewModule                   string `json:"viewModule"`
	UserOpsClaimsModule          string `json:"userOpsClaimsModule"`
	CoreLifecycleModule          string `json:"coreLifecycleModule"`
	RollingLifecycleModule       string `json:"rollingLifecycleModule"`
}

type TokenMetadata struct {
	StakeTokenSymbol   string `json:"stakeTokenSymbol"`
	StakeTokenDecimals int    `json:"stakeTokenDecimals"`
}

type Registry struct {
	Environment   string            `json:"environment"`
	ChainID       int64             `json:"chainId"`
	Explorers     Explorers         `json:"explorers"`
	Contracts     Contracts         `json:"contracts"`
	TokenMetadata TokenMetadata     `json:"tokenMetadata"`
	AbiFiles      map[string]string `json:"abiFiles"`
}

func LoadEmbedded() (*Registry, error) {
	var r Registry
	if err := json.Unmarshal(registrydata.RegistryJSON, &r); err != nil {
		return nil, fmt.Errorf("registry json: %w", err)
	}
	return &r, nil
}

// LoadFromFile reads a contract registry JSON file (e.g. packages/contracts/registry.celo-alfajores.json).
func LoadFromFile(path string) (*Registry, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("registry file %q: %w", path, err)
	}
	var r Registry
	if err := json.Unmarshal(raw, &r); err != nil {
		return nil, fmt.Errorf("registry json %q: %w", path, err)
	}
	return &r, nil
}

// Load uses REGISTRY_PATH when set; otherwise returns the embedded Base Sepolia registry.
func Load(registryPath string) (*Registry, error) {
	path := strings.TrimSpace(registryPath)
	if path == "" {
		return LoadEmbedded()
	}
	return LoadFromFile(path)
}

// TreasuryAddresses returns V3 treasury contract addresses required for Alfajores demo.
func (r *Registry) TreasuryAddresses() (marketEngine, feeRouter, treasuryVault, rewardsVault, communityPool string) {
	if r == nil {
		return "", "", "", "", ""
	}
	c := r.Contracts
	return c.MarketEngineProxy, c.FeeRouter, c.TreasuryVault, c.RewardsVault, c.CommunityPool
}

// ValidateTreasuryDeployed returns an error when any V3 treasury address is zero/placeholder.
func ValidateTreasuryDeployed(r *Registry) error {
	if r == nil {
		return fmt.Errorf("registry is nil")
	}
	me, fr, tv, rv, cp := r.TreasuryAddresses()
	missing := make([]string, 0, 5)
	if !isNonZeroAddress(me) {
		missing = append(missing, "marketEngineProxy")
	}
	if !isNonZeroAddress(fr) {
		missing = append(missing, "feeRouter")
	}
	if !isNonZeroAddress(tv) {
		missing = append(missing, "treasuryVault")
	}
	if !isNonZeroAddress(rv) {
		missing = append(missing, "rewardsVault")
	}
	if !isNonZeroAddress(cp) {
		missing = append(missing, "communityPool")
	}
	if len(missing) > 0 {
		return fmt.Errorf("registry %q has placeholder treasury addresses: %s", r.Environment, strings.Join(missing, ", "))
	}
	return nil
}

func isNonZeroAddress(value string) bool {
	value = strings.TrimPrefix(strings.ToLower(strings.TrimSpace(value)), "0x")
	if len(value) != 40 {
		return false
	}
	for _, c := range value {
		if !strings.ContainsRune("0123456789abcdef", c) {
			return false
		}
	}
	return value != strings.Repeat("0", 40)
}
