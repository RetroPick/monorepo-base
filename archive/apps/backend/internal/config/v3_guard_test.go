package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoad_rejectsV3FlagsWithPlaceholderRegistry(t *testing.T) {
	root := filepath.Join("..", "..", "..", "..")
	registryPath := filepath.Join(root, "packages", "contracts", "registry.celo-alfajores.json")

	t.Setenv("DATABASE_URL", "postgres://retropick:retropick@127.0.0.1:5432/retropick?sslmode=disable")
	t.Setenv("RPC_URL", "https://alfajores-forno.celo-testnet.org")
	t.Setenv("ENVIRONMENT", "development")
	t.Setenv("REGISTRY_PATH", registryPath)
	t.Setenv("GOODDOLLAR_ENABLED", "1")
	t.Setenv("FEE_ROUTER_ENABLED", "0")
	t.Setenv("REFERRALS_ENABLED", "0")
	t.Setenv("REWARDS_ENABLED", "0")
	t.Setenv("IMPACT_ENABLED", "0")

	_, err := Load()
	if err == nil {
		t.Fatal("expected Load to fail when GOODDOLLAR_ENABLED=1 with placeholder registry")
	}
}

func TestLoad_allowsV3FlagsOffWithPlaceholderRegistry(t *testing.T) {
	root := filepath.Join("..", "..", "..", "..")
	registryPath := filepath.Join(root, "packages", "contracts", "registry.celo-alfajores.json")

	t.Setenv("DATABASE_URL", "postgres://retropick:retropick@127.0.0.1:5432/retropick?sslmode=disable")
	t.Setenv("RPC_URL", "https://sepolia.base.org")
	t.Setenv("ENVIRONMENT", "development")
	t.Setenv("REGISTRY_PATH", registryPath)
	os.Unsetenv("GOODDOLLAR_ENABLED")
	os.Unsetenv("FEE_ROUTER_ENABLED")
	os.Unsetenv("REFERRALS_ENABLED")
	os.Unsetenv("REWARDS_ENABLED")
	os.Unsetenv("IMPACT_ENABLED")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.anyV3Enabled() {
		t.Fatal("expected V3 flags off by default")
	}
}
