# Local Development

## Prerequisites

- Node.js 22+
- pnpm 10
- Go 1.26+
- Foundry
- Docker for full-stack local services

## Common Commands

- `pnpm dev`: run app dev tasks through Turbo.
- `pnpm dev:web`: run customer web app.
- `pnpm dev:ops-web`: run ops dashboard.
- `pnpm dev:docs`: run docs app.
- `pnpm docker:up`: start local backend dependencies.
- `pnpm smoke`: run backend Go tests.
- `pnpm contracts:test`: run Foundry tests from `contracts/legacy-pool-v1`.

## Environment

Use `.env.example` as the root template. Local `.env` files, private keys, mnemonics, and webhook secrets must stay uncommitted.
