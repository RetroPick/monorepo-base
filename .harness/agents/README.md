# .harness/agents — Agent Roster

## Active release roster (Markets V1 release factory)

| Agent | Role | Writable | Resource |
|---|---|---|---|
| `rp-release-orchestrator` | Engineering manager + release tech lead; owns DAG/Kanban/gates; NEVER implements | Kanban/task state, `.harness` policy | light |
| `rp-recovery-architect` | Read-only reconciliation: Git, docs, submodules, evidence, baselines | `.harness`, `~/.local/state/retropick-harness` | light |
| `rp-api-contract` | Canonical API contract integrity (Web + Android share it) | `schemas/openapi/markets-v1.yaml`, asyncapi | light–medium |
| `rp-backend-markets` | Shared Go Markets BFF | `apps/backend/cmd/markets-api`, `internal/markets`, authorized migrations | medium/heavy |
| `rp-web` | Web release surface (`apps/web`) | `apps/web/**` | medium/heavy |
| `rp-android` | Android release surface (canonical `RetroPick/RetroPick-Android`) | Android repo (worktree) only | heavy |
| `rp-qa-e2e` | Cross-platform quality gate + parity | `tests/**`, evidence | medium/heavy |
| `rp-sre-release` | VPS/staging/CI/release infra | `docker`, `compose`, `deploy`, `ops`, CI | medium/heavy |
| `rp-review-security` | Security/staff review — READ-ONLY, APPROVE/REJECT | none | light |

## Reference roster (preserved, disabled)

Legacy MarketEngine / epoch / pre-R0 monorepo agents (`be-api`, `be-data`, `be-funding`, `be-indexer`, `be-keeper`, `be-realtime`, `devops-sre`, `docs-curator`, `fe-markets`, `fe-ops`, `fe-wallet`, `harness-librarian`, `orchestrator`, `pkg-abi-registry`, `qa-integration`, `sc-deploy-upgrades`, `sc-market-engine`, `sc-oracles`, `sc-testing`, `security`) are preserved as REFERENCE / DISABLED FOR MARKETS-V1 RELEASE. Do not route Markets V1 release tasks to them.

## Responsibility boundaries

- One writer per writable path (see `products/markets-v1/release/ROUTING.yaml`).
- Reviewer (`rp-review-security`) is read-only and never repairs its own rejection.
- Orchestrator never implements product code.
- Android/Web never bypass the canonical BFF.

## Escalation graph

```
implementation (api-contract, backend-markets, web, android)
        -> qa-e2e
        -> review-security (APPROVE | REJECT)
        -> sre-release (infra/staging)
        -> rp-release-orchestrator (DAG, gates, human approval escalation)
        -> HUMAN (Telegram) for any HUMAN_GATES.yaml boundary
```

## Human gates

See `products/markets-v1/release/HUMAN_GATES.yaml`. On encounter: BLOCK the task; report what is needed, why, exact safe human action, and what resumes afterward.
