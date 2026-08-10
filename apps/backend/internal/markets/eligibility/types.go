package eligibility

import "time"

// Stable API-facing reason codes for EligibilityResponse.reason.
const (
	ReasonMaintenanceMode            = "maintenance_mode"
	ReasonGeoUnknown                   = "geo_unknown"
	ReasonRegionBlocked              = "region_blocked"
	ReasonGeoblockDenied               = "geoblock_denied"
	ReasonGeoblockUpstreamUnavailable  = "geoblock_upstream_unavailable"
	ReasonGeoblockTimeout            = "geoblock_timeout"
	ReasonSanctionsBlocked           = "sanctions_blocked"
	ReasonAccountSuspended           = "account_suspended"
	ReasonTermsNotAccepted           = "terms_not_accepted"
)

// AccountStanding reflects session user state when auth middleware provides it.
type AccountStanding string

const (
	AccountStandingActive    AccountStanding = "active"
	AccountStandingSuspended AccountStanding = "suspended"
	AccountStandingBanned    AccountStanding = "banned"
)

// AccountContext is optional session context wired by auth middleware (MKT-P2-001).
type AccountContext struct {
	UserID                 string
	Standing               AccountStanding
	TermsVersionAccepted   string
	RequiredTermsVersion   string
	SanctionsScreeningHit  bool
}

// Input carries trusted server-side signals for eligibility evaluation.
type Input struct {
	ClientIP string
	Account  *AccountContext
}

// Decision is the evaluator output mapped to OpenAPI EligibilityResponse.
type Decision struct {
	Eligible  bool
	Reason    string
	Region    string
	CheckedAt time.Time
}

// FailClosed returns a deny decision with the given reason and timestamp.
func FailClosed(reason string, checkedAt time.Time) Decision {
	return Decision{
		Eligible:  false,
		Reason:    reason,
		CheckedAt: checkedAt.UTC(),
	}
}
