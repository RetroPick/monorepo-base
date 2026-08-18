# fe-ops: lifecycle + oracle API surface

## Scope

Extend `apps/ops-web` lifecycle, templates, oracle, visibility, and governance pages to use the same live ops API patterns as Monitor/Prepare (`OpsDeployPreflight` + `OpsOperatorHub`).

## Acceptance

- [x] No hardcoded dead endpoints for the documented ops paths; graceful empty/error states (oracle health error copy improved).
- [x] `pnpm -C apps/ops lint && pnpm -C apps/ops test` exit 0; `pnpm verify` exit 0.

## Owner

`fe-ops`

## Verify

```bash
pnpm -C apps/ops lint && pnpm -C apps/ops test && pnpm verify
```
