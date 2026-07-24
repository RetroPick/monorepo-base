# RetroPick opensrc Reference Rules

RetroPick already has:
- On-chain MarketEngine with oracle-driven epoch lifecycle.
- Go backend with indexer, keeper, price-worker, funding-worker, alert, and reporter services.
- Postgres projections and durable realtime events.
- WebSocket fanout from Postgres NOTIFY.
- Next/React frontends with wallet writes and indexed API reads.
- pnpm plus Turborepo monorepo tooling.

External repositories are references, not replacement architecture.

## Pack Selection

Use focused packs:
- `.ai/opensrc-monorepo-pack.txt` for workspace, Turbo, pnpm, linting, and versioning.
- `.ai/opensrc-backend-pack.txt` for Go backend, Postgres, API, jobs, and observability.
- `.ai/opensrc-frontend-pack.txt` for Next.js, React Query, wallet UX, ops UI, and tests.
- `.ai/opensrc-contracts-pack.txt` for Solidity, UUPS, storage layout, invariants, and security.
- `.ai/opensrc-protocol-pack.txt` for prediction market protocol research.
- `.ai/opensrc-ai-pack.txt` for assistant, MCP, and analytics work.

Do not use the full pack unless the task is broad architecture research.

## Rules Before Editing

Before editing backend boundaries:
- Inspect `ThreeDotsLabs/wild-workouts-go-ddd-example`.
- Inspect `go-chi/chi`, `jackc/pgx`, `sqlc-dev/sqlc`, and `riverqueue/river`.
- Keep domain packages separated. Domain modules should not import each other directly.

Before editing API or SDK surfaces:
- Inspect `oapi-codegen/oapi-codegen`.
- Inspect `openapi-ts/openapi-typescript`.
- Prefer generated OpenAPI types over hand-maintained duplicate DTOs.

Before editing frontend:
- Inspect `TanStack/query` for server-state and invalidation.
- Inspect `wevm/viem` and `wevm/wagmi` for wallet and contract writes.
- UI default reads must come from indexed API, not live RPC.

Before editing ops dashboards:
- Inspect `TanStack/table`, `react-hook-form`, `zod`, `shadcn-ui/ui`, and `radix-ui/primitives`.
- Dangerous ops actions must follow prepare -> simulate -> confirm -> log.

Before editing contracts:
- Inspect OpenZeppelin upgradeable repos.
- Inspect Foundry, Slither, and Echidna references.
- Do not change storage layout without storage-layout CI and invariant tests.

Before editing market or protocol design:
- Inspect Polymarket CTF Exchange only for signing and settlement lessons.
- Inspect Gnosis Conditional Tokens for outcome primitives.
- Inspect UMA and Reality.eth for resolution and dispute workflows.
- Do not copy Polymarket CLOB into RetroPick v1.

## Useful Commands

```bash
opensrc path vercel/next.js
opensrc path Polymarket/ctf-exchange-v2
opensrc path sqlc-dev/sqlc

./scripts/opensrc-rg.sh Polymarket/ctf-exchange-v2 EIP712
./scripts/opensrc-rg.sh vercel/ai useChat
./scripts/opensrc-rg.sh TanStack/query invalidateQueries
./scripts/opensrc-rg.sh riverqueue/river "INSERT"
./scripts/opensrc-rg.sh OpenZeppelin/openzeppelin-contracts-upgradeable UUPSUpgradeable
```
