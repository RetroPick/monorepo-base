# @retropick/gooddollar

Shared TypeScript helpers for RetroPick GoodDollar / Celo integration (chain profiles, G$ token metadata, feature-flag parsing, API adapters).

## Status: PREVIEW

- **Not wired into runtime** — `fe-v1` and `apps/backend` still use their own GoodDollar modules.
- **Alfajores is not staging-live** — no broadcast, registry placeholders remain, V3 flags must stay off.
- Do **not** claim GoodDollar or Alfajores is live based on this package alone.

Integrate explicitly in a follow-up PR (Phase 3C) after operator-approved Alfajores deploy and smoke pass.

## Source of truth

| Concern | Canonical location |
|---------|-------------------|
| Deployed contract addresses | `packages/contracts/registry.celo-alfajores.json` |
| Backend GoodDollar logic | `apps/backend/internal/domain/gooddollar/` |
| Frontend GoodDollar UX | `apps/web/src/features/gooddollar/` |
| RPC for production | Env vars (`RPC_URL`, `CELO_RPC_URL`) — not hardcoded URLs in this package |

`GUSD_TOKENS` Alfajores address is tested against registry `contracts.stakeToken`. Chain `rpcUrl` values are **frontend defaults only**.

## Scripts

```bash
pnpm --filter @retropick/gooddollar typecheck
pnpm --filter @retropick/gooddollar test
```

## Exports

- `chains` — Celo chain IDs and default RPC profiles
- `tokens` — G$ token metadata (registry-aligned on Alfajores)
- `featureFlags` — parse `VITE_*` / backend flag env keys
- `goodid` — `fetchGoodDollarStatus` with explicit error/disabled results (no silent 5xx → unverified)
- `engagementRewards` — prepare-claim API stub (PREVIEW)
