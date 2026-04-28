# RetroPick V1

Monorepo for the RetroPick prediction-markets stack: Solidity contracts (`package/contract`), shared ABIs (`package/abi`), Go backend (API, indexer, keeper binaries under `apps/backend`), and frontends (`apps/fe-v1`, `apps/ops`).

**Canonical on-chain inventory for the documented testnet deployment** is [`package/abi/address.md`](package/abi/address.md). The apps consume the same addresses via [`packages/contracts/registry.base-sepolia.json`](packages/contracts/registry.base-sepolia.json) (regenerate with `pnpm contracts:registry` when `address.md` or the manifest changes).

---

## Base Sepolia (chain id `84532`)

| Role | Address | Notes |
|------|---------|--------|
| **MarketEngine proxy** (use for all reads/writes) | `0x1ed89defc8fbcbd512c562b148868ffdc778018a` | `ERC1967Proxy`; see `address.md` for Basescan / Blockscout links |
| **Implementation** (`MarketEngineDispatcher`) | `0xf8b69b881fb35feb804cfec761fdeb88c4e45ef1` | Verification / upgrades; not the day-to-day call target |
| **TokenFaucet** | `0xf6c1b6bddd06972f08772de7954432e10c853231` | Testnet faucet |
| **MockERC20 stake token** | `0xb7f49377af6adbef64f513cf04dbdac9d0af01b1` | Stake token on Base Sepolia |
| **ChainlinkAdapter** | `0x682b79d6cbd8bcb4e89aeac487ee94e2c306175e` | Labeled “price oracle” in `address.md` |
| **RateAdapter** | `0x5b61b033816d710e6da9b659a87fc9c2cef6c145` | |
| **SmartDataAdapter** | `0x51905ef42a9c794bce5042d1305ab4582eeb3823` | |
| **MacroAdapter** | `0xc2a28f925da7e81d4f66eb006917bdf9a3686f16` | |
| **EquityAdapter** | `0x6747e65fa8c81f3e0f472b45a4afba9dbe777bd5` | |
| **MarketEngineAdminModule** | `0x98841ad4483403a55d7af7e28899019db5956238` | |
| **MarketEngineViewModule** | `0xec237e5c2821346d3eeb88240dd63e814d42dee9` | |
| **MarketEngineUserOpsClaimsModule** | `0xe052d3986d8409119b2c5253ec70e8e164f146da` | |
| **MarketEngineCoreLifecycleModule** | `0xbc80925f712c6a362bd612eee0bbec22dd6eedb6` | |
| **MarketEngineRollingLifecycleModule** | `0xe2e7bb0127e74b5761efd7560ba0c950a9d2a8a2` | |

Deployment artifact referenced in `address.md`: `package/contract/broadcast/DeployTestnet.s.sol/84532/run-latest.json` (path relative to contract package).

**Operator rule:** treat the **proxy** as the single MarketEngine endpoint unless you are debugging implementation or routing.

---

## Prerequisites

- **Node:** 20+ recommended; **pnpm** `10.x` (see root `packageManager`).
- **Docker / Docker Compose:** for local Postgres + API + indexer + ops.
- **Go 1.24+** (optional): only if you run `apps/backend` binaries on the host instead of Docker.

---

## Initialize the repo

From the repository root:

```bash
pnpm install
```

Workspace packages live under `apps/*` and `packages/*` (`pnpm-workspace.yaml`).

---

## Run locally with Docker (recommended)

Build and start Postgres, API, indexer, and the operator UI:

```bash
docker compose up -d --build
```

| Service | Port | Purpose |
|---------|------|---------|
| Postgres | `5432` | User `retropick`, password `retropick`, database `retropick` |
| API | `8080` | REST + WebSocket; migrations run on startup |
| Indexer | (no host port) | Indexes Base Sepolia using `RPC_URL` |
| Ops | `3001` | Next.js operator dashboard |

Default API env in Compose:

- `DATABASE_URL`: `postgres://retropick:retropick@postgres:5432/retropick?sslmode=disable`
- `RPC_URL`: `https://sepolia.base.org` (Base Sepolia JSON-RPC; aligns with chain id **84532** in `address.md`)

Useful checks:

```bash
curl -sS http://127.0.0.1:8080/api/v1/health
curl -sS http://127.0.0.1:8080/api/v1/config/contracts
```

Stop and remove containers (add `-v` to drop the Postgres volume):

```bash
docker compose down
```

**WSL2 + Docker:** if services log `lookup postgres on 127.0.0.11:53: server misbehaving` or repeated migrate errors while Postgres is still starting, try: ensure Docker Desktop is running; wait for `retropick-postgres` to show `ready to accept connections` before depending on the API; or in Docker Engine settings, adjust DNS (e.g. public resolvers) if corporate VPNs break embedded DNS. The API and indexer retry DB connections on startup, but a broken host network still needs a local fix.

Root shortcuts: `pnpm docker:up`, `pnpm docker:down`, `pnpm docker:build`.

---

## Run frontends against a local API

Ensure the API is reachable at `http://127.0.0.1:8080` (Docker or local Go).

```bash
# Operator dashboard (port 3001)
pnpm dev:ops

# Main user app (Vite; port from app config, often 5173)
pnpm dev:fe-v1
```

Set `NEXT_PUBLIC_API_URL` if the API is not on `127.0.0.1:8080` (required for browser calls from `apps/ops`).

---

## Run the API on the host (without Docker for Go)

1. Start Postgres only: `docker compose up -d postgres`
2. Export:

   ```bash
   export DATABASE_URL='postgres://retropick:retropick@127.0.0.1:5432/retropick?sslmode=disable'
   export PORT=8080
   export RPC_URL=https://sepolia.base.org
   ```

3. From `apps/backend`:

   ```bash
   GOTOOLCHAIN=auto go run ./cmd/api
   ```

Live operator RPC reads (`/api/v1/ops/live/*`) need a working `RPC_URL` and the embedded ABIs under `apps/backend/internal/abis/` (kept in sync with [`package/abi`](package/abi)).

---

## Contracts and ABIs

- **Sources:** `package/contract`
- **Artifacts for apps/backend:** `package/abi/*.json` and [`package/abi/address.md`](package/abi/address.md)
- **Frontend registry package:** `@retropick/contracts` → `packages/contracts`

After changing deployment addresses, update `address.md` (and the broadcast artifact workflow your team uses), then refresh the JSON registry consumed by apps:

```bash
pnpm contracts:registry
```

---

## Further reading

- Operator runbook and procedures: `package/contract/.operator/`
- Architecture notes: `.dev/`
