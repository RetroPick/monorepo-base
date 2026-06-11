# qa-integration: production smoke outline

## Scope

Align `scripts/smoke-production.sh` with `PRODUCTION.md` checklist; document required env vars without embedding secrets.

## Acceptance

- [x] Human-readable dry-run steps in `PRODUCTION.md` or linked doc.
- [x] `pnpm verify` exit 0.

## Owner

`qa-integration`

## Notes

- `scripts/smoke-production.sh` accepts `RETROPICK_API_BASE` or positional URL; optional `RETROPICK_OPS_JWT` (legacy argv JWT deprecated with stderr warning).
- `docs/vps-deploy.md` and `.dev/backend/keeper.md` cross-references updated.
