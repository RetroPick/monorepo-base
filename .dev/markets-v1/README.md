# RetroPick Markets V1 — Documentation and Agent Harness

**Status:** reviewed (Wave 9 harness complete)
**Last updated:** 2026-07-25
**Canonical location:** `.dev/markets-v1/`
**Pointer:** [docs/markets-v1/README.md](../../docs/markets-v1/README.md)

## Description

This README is the **entry index** for the Markets V1 documentation-only tree under `.dev/markets-v1/`. Use it first to orient on executive outcome, the document map, agent-harness artifacts (`implementation-manifest.yaml`, `task-graph.yaml`, invariant check), wave status, and PHASE-0…PHASE-8 order before touching product code.

It freezes the agent consume sequence (Orient → Contract → Phase → Task → Trace → Spec → Verify → Escalate) so work stays Polymarket-native and harness-gated. Product code lives under `apps/`, `packages/`, and `schemas/` — not in this tree. Wave 9 harness completion is not product-code completion.

**Next hops:** [00_DOCUMENT_MAP.md](00_DOCUMENT_MAP.md) for path inventory; [agent-harness/AGENT_OPERATING_CONTRACT.md](agent-harness/AGENT_OPERATING_CONTRACT.md) before any task; [agent-harness/implementation-manifest.yaml](agent-harness/implementation-manifest.yaml) for live `current_phase`; [phases/](phases/) for phase contracts. Human pointer: [docs/markets-v1/README.md](../../docs/markets-v1/README.md).

## 0. Developer intent (5W+1H)

Short orientation for implementers and agents. Read this before the navigation sections below.

**Documentation convention:** every Markets V1 markdown under `.dev/markets-v1/` starts with `## Description` (prose overview) then `## 0. Developer intent (5W+1H)`, immediately after title and metadata, before the first body heading. Indexes (this README, [00_DOCUMENT_MAP.md](00_DOCUMENT_MAP.md)) are navigation-focused; deep specs carry domain-specific descriptions and 5W+1H tables.

The 5W+1H table below is a **navigation aid** only. It does not replace the agent consumption order, wave table, or phase order in this README; if anything conflicts, those normative lists win.

| Lens | Answer |
|------|--------|
| **Who** | Harness agents, orchestrators, and engineers entering Markets V1 work; reviewers confirming agents did not skip the contract/phase/task sequence. Not a substitute for product PMs writing code. |
| **What** | Entry index for the Markets V1 **documentation-only** tree: executive outcome, document map (121 reviewed docs), agent harness artifacts (`implementation-manifest.yaml`, `task-graph.yaml`, invariant check), wave delivery status, and phase order through PHASE-8. Product code lives under `apps/`, `packages/`, `schemas/` — not here. |
| **When** | First file to open before any Markets implementation task. Re-read when `current_phase` changes in the manifest, when Wave status or phase tables are updated, or after a harness invariant failure. |
| **Where** | This README at `.dev/markets-v1/README.md`. Pointer for humans: [docs/markets-v1/README.md](../../docs/markets-v1/README.md). Next hops: [00_DOCUMENT_MAP.md](00_DOCUMENT_MAP.md), [agent-harness/AGENT_OPERATING_CONTRACT.md](agent-harness/AGENT_OPERATING_CONTRACT.md), [agent-harness/implementation-manifest.yaml](agent-harness/implementation-manifest.yaml), [phases/](phases/). |
| **Why** | Without a single entry point, agents invent scope, skip PHASE-1 readiness checks, or treat docs as product code. This README freezes the consume order (Orient → Contract → Phase → Task → Trace → Spec → Verify → Escalate) so Markets stays Polymarket-native and harness-gated. |
| **How** | Follow the numbered agent order below. Select exactly one `planned`/`ready` task from `task-graph.yaml`. Confirm requirement mapping before coding. Capture verification via templates. Escalate blockers; do not mark tasks complete because a README row exists. Never extend `archive/` epoch paths for Markets. |

### Worked example

**Happy path — start PHASE-1 catalog work**

1. Read this README + [00_DOCUMENT_MAP.md](00_DOCUMENT_MAP.md).
2. Read [AGENT_OPERATING_CONTRACT.md](agent-harness/AGENT_OPERATING_CONTRACT.md); confirm `current_phase` is `PHASE-1` in the manifest.
3. Pick one ready task (e.g. catalog/OpenAPI growth) from [task-graph.yaml](agent-harness/task-graph.yaml).
4. Trace IDs in [REQUIREMENTS_TO_TASK_TRACEABILITY.md](agent-harness/REQUIREMENTS_TO_TASK_TRACEABILITY.md); read [phases/PHASE-1-FOUNDATION-AND-READ-MARKETS.md](phases/PHASE-1-FOUNDATION-AND-READ-MARKETS.md) and linked ADRs.
5. Implement only under Markets paths; run task `commands`; fill verification + handoff templates.

**Failure / Never skip**

- Jumping to wallet/trading/Android without PHASE-1 readiness and an authorized task.
- Treating Wave 9 harness completion as product-code completion ([EXECUTIVE_OUTCOME.md](EXECUTIVE_OUTCOME.md) says implementation not started).
- Ignoring [INVARIANT_CHECK.md](agent-harness/INVARIANT_CHECK.md) §23 when docs or code contradict ADR-001/002/009.

**Agent checklist**

- [ ] README + document map oriented?
- [ ] Operating contract read?
- [ ] `current_phase` and one task selected?
- [ ] Requirement IDs traced?
- [ ] Phase spec + ADRs read?
- [ ] Verification evidence path known?

**Reading tip:** Use Who/What to stay in documentation mode; use How as the mandatory sequence before touching `apps/backend/internal/markets/` or web Markets routes.

## What this is

Implementation-grade documentation and machine-readable agent harness for **RetroPick Markets V1**: a Polymarket-native product delivered through web, Go backend, and native Android (Kotlin + Jetpack Compose).

This tree is **documentation only**. Product code lives under `apps/`, `packages/`, `schemas/`.

## Executive summary

- [EXECUTIVE_OUTCOME.md](EXECUTIVE_OUTCOME.md) — honest status, blockers, first executable phase
- [agent-harness/INVARIANT_CHECK.md](agent-harness/INVARIANT_CHECK.md) — master prompt §23 cross-doc verification (28 invariants)
- [00_DOCUMENT_MAP.md](00_DOCUMENT_MAP.md) — document inventory indexed by category
- [intelligence/INTELLIGENCE_LAUNCH_V1.md](intelligence/INTELLIGENCE_LAUNCH_V1.md) — Smart Money Launch ten-feature scope (docs program; does not advance `current_phase`)

## How agents consume this harness

Agents MUST follow this order before writing product code:

1. **Orient** — Read this README and [00_DOCUMENT_MAP.md](00_DOCUMENT_MAP.md).
2. **Contract** — Read [agent-harness/AGENT_OPERATING_CONTRACT.md](agent-harness/AGENT_OPERATING_CONTRACT.md).
3. **Phase** — Check `current_phase` in [agent-harness/implementation-manifest.yaml](agent-harness/implementation-manifest.yaml) (currently `PHASE-1`).
4. **Task** — Select exactly one `planned` or `ready` task from [agent-harness/task-graph.yaml](agent-harness/task-graph.yaml).
5. **Trace** — Confirm requirement mapping in [agent-harness/REQUIREMENTS_TO_TASK_TRACEABILITY.md](agent-harness/REQUIREMENTS_TO_TASK_TRACEABILITY.md).
6. **Spec** — Read the phase spec under [phases/](phases/) and linked ADRs.
7. **Verify** — Run task `commands`, capture evidence via [agent-harness/VERIFICATION_EVIDENCE_TEMPLATE.md](agent-harness/VERIFICATION_EVIDENCE_TEMPLATE.md), complete [agent-harness/AGENT_HANDOFF_TEMPLATE.md](agent-harness/AGENT_HANDOFF_TEMPLATE.md).
8. **Escalate** — Log blockers in [agent-harness/BLOCKERS_AND_HUMAN_APPROVALS.md](agent-harness/BLOCKERS_AND_HUMAN_APPROVALS.md); decisions in [agent-harness/DECISION_AND_ASSUMPTION_LOG.md](agent-harness/DECISION_AND_ASSUMPTION_LOG.md).

### Harness artifacts

| Artifact | Purpose |
|----------|---------|
| [implementation-manifest.yaml](agent-harness/implementation-manifest.yaml) | Phase order, parallelization, doc paths, approval gates |
| [task-graph.yaml](agent-harness/task-graph.yaml) | Machine-readable tasks with `owned_paths`, deps, acceptance criteria |
| [REQUIREMENTS_TO_TASK_TRACEABILITY.md](agent-harness/REQUIREMENTS_TO_TASK_TRACEABILITY.md) | REQ-ID → docs → tasks → tests → metrics |
| [INVARIANT_CHECK.md](agent-harness/INVARIANT_CHECK.md) | §23 invariant checklist before merge |
| [PHASE_GATE_TEMPLATE.md](agent-harness/PHASE_GATE_TEMPLATE.md) | Exit-gate evidence format |

## Wave structure (documentation delivery)

Waves 1–8 produced the specification corpus. **Wave 9** completes the agent harness so implementation agents can execute safely.

| Wave | Deliverable | Status |
|------|-------------|--------|
| 1 | PRD, scope matrix, requirements | reviewed |
| 2 | Architecture, ADRs, trust boundaries | reviewed |
| 3 | Polymarket integration specs | reviewed |
| 4 | Backend, web, Android design | reviewed |
| 5 | Security, platform, testing | reviewed |
| 6 | Intelligence product specs | reviewed |
| 7 | Phase plans (PHASE-0–8) | reviewed |
| 8 | Research, evidence, open questions | reviewed |
| **9** | **Agent harness** (this wave) | **reviewed** |

## Phase order (implementation)

Phases are sequential unless `may_run_in_parallel_with` allows overlap in [task-graph.yaml](agent-harness/task-graph.yaml).

| Order | Phase | Name | Depends on |
|-------|-------|------|------------|
| 0 | PHASE-0 | Discovery and Spec Freeze | — |
| 1 | PHASE-1 | Foundation and Read Markets | PHASE-0 |
| 2 | PHASE-2 | Account Wallet and Funding | PHASE-1 |
| 3 | PHASE-3 | Web Trading Core | PHASE-2 |
| 4 | PHASE-4 | Portfolio, Redemption, Withdrawal | PHASE-3 |
| 5 | PHASE-5 | Android Compose Markets | PHASE-3, PHASE-4 |
| 6 | PHASE-6 | Hardening, CI/CD, SRE | PHASE-4, PHASE-5 |
| 7 | PHASE-7 | Production Launch | PHASE-6 |
| 8 | PHASE-8 | Post-V1 Advanced Capabilities | PHASE-7 |

**Current:** PHASE-0 documentation complete; **first executable implementation phase is PHASE-1**.

## Cross-document invariants (§23)

All 28 master-prompt invariants are enumerated in [agent-harness/INVARIANT_CHECK.md](agent-harness/INVARIANT_CHECK.md). Agents MUST NOT introduce contradictions. Key anchors:

- Polymarket is venue authority — [ADR-001](architecture/adr/ADR-001-MARKETS-HAS-NO-CUSTOM-EXCHANGE.md)
- BFF anti-corruption layer — [ADR-002](architecture/adr/ADR-002-POLYMARKET-ANTI-CORRUPTION-LAYER.md)
- No raw key custody — [ADR-003](architecture/adr/ADR-003-WALLET-AND-SIGNING-MODEL.md)
- Shared OpenAPI for web/Android — [ADR-004](architecture/adr/ADR-004-SHARED-WEB-ANDROID-API.md)
- No auto copy trading — [ADR-009](architecture/adr/ADR-009-NO-AUTO-COPY-TRADING-V1.md)

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
