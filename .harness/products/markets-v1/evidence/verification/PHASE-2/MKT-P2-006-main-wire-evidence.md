# MKT-P2-006 — Main wire ClobVenueSource — Evidence

**Date:** 2026-08-09  
**Agent:** Chat B  
**Task:** MKT-P2-006 G3 main wiring  
**Depends on:** [MKT-P2-006-venue-evidence.md](./MKT-P2-006-venue-evidence.md); `walletCfg.Discoverer` from Postgres wallet glue

## Summary

Both Markets BFF entrypoints mount eligible `/me/balances` via `balances.NewProductionHandlerConfig`, wiring live `ClobVenueSource` with the existing `walletCfg.Discoverer` and `UnwiredL2CredentialStore{}`. Linked wallets receive **502** `upstream_unavailable` until L2 auth persistence lands (fail-closed; never invents balances).

## Verification commands

| Command | Result |
|---------|--------|
| `go test ./internal/markets/balances/... -count=1` | Pass |
| `go build ./cmd/markets-api ./cmd/api` | Pass (`BUILD_OK`) |

Working directory: `apps/backend` (Go 1.25.0).

## Changed paths

| Path | Change |
|------|--------|
| `apps/backend/cmd/markets-api/main.go` | Balances registrar → `NewProductionHandlerConfig` (`cfg.CLOBAPIURL`) |
| `apps/backend/cmd/api/main.go` | Balances registrar → `NewProductionHandlerConfig` (`cfg.MarketsCLOBAPIURL`) |

Registrar shape (both mains; Discoverer shared with wallet routes):

```go
balances.RegisterRoutes(r, balances.NewProductionHandlerConfig(balances.ProductionConfig{
	Discoverer: walletCfg.Discoverer,
	CLOBURL:    <cfg CLOB URL>,
	L2Store:    balances.UnwiredL2CredentialStore{},
}))
```

## Explicit non-goals

- No L2 credential fetch / persistence
- No funding UI
- No health endpoint changes (Chat A)
- No edits under `internal/markets/balances/`

## Handoff

| Owner | Next step |
|-------|-----------|
| L2 auth | Swap `L2Store` from `UnwiredL2CredentialStore{}` when server-held L2 HMAC creds persist |
| MKT-P2-007 | Exit gate: eligibility + funding foundations; no order submit |

## Sign-off

- [x] Both mains use `NewProductionHandlerConfig` + `walletCfg.Discoverer`
- [x] `L2Store` remains unwired (502 fail-closed OK)
- [x] `go test` + `go build` green
- [x] No secrets in artifact
