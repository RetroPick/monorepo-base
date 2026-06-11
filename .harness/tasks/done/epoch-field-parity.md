---
title: Indexer ↔ API ↔ fe-v1 epoch field parity
status: done
owner: orchestrator
---

## Goal

Ensure epoch state fields exposed by **`be-api`** match projections from **`be-indexer`** and are rendered consistently in **`fe-markets`** without invented intermediate states.

## Acceptance

- [x] Event → projection → JSON path documented — [`.dev/backend/epoch-field-parity.md`](../../../.dev/backend/epoch-field-parity.md) + [`code/api/http-surface.md`](../../../.dev/backend/code/api/http-surface.md)
- [x] UI copy uses engine vocabulary — Discover cards: **`open` / `lock` / `resolve`** via `inferMarketCardLifecycle`; Chain admin pills: Open / Locked / Resolved; **claim** remains detail-level (`activeEpoch.claimable`) for a follow-up if needed on list rows
- [x] No FE-only fake “open” when projection missing — `syncing` when `activeEpochId` set but no `epochStatus`

## Primary agents

`be-indexer`, `be-api`, `fe-markets`

## Verify

`pnpm verify`
