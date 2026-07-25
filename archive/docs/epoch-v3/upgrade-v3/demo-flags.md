# Demo V3 feature flags

Single source of truth for staging vs demo-day flag policy. **Default: all V3 flags off.**

## Rule: do not enable with placeholder registry

If `packages/contracts/registry.celo-alfajores.json` (or `REGISTRY_PATH`) still has `0x000…` for `marketEngineProxy`, `feeRouter`, `treasuryVault`, `rewardsVault`, or `communityPool`:

- Keep **all** V3 API flags off on any public/staging URL.
- Keep `VITE_GOODDOLLAR_ENABLED` off in the frontend build.
- UI should show “Alfajores deployment in progress” — not silent 500s.

API and indexer **fail fast at startup** when any V3 flag is `1` and the active registry has placeholder treasury addresses.

## Backend (API, indexer, rewards-worker)

| Flag | Default | Enable only when |
|------|---------|------------------|
| `GOODDOLLAR_ENABLED` | off (`0`) | Alfajores ME proxy non-zero; migrations ≥ `000015` |
| `REFERRALS_ENABLED` | off | Same + populated registry |
| `REWARDS_ENABLED` | off | Same |
| `IMPACT_ENABLED` | off | Same |
| `FEE_ROUTER_ENABLED` | off | Same + `FEE_ROUTER_ADDRESS` set to live FeeRouter |
| `FEE_ROUTER_ADDRESS` | unset | Post treasury broadcast on Alfajores |
| `REGISTRY_PATH` | unset (embedded Base Sepolia) | Alfajores staging: path to `registry.celo-alfajores.json` after broadcast |
| `CELO_CHAIN_ID` | `44787` | Alfajores profile |
| `CELO_RPC_URL` | Alfajores Forno | Alfajores profile |
| `RPC_URL` | Base Sepolia in compose | Alfajores profile: Alfajores RPC |

Indexer additionally requires `FEE_ROUTER_ADDRESS` when indexing `FeesRouted` logs.

## Frontend (`fe-v1`)

| Flag | Default | Enable only when |
|------|---------|------------------|
| `VITE_GOODDOLLAR_ENABLED` | off | Staging API has matching V3 flags on |

## Operator checklist (before demo)

1. Confirm registry has five non-zero treasury addresses (see `RELEASE_DEMO_RC.md`).
2. Set `REGISTRY_PATH` to the populated Alfajores registry file.
3. Enable backend flags per table above; set `FEE_ROUTER_ADDRESS`.
4. Run migrations: `go run ./cmd/migrator` (or compose `migrator` service).
5. Rebuild/restart API + indexer; verify `GET /api/v1/health`.
6. With flags **off**, `GET /api/v1/gooddollar/status` returns feature-disabled (404).
7. Run `./scripts/demo-alfajores-smoke.sh` and attach `demo-alfajores-smoke.log` to release notes.

## Base Sepolia fallback

Do **not** enable GoodDollar/V3 flags on the default Base Sepolia compose profile unless treasury is explicitly deployed there. Use [`demo-base-sepolia-fallback.md`](./demo-base-sepolia-fallback.md) instead.
