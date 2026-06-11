---
title: Orchestrator — Ops workflow doc + ops dashboard perf
status: done
owner: orchestrator
---

## Goal

Ship a **single operator workflow** doc and surface it in **`apps/ops`** so admin/market/deploy work is sequenced; speed up ops bundle via Next `optimizePackageImports`.

## Owner

orchestrator (coordination), fe-ops (dashboard), docs-curator (links)

## Acceptance

- [x] `docs/feature/ops-admin-operator-workflow.md` exists and maps ops routes → APIs → agents.
- [x] `ORCHESTRATOR.md` Phase 5 links to that doc.
- [x] Ops Overview shows **Operator playbook** ordered list.
- [x] `apps/ops/next.config.mjs` enables `experimental.optimizePackageImports` for lucide/recharts/radix.
- [x] Full monorepo `pnpm lint` — green after fe-v1 ESLint fixes (2026-05-26); see `phase0-verify-green` for residual warnings note.
- [x] `pnpm test` — green from repo root (2026-05-26).
- [x] `pnpm smoke` — green (`go test ./...` under `apps/backend`; manifest + `package.json` aligned 2026-05-26).

## Verify

```bash
cd apps/ops && pnpm lint && pnpm test
cd ../.. && pnpm test
pnpm verify
```

## Status

done — ops slice complete; root verify green.
