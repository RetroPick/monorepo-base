package eligibility

import (
	"context"
	"errors"
	"time"

	"retropick/apps/backend/internal/markets/eligibility/geo"
	"retropick/apps/backend/internal/markets/eligibility/geoblock"
)

// Evaluator runs ordered eligibility checks fail-closed.
type Evaluator struct {
	Rules     RulePack
	Geo       geo.Resolver
	Geoblock  geoblock.Checker
	Metrics   Recorder
	Now       func() time.Time
}

// DefaultEvaluator wires BLK-001-safe defaults: unwired geo and geoblock, deny-all.
func DefaultEvaluator() *Evaluator {
	return &Evaluator{
		Rules:    DefaultRulePack(),
		Geo:      geo.UnwiredResolver{},
		Geoblock: geoblock.UnwiredChecker{},
		Metrics:  NopRecorder{},
		Now:      time.Now,
	}
}

// GeoblockFromEnv returns HTTPChecker when MARKETS_GEOBLOCK_BASE_URL is set, else UnwiredChecker.
func GeoblockFromEnv() geoblock.Checker {
	return geoblock.CheckerFromEnv()
}

// EvaluatorWithGeoblock wires geo and geoblock checkers for integration tests or service injection.
func EvaluatorWithGeoblock(resolver geo.Resolver, checker geoblock.Checker) *Evaluator {
	return &Evaluator{
		Rules:    DefaultRulePack(),
		Geo:      resolver,
		Geoblock: checker,
		Metrics:  NopRecorder{},
		Now:      time.Now,
	}
}

func (e *Evaluator) nowUTC() time.Time {
	if e.Now != nil {
		return e.Now().UTC()
	}
	return time.Now().UTC()
}

// Check evaluates eligibility for the given input and returns a decision.
func (e *Evaluator) Check(ctx context.Context, in Input) Decision {
	checkedAt := e.nowUTC()

	if e.Rules.MaintenanceMode {
		return e.deny(ReasonMaintenanceMode, "", checkedAt)
	}

	loc, err := e.Geo.Resolve(ctx, in.ClientIP)
	if err != nil {
		if errors.Is(err, geo.ErrUnknown) {
			return e.deny(ReasonGeoUnknown, "", checkedAt)
		}
		return e.deny(ReasonGeoUnknown, "", checkedAt)
	}

	if e.Rules.regionBlocked(loc.RegionCode) {
		return e.deny(ReasonRegionBlocked, loc.RegionCode, checkedAt)
	}

	geoResult, err := e.Geoblock.Check(ctx, in.ClientIP, loc.RegionCode)
	if err != nil {
		switch {
		case errors.Is(err, geoblock.ErrUnwired):
			return e.deny(ReasonGeoblockUpstreamUnavailable, loc.RegionCode, checkedAt)
		case errors.Is(err, geoblock.ErrTimeout):
			return e.deny(ReasonGeoblockTimeout, loc.RegionCode, checkedAt)
		default:
			return e.deny(ReasonGeoblockTimeout, loc.RegionCode, checkedAt)
		}
	}
	if !geoResult.Allowed {
		return e.deny(ReasonGeoblockDenied, loc.RegionCode, checkedAt)
	}

	if e.Rules.SanctionsEnabled && in.Account != nil && in.Account.SanctionsScreeningHit {
		return e.deny(ReasonSanctionsBlocked, loc.RegionCode, checkedAt)
	}

	if in.Account != nil {
		switch in.Account.Standing {
		case AccountStandingSuspended, AccountStandingBanned:
			return e.deny(ReasonAccountSuspended, loc.RegionCode, checkedAt)
		}
		required := in.Account.RequiredTermsVersion
		if required == "" {
			required = e.Rules.RequiredTermsVersion
		}
		if required != "" && in.Account.TermsVersionAccepted != required {
			return e.deny(ReasonTermsNotAccepted, loc.RegionCode, checkedAt)
		}
	}

	return Decision{
		Eligible:  true,
		Region:    loc.RegionCode,
		CheckedAt: checkedAt,
	}
}

func (e *Evaluator) deny(reason, region string, checkedAt time.Time) Decision {
	if e.Metrics != nil {
		e.Metrics.RecordFailClosed(reason)
	}
	d := FailClosed(reason, checkedAt)
	d.Region = region
	return d
}
