# RetroPick documentation map

- [Monorepo architecture](ARCHITECTURE.md) — product lines and folder layout (R0 restructure)


Start here instead of searching scattered folders.

## Onboarding path

1. [README.md](../README.md) — monorepo setup, smoke tests
2. [DECISIONS.md](../DECISIONS.md) — architectural gates
3. [PRODUCTION.md](../PRODUCTION.md) — supported deploy shapes and cost policy

## By area

| Area | Canonical docs |
|------|----------------|
| **Unified architecture (cross-stack)** | [`.dev/.AllArchitecture.md`](../.dev/.AllArchitecture.md) — master hub with flowcharts and component taxonomy; AI companions: [`.AllArchitecture.json`](../.dev/.AllArchitecture.json), [`knowledge-graph.json`](../.dev/knowledge-graph.json) |
| **Smart contracts** | [`contracts/legacy-pool-v1/currentSmartContract.md`](../contracts/legacy-pool-v1/currentSmartContract.md), [`.operator/`](../contracts/legacy-pool-v1/.operator/), [OPERATIONS_INDEX.md](../contracts/legacy-pool-v1/OPERATIONS_INDEX.md) |
| **Backend (as-built)** | [`.dev/backend/README.md`](../.dev/backend/README.md) → `code/*` |
| **System primer** | [`technical/current-implementation/`](technical/current-implementation/) — cross-stack overview; full graph → `.dev/.AllArchitecture.md` |
| **Public product site** | [`apps/docs/`](../apps/docs/) (MDX, port 3002) |
| **User frontend** | [`apps/web/README.md`](../apps/web/README.md), [`apps/web/docs/performance-verification.md`](../apps/web/docs/performance-verification.md) |
| **Deploy** | [`vps-deploy.md`](vps-deploy.md), [`vercel-and-api-deployment.md`](vercel-and-api-deployment.md) |
| **Operator workflows** | [`feature/README.md`](feature/README.md) — ops dashboard + backend surface |
| **Market operations** | [`product/market-types.md`](product/market-types.md), [`product/trusted-reporter.md`](product/trusted-reporter.md), [`product/smart-contract-model-grill.md`](product/smart-contract-model-grill.md) |
| **Harness / agents** | [`HARNESS.md`](../HARNESS.md), [`AGENTS.md`](../AGENTS.md), [`.harness/agents/`](../.harness/agents/) |
| **Upgrade V3** | [`upgrade-v3/`](upgrade-v3/) — foundation + GoodDollar integration program |
| **ABI registry** | [`.dev/abi-map.md`](../.dev/abi-map.md) |

## Archive

Design packs and non-production experiments: [`archive/README.md`](archive/README.md). Do not treat `docs/feature/abstractionLayer`, `updateBackend`, or `marketing+Incentives+growth` as current — they live only under `archive/`.

## Path aliases

- **Canonical contract path:** `contracts/legacy-pool-v1` (see DECISIONS D9). Legacy `package/smart-contract` and `package/contract` aliases were removed.
