# Contributing

## Development

- Use pnpm from the repository root.
- Live backend module: `apps/backend/` (`cmd/markets-api` is the product BFF).
- Do not commit secrets, deploy keys, mnemonics, local `.env` files, or generated runtime artifacts.

## Verification

Run the smallest relevant checks for your change:

- TypeScript/shared packages: `pnpm typecheck`
- Frontend apps: `pnpm lint && pnpm test`
- Backend: `go -C apps/backend test ./...`
- Legacy contracts (optional): `pnpm contracts:test`

For repo-wide changes, run `pnpm check`, `pnpm build`, and `bash scripts/check-active-legacy-refs.sh`.
