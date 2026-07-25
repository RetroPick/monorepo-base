# RetroPick Markets V1 — Documentation and Agent Harness

**Status:** active baseline  
**Canonical location:** `.dev/markets-v1/`  
**Pointer:** [docs/markets-v1/README.md](../../docs/markets-v1/README.md)

## What this is

Implementation-grade documentation and machine-readable agent harness for **RetroPick Markets V1**: a Polymarket-native product delivered through web, Go backend, and native Android (Kotlin + Jetpack Compose).

This tree is **documentation only**. Product code lives under `apps/`, `packages/`, `schemas/`.

## Executive summary

- [EXECUTIVE_OUTCOME.md](EXECUTIVE_OUTCOME.md) — architecture recommendation, blockers, first phase
- [agent-harness/INVARIANT_CHECK.md](agent-harness/INVARIANT_CHECK.md) — §23 cross-doc verification

## How agents use this

1. Read [00_DOCUMENT_MAP.md](00_DOCUMENT_MAP.md) for the full index.
2. Read [agent-harness/AGENT_OPERATING_CONTRACT.md](agent-harness/AGENT_OPERATING_CONTRACT.md) before any implementation task.
3. Check [agent-harness/implementation-manifest.yaml](agent-harness/implementation-manifest.yaml) for `current_phase`.
4. Pick a task from [agent-harness/task-graph.yaml](agent-harness/task-graph.yaml).
5. Follow the relevant phase spec in [phases/](phases/).

## Category index

| Category | Location |
|----------|----------|
| PRD | `01_`–`05_` top-level, `intelligence/` |
| Architecture | `architecture/`, `polymarket/`, `backend/` |
| Design | `web/`, `android/` |
| Rules | `agent-harness/`, `security/` |
| Schemas | `research/*.yaml`, `schemas/openapi/markets-v1.yaml` (repo root) |
| Production flow | `platform/`, `phases/`, `testing/` |

## Product boundaries

- **Markets V1** integrates Polymarket; does not issue RetroPick outcome tokens.
- **PRISM** is a separate product; out of scope except boundary statements.
- **Legacy epoch v1** is frozen at `/api/v1/legacy/markets/*`.

## Android build prompt

- [apps/android/.dev/BUILD_SESSION_PROMPT.md](../../apps/android/.dev/BUILD_SESSION_PROMPT.md) — copy into next Cursor session to scaffold the app

## Related repo docs

- [.dev/MARKETS.md](../MARKETS.md) — product architecture baseline
- [.dev/ANDROID_MARKETS.md](../ANDROID_MARKETS.md) — Android scope
- [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) — monorepo layout (R0–R3)
