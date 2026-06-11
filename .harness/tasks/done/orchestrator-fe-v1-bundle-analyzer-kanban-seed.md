# orchestrator: fe-v1 bundle analyzer + Kanban seed pack

## Scope

- Add `@next/bundle-analyzer` + `pnpm --filter fe-v1 analyze` for measurable bundle work.
- Add `poweredByHeader: false` on `fe-v1` Next config.
- Publish **Kanban seed** doc + **eight** `.harness/tasks/backlog/*.md` files so Hermes Kanban can run parallel lanes toward the standing goal.

## Acceptance

- [x] `pnpm verify` exit 0 after changes.
- [x] [`.harness/docs/kanban-seed-retropick-v1.md`](../../docs/kanban-seed-retropick-v1.md) lists copy-paste card bodies + links to backlog task files.
- [x] `apps/fe-v1/README.md` documents `analyze`.

## Verify

```bash
pnpm verify
pnpm --filter fe-v1 build
```

**2026-05-26:** `pnpm verify` exit 0; `pnpm --filter fe-v1 build` exit 0 (if `pages-manifest.json` ENOENT after a prior interrupted build, `rm -rf apps/fe-v1/.next` then rebuild).

**Follow-up:** `useYellowSession` EIP-712 `domain` typed as viem `TypedDataDomain`; `useMarketRegistry` passes `chain` + `address` guards for wagmi `writeContractAsync`.

## Owner

`orchestrator` / `harness-librarian`
