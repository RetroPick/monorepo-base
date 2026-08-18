package config

import (
	appconfig "retropick/apps/backend/internal/config"
)

// Config re-exports the application config for platform/domain wiring.
type Config = appconfig.Config

// Load loads environment configuration.
func Load() (*Config, error) {
	return appconfig.Load()
}

// FeatureFlags holds V3 feature toggles.
type FeatureFlags struct {
	GoodDollarEnabled bool
	FeeRouterEnabled  bool
	ReferralsEnabled  bool
	RewardsEnabled    bool
	ImpactEnabled     bool
}

// FeatureFlagsFrom loads feature flags from config env.
func FeatureFlagsFrom(cfg *Config) FeatureFlags {
	return FeatureFlags{
		GoodDollarEnabled: cfg.GoodDollarEnabled,
		FeeRouterEnabled:  cfg.FeeRouterEnabled,
		ReferralsEnabled:  cfg.ReferralsEnabled,
		RewardsEnabled:    cfg.RewardsEnabled,
		ImpactEnabled:     cfg.ImpactEnabled,
	}
}
