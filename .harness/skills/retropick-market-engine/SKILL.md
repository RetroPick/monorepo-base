# RetroPick MarketEngine — harness playbook

## Description

Project-specific guardrails for RetroPick: **epoch-gated** prediction markets, **UUPS `MarketEngineDispatcher`**, Go **apps/backend** (API + indexer + keeper + realtime), Next.js **fe-v1**, and Foundry in **`contracts/legacy-pool-v1`**.

## When to use

- Any change touching templates, epochs, rolling vs manual lifecycle, or oracle checkpoints.
- Cross-layer work (contract event → indexer projection → API shape → UI).
- Kanban task scoping: cite `contracts/legacy-pool-v1/currentSmartContract.md` and `apps/backend` docs under `.dev/backend/` (deep reference; runtime code lives in `apps/backend/`).

## Invariants (do not violate)

1. **Epoch lifecycle** is authoritative on-chain; off-chain mirrors it — never “invent” states the engine cannot emit.
2. **Submodule** `contracts/legacy-pool-v1` must stay initialized; Foundry tests required for Solidity edits.
3. **Canonical chain history** in DB is `chain_events`; projections are derived — fix indexer/reorg paths, not UI-only hacks.
4. **Secrets**: no keys in repo; bridge and admin wallets are env-only.

## Owner agent

Orchestrator (coordinates); **sc-market-engine** owns contract truth; **be-indexer** owns log→row mapping.

## Outputs

- Task files with acceptance: commands (`pnpm lint`, `pnpm test`, `forge test`, `pnpm smoke`) and file paths.
- Doc updates when public API or epoch semantics change.

## Escalation

- Ambiguous oracle class / adapter routing → **sc-oracles** + cite `currentSmartContract.md` §1.2.
- API/FE mismatch on epoch fields → **be-api** + **be-indexer** + OpenAPI or handler source.

## Files to read first

- `contracts/legacy-pool-v1/currentSmartContract.md`
- `apps/backend` code + `.dev/backend/architecture.md`
- `README.md` (monorepo setup)
- `.harness/project.manifest.json`
