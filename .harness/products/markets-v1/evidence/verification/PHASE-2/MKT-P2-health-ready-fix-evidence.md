# MKT-P2 — Health/ready typed-nil panic fix — Evidence

**Date:** 2026-08-09  
**Agent:** Chat A  
**Task:** Smoke `/health/ready` + `/capabilities` nil panic when market data / realtime unwired

## Summary

Fixed Go typed-nil panic: `main` assigns `var rtRuntime *realtime.Runtime` (nil) into `RealtimeStateProvider`, so `!= nil` is true and `HealthRealtime` / `Capabilities*` dereferenced a nil receiver. Dev stack (`MARKETS_MARKET_DATA_ENABLED=0`, realtime default off) hit this on every ready/capabilities probe.

## Root cause

| Layer | Behavior |
|-------|----------|
| Compose | `MARKETS_MARKET_DATA_ENABLED=0`; `MARKETS_REALTIME_ENABLED` unset → runtime never constructed |
| `cmd/markets-api/main.go` | `RealtimeState: rtRuntime` with typed-nil `*Runtime` |
| Call sites | Interface nil check passes → method call panics on `r.Status` |
| Smoke | HTTP 500 / non-JSON → fail |

## Fix

| Path | Change |
|------|--------|
| `apps/backend/internal/markets/realtime/runtime.go` | Nil-safe `Operational`, `CapabilitiesRealtime`, `CapabilitiesLiveSignals`, `HealthRealtime` (`"disabled"`), `SetRegistryReady` |
| `apps/backend/internal/markets/health.go` | `isNilRealtimeState` reflect guard before `HealthRealtime()` |
| `apps/backend/internal/markets/realtime/runtime_nil_test.go` | Nil receiver / nil Status tests |
| `apps/backend/internal/markets/health_test.go` | `TestReadinessTypedNilRealtimeRuntime` (local typed-nil stub; avoids import cycle) |

## Verification commands

| Command | Result |
|---------|--------|
| `go -C apps/backend test ./internal/markets/realtime/... ./internal/markets/ -run 'TestReadiness\|TestRuntimeNil' -count=1` | Pass — see [MKT-P2-health-ready-fix-test-output.txt](./MKT-P2-health-ready-fix-test-output.txt) |
| Rebuild `markets-api` via compose `--build` | Pass |
| `GET /api/v1/health/ready` | HTTP 200; `checks.realtime=disabled`, `marketData=disabled` |
| `GET /api/v1/markets/capabilities` | HTTP 200; `features.realtime=false` |
| `pnpm smoke:markets-stack` | Pass (live, ready, capabilities, events) |
| `graphify update .` | Pass |

## Live ready body (post-fix)

```json
{"ok":true,"degraded":true,"service":"retropick-markets-api","checks":{"catalogProjection":"ok","catalogWorker":"degraded","database":"ok","marketData":"disabled","realtime":"disabled","signals":"ok"}}
```

## Out of scope (honored)

- `main.go` assignment cleanup (optional; not required)
- Wallet, balances venue, OpenAPI, web
- `current_phase` advance

## Handoff

Chat S (P2-007 exit) can treat health/ready + capabilities smoke as unblocked for this panic.
