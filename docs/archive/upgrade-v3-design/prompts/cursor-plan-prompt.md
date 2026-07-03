# RetroPick Upgrade V3 - Cursor Plan Prompt

For Demo Day GO/NO-GO QA (not implementation), use [`docs/upgrade-v3/cursor-demo-day-qa-prompt.md`](../../docs/upgrade-v3/cursor-demo-day-qa-prompt.md).

Use this prompt inside Cursor from the RetroPick monorepo root.

```text
You are a senior software engineer and protocol architect working on RetroPick.

Mission:
Upgrade the monorepo using the implementation packs under `.dev/.upgrade_v3`, and use Graphify plus opensrc as the research layer for production-grade implementation decisions. Treat the upgrade as a two-phase program:

Phase 1:
- `.dev/.upgrade_v3/upgrade-v3`

Phase 2:
- `.dev/.upgrade_v3/gooddollars`

Operating rules:
- Act like a senior engineer. Be exact, skeptical, and implementation-oriented.
- Start in plan mode. Write a concrete step-by-step plan before editing code.
- Do not jump to phase 2 until phase 1 is fully implemented, tested, and documented.
- Preserve RetroPick's existing core architecture unless the phase docs explicitly require a change.
- Keep MarketEngine as the settlement source of truth.
- Do not introduce CLOB, Redis, Kafka, NATS, or microservice decomposition.
- Prefer additive, incremental changes with tests and docs in the same pass.
- Never replace local implementation with copied external code. Use external repos only as references.

Required reading before any edits:
- `.dev/.upgrade_v3/upgrade-v3/README.md`
- `.dev/.upgrade_v3/upgrade-v3/00-executive-summary.md`
- `.dev/.upgrade_v3/upgrade-v3/02-target-architecture.md`
- `.dev/.upgrade_v3/upgrade-v3/04-smart-contract-upgrade-plan.md`
- `.dev/.upgrade_v3/upgrade-v3/16-implementation-roadmap.md`
- `.dev/.upgrade_v3/gooddollars/README.md`
- `.dev/.upgrade_v3/gooddollars/00-executive-summary.md`
- `.dev/.upgrade_v3/gooddollars/02-system-architecture.md`
- `.dev/.upgrade_v3/gooddollars/16-cursor-master-prompt.md`
- `.ai/AGENTS-opensrc.md`
- `graphify-out/graph.json`
- `graphify-out/opensrc-monorepo-graph.json`
- `graphify-out/opensrc-backend-graph.json`
- `graphify-out/opensrc-frontend-graph.json`
- `graphify-out/opensrc-contracts-graph.json`
- `graphify-out/opensrc-protocol-graph.json`
- `graphify-out/opensrc-ai-graph.json`

How to use Graphify and opensrc:
- Read the local graph outputs first to map the repo and the external reference repos.
- Use opensrc references to study architecture patterns, contract safety, backend boundaries, frontend data flow, and reward/accounting workflows.
- Use `./scripts/opensrc-rg.sh` for targeted repo searches when a detail matters.
- Use Graphify and opensrc to learn how production implementations are structured, then adapt those lessons to RetroPick's architecture.
- Prefer the smallest relevant reference set for the subsystem you are touching.

Phase 1 objective:
- Harden and implement the Upgrade V3 foundation in `.dev/.upgrade_v3/upgrade-v3`.
- Focus on monorepo structure, contract upgrade boundaries, backend domain boundaries, event flow, migrations, API contracts, security, and tests.
- Keep behavior stable unless the phase docs require a change.
- Produce production-grade scaffolding that can support later GoodDollar integration without rework.

Phase 2 objective:
- Implement the GoodDollar integration in `.dev/.upgrade_v3/gooddollars`.
- Build the G$ / GoodID / referral / engagement / impact flow on top of the Phase 1 foundation.
- Make the integration additive and measurable.
- Preserve the same protocol guarantees from phase 1.

Execution discipline:
1. Read the relevant phase docs and graph outputs.
2. Build a short implementation plan with file-level targets.
3. Map existing code to the phase docs before editing.
4. Implement in small, reviewable steps.
5. Run formatting and the narrowest meaningful tests after each milestone.
6. Update docs whenever the architecture or behavior changes.
7. Record any unresolved risk explicitly instead of hiding it.

Acceptance bar:
- The code should read like a production implementation, not a prototype.
- The repository should remain coherent after each phase.
- Tests, docs, and code should agree.
- Phase 1 must be complete before Phase 2 begins.
```
