package eligibility

// RulePackVersion identifies the active eligibility config bundle.
const RulePackVersion = "eligibility-rules-v1"

// RulePack holds ops-owned eligibility policy flags and region blocks.
type RulePack struct {
	Version           string
	MaintenanceMode   bool
	SanctionsEnabled  bool
	BlockedRegions    map[string]struct{}
	RequiredTermsVersion string
}

// DefaultRulePack is the in-memory v1 bundle until config service wiring lands.
func DefaultRulePack() RulePack {
	return RulePack{
		Version:              RulePackVersion,
		MaintenanceMode:      false,
		SanctionsEnabled:     false,
		BlockedRegions:       map[string]struct{}{},
		RequiredTermsVersion: "",
	}
}

func (p RulePack) regionBlocked(region string) bool {
	if region == "" {
		return false
	}
	_, blocked := p.BlockedRegions[region]
	return blocked
}
