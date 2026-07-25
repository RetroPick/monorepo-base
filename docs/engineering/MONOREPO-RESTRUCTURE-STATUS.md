# Monorepo restructure — recovery status

**Last updated:** 2026-07-24  
**Context:** R0–R3 work was done in agent sessions; chat context was lost but **files on disk remain**. Nothing from this effort is committed yet.

## Done on disk

### Phase R0 — folder skeleton
| Item | Status |
|------|--------|
| `apps/fe-v1` → `apps/web` | Done |
| `apps/ops` → `apps/ops-web` | Done |
| `apps/retropick-landing` → `apps/landing-web` | Done |
| `RetroPick-Android` → `apps/android` | Done |
| `package/prediction-v2` → `contracts/legacy-pool-v1` | Done |
| `deploy/`, `archive/`, `schemas/` | Created |
| `docs/ARCHITECTURE.md`, ADR-R0 | Done |
| Path updates (CI, docker, scripts) | Done |

### Phase R1 — legacy quarantine
| Item | Status |
|------|--------|
| `internal/domain` → `internal/legacy/domain` | Done |
| Epoch TS packages → `packages/legacy/*` | Done |
| `apps/web/src/products/{markets,prism,legacy}` | Done |
| `NEXT_PUBLIC_PRODUCT` gating | Done |
| ADR-R1 | Done |

### Phase R2 — Markets BFF stub
| Item | Status |
|------|--------|
| `internal/markets/` Go handlers | Done |
| `markets.RegisterRoutes` in `cmd/api/main.go` | Done |
| `schemas/openapi/markets-v1.yaml` | Done |
| `@retropick/polymarket` package | Done |
| Web Markets home + API hooks | Done |
| ADR-R2 | Done |

### Phase R3 — legacy API migration + Gamma catalog
| Item | Status |
|------|--------|
| Epoch routes → `/api/v1/legacy/markets/*` | Done |
| Web `retropickApi.ts` legacy path update | Done |
| `internal/markets/gamma` client | Done |
| `ListEvents` wired to Gamma (`MARKETS_GAMMA_API_URL`) | Done |
| Markets home shows catalog rows | Done |
| ADR-R3 | Done |

## Not started

| Item | Notes |
|------|-------|
| `docs/markets-v1/` tree (~80 docs) | Original master prompt; separate large effort |
| Deprecated aliases at old `/api/v1/markets` epoch paths | Optional; documented as breaking in ADR-R3 |
| Physical move of `src/features/*` into `products/legacy/` | Incremental |
| Trading / CLOB / geoblock eligibility | Post-R3 |

## Git state warning

- **~79k `git status` lines** — mostly untracked `node_modules` under moved apps. Do **not** `git add .` blindly.
- Many R0–R3 files show as `??` (untracked) — need selective `git add` when you commit.
- Large `.dev/` deletions in index — review before commit (may be intentional cleanup).

## Verify locally

```bash
pnpm install
pnpm --filter web typecheck
pnpm --filter web test
pnpm contracts:build
go -C apps/backend test ./internal/markets/...
```

## Product modes (web)

```bash
pnpm dev:web                              # legacy default (/app/*)
NEXT_PUBLIC_PRODUCT=markets pnpm dev:web  # /markets only
```

## Key paths

- Architecture: [ARCHITECTURE.md](../ARCHITECTURE.md)
- ADRs: [adr/](adr/)
- Markets OpenAPI: [schemas/openapi/markets-v1.yaml](../../schemas/openapi/markets-v1.yaml)
- Android: [apps/android](../../apps/android)

### Phase R4 — legacy archived
| Item | Status |
|------|--------|
| Move epoch code to `archive/` | Done |
| Markets-only API + web default | Done |
| ADR-R4 | Done |
