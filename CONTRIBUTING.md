# Contributing

## Development

- Use pnpm from the repository root.
- Keep `apps/backend` as the backend module unless a migration explicitly changes that boundary.
- Prefer `package/prediction-v2` in new contract docs and scripts.
- Do not commit secrets, deploy keys, mnemonics, local `.env` files, or generated runtime artifacts.

## Verification

Run the smallest relevant checks for your change:

- TypeScript/shared packages: `pnpm typecheck`
- Frontend apps: `pnpm lint && pnpm test`
- Backend: `go -C apps/backend test ./...`
- Contracts: `pnpm contracts:test`

For repo-wide changes, run `pnpm check`, `pnpm build`, and `pnpm contracts:test`.
