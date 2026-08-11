package auth

import (
	"context"
	"time"

	"retropick/apps/backend/internal/markets/eligibility"
)

// EligibilityChecker evaluates jurisdiction eligibility fail-closed.
type EligibilityChecker interface {
	Check(ctx context.Context, in eligibility.Input) eligibility.Decision
}

// Module wires Markets session auth, SIWE, and middleware dependencies.
type Module struct {
	cfg       Config
	nonces    *NonceStore
	users     UserStore
	limiter   *RateLimiter
	evaluator EligibilityChecker
	ipTrust   eligibility.IPTrustOptions
	now       func() time.Time
}

// ModuleConfig configures a new auth Module.
type ModuleConfig struct {
	Config    Config
	Users     UserStore
	Evaluator EligibilityChecker
	IPTrust   eligibility.IPTrustOptions
	Now       func() time.Time
}

// NewModule constructs the Markets auth module.
func NewModule(cfg ModuleConfig) *Module {
	now := time.Now
	if cfg.Now != nil {
		now = cfg.Now
	}
	users := cfg.Users
	if users == nil {
		users = NewMemoryUserStore()
	}
	return &Module{
		cfg:       cfg.Config,
		nonces:    NewNonceStore(cfg.Config.NonceTTL, now),
		users:     users,
		limiter:   NewRateLimiter(cfg.Config.AuthRateLimit, cfg.Config.AuthRateWindow, now),
		evaluator: cfg.Evaluator,
		ipTrust:   cfg.IPTrust,
		now:       now,
	}
}

func (m *Module) Config() Config {
	return m.cfg
}

func (m *Module) nowUTC() time.Time {
	return m.now().UTC()
}
