package registry

import (
	"encoding/json"
	"fmt"

	"retropick/apps/backend/internal/registrydata"
)

type Explorers struct {
	Basescan   string `json:"basescan"`
	Blockscout string `json:"blockscout"`
}

type Contracts struct {
	MarketEngineProxy            string `json:"marketEngineProxy"`
	MarketEngineImplementation   string `json:"marketEngineImplementation"`
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
