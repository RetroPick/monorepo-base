package markets

import (
	"github.com/go-chi/chi/v5"

	"retropick/apps/backend/internal/markets/auth"
	"retropick/apps/backend/internal/markets/wallet"
)

// EligibleMeRouteRegistrar mounts routes under /me that require eligibility.
type EligibleMeRouteRegistrar func(r chi.Router)

// EligibleMarketRouteRegistrar mounts routes under /api/v1/markets (outside /me) that require auth + eligibility.
type EligibleMarketRouteRegistrar func(r chi.Router)

// RouteDeps supplies optional infrastructure wiring for Markets HTTP routes.
// Zero value keeps wallet discovery unwired (empty lists, link 503) for tests.
type RouteDeps struct {
	Wallet wallet.HandlerConfig
}

// RegisterRoutes mounts Polymarket Markets BFF routes on the parent router.
// Static paths must be registered before archived epoch API/{templateId} routes.
// Pass registerEligibleMeRoutes from main to mount transactional /me routes (e.g. balances)
// without importing subpackages that depend on markets (import-cycle safe).
func RegisterRoutes(r chi.Router, h *Handler, authMod *auth.Module, registerEligibleMeRoutes ...EligibleMeRouteRegistrar) {
	RegisterRoutesWithDeps(r, h, authMod, RouteDeps{}, registerEligibleMeRoutes...)
}

// RegisterRoutesWithDeps mounts Markets routes with optional wallet store wiring.
func RegisterRoutesWithDeps(
	r chi.Router,
	h *Handler,
	authMod *auth.Module,
	deps RouteDeps,
	registerEligibleMeRoutes ...EligibleMeRouteRegistrar,
) {
	RegisterRoutesWithDepsAndMarketRoutes(r, h, authMod, deps, registerEligibleMeRoutes, nil)
}

// RegisterRoutesWithDepsAndMarketRoutes mounts Markets routes with optional /me and market-level eligible registrars.
func RegisterRoutesWithDepsAndMarketRoutes(
	r chi.Router,
	h *Handler,
	authMod *auth.Module,
	deps RouteDeps,
	registerEligibleMeRoutes []EligibleMeRouteRegistrar,
	registerEligibleMarketRoutes []EligibleMarketRouteRegistrar,
) {
	if authMod != nil {
		authMod.RegisterRoutes(r)
	}

	walletCfg := deps.Wallet
	if walletCfg.Sessions == nil {
		walletCfg.Sessions = wallet.ContextSessionResolver{}
	}

	r.Route("/api/v1/markets", func(r chi.Router) {
		if authMod != nil {
			r.Use(authMod.OptionalSession)
		}

		r.Get("/eligibility", h.Eligibility)
		r.Get("/capabilities", h.Capabilities)
		r.Get("/intelligence/signals", h.ListSignals)
		r.Get("/events", h.ListEvents)
		r.Get("/events/{eventID}", h.GetEvent)
		r.Get("/markets/{marketID}/orderbook", h.GetOrderBook)
		r.Get("/markets/{marketID}/history", h.GetHistory)
		r.Get("/markets/{marketID}/health", h.GetHealth)
		r.Get("/markets/{marketID}", h.GetMarket)

		if authMod != nil {
			r.Route("/me", func(r chi.Router) {
				r.Use(authMod.RequireAuthenticated)
				wallet.RegisterRoutes(r, walletCfg)
				r.Group(func(r chi.Router) {
					r.Use(authMod.RequireEligible)
					if len(registerEligibleMeRoutes) > 0 && registerEligibleMeRoutes[0] != nil {
						registerEligibleMeRoutes[0](r)
					}
				})
			})

			r.Route("/account-wallet", func(r chi.Router) {
				r.Use(authMod.RequireAuthenticated)
				wallet.RegisterAccountWalletRoutes(r, walletCfg)
			})

			r.Group(func(r chi.Router) {
				r.Use(authMod.RequireAuthenticated, authMod.RequireEligible)
				if len(registerEligibleMarketRoutes) > 0 && registerEligibleMarketRoutes[0] != nil {
					registerEligibleMarketRoutes[0](r)
				}
			})
		}
	})
}
