# RetroPick V1

**RetroPick** is an **on-chain prediction market engine** for Base Sepolia: one upgradeable **`MarketEngine`** hosts **many markets** (templates), each running **epochs**—open → lock → resolve → claim—with settlement driven by **Chainlink-family oracles** and optional trusted reporters. Operators define markets via `upsertTemplate` / `initializeMarket`; traders deposit stake on sides per epoch; winners claim after resolution; protocol fees route to treasury.

**Problem addressed:** Teams need a **single protocol instance** that supports **many market shapes** (direction, thresholds, ranges, composites, …), **professional ops** (templates, epochs, treasury), and **flexible automation** (manual keeper steps vs rolling rounds)—not one-off pools per market.

**How it fits together (off-chain stack):** This monorepo adds Solidity (`package/contract`), shared ABIs (`package/abi`), a **Go API + indexer** (`apps/backend`), the **user app** (`apps/fe-v1`), and an **operator dashboard** (`apps/ops`). Deep contract behavior—including modular `MarketEngineDispatcher`, oracle routing, checkpoints, and gas notes—is documented in [`package/contract/currentSmartContract.md`](package/contract/currentSmartContract.md).

**Differentiators**

- **Modular UUPS engine:** Admin, user, and claims hot paths on the dispatcher; lifecycle and views delegated to modules; one storage layout ([`MarketEngineState`](package/contract/src/engine/MarketEngineState.sol)).
- **Multi-adapter Chainlink routing:** Templates select oracle class (price, rate, smart data, macro, equity) per [`currentSmartContract.md`](package/contract/currentSmartContract.md) §1.2.
- **Epoch modes:** **Manual** epochs (discrete `openEpoch` / `lockEpoch` / `resolveEpoch`) vs **rolling** automation where a keeper advances the pipeline on an interval—see the same doc for ops narrative (§0.3).

---

## Architecture at a glance

High-level protocol flow (deploy → template → epochs → settlement → treasury), aligned with §0.5 of [`currentSmartContract.md`](package/contract/currentSmartContract.md):

```mermaid
flowchart LR
  subgraph deployBlock [Deploy]
    adapters[OracleAdapters]
    proxyNode[MarketEngineProxy]
    wireup[ModuleWireup]
  end
  subgraph marketBlock [Market]
    tmpl[upsertTemplate]
    initMarket[initializeMarket]
  end
  subgraph epochBlock [Epochs]
    adv[KeeperOrRolling]
    trade[UsersDepositSwitch]
  end
  subgraph settleBlock [Settlement]
    res[ResolveAndOracle]
    cl[Claims]
  end
  subgraph treasBlock [Treasury]
    feePool[FeeReserve]
    wdraw[withdrawFees]
  end
  adapters --> proxyNode
  wireup --> proxyNode
  proxyNode --> tmpl --> initMarket --> adv
  trade --> adv
  adv --> res --> cl
  res --> feePool --> wdraw
```

Conceptual **epoch lifecycle** (one round per template; exact rules vary by [`MarketType`](package/contract/.operator/.marketType.md)). Users typically **deposit or switch sides** while the epoch is **open** (and where allowed **before lock**); **manual** vs **rolling** differs in **how** the admin/keeper advances open/lock/resolve:

```mermaid
flowchart LR
  openPh[Open]
  lockPh[Lock]
  resolvePh[Resolve]
  claimPh[Claim]
  openPh --> lockPh --> resolvePh --> claimPh
```

---

## Market types

The canonical **`MarketType`** set has **nine** variants: **Direction**, **Threshold**, **RangeClose**, **Velocity**, **Ladder**, **Convergence**, **Composite**, **Corridor**, **Cascade**. For guarded launches, **Direction / Threshold / RangeClose** are the lowest operator burden; **Convergence / Composite / Corridor / Cascade** need the most oracle and incident discipline. Full approval guidance is in [`package/contract/.operator/.marketType.md`](package/contract/.operator/.marketType.md).

---

## Hackathon demo path

- Fund exploration from **`TokenFaucet`** on Base Sepolia (address below; explorers in [`package/abi/address.md`](package/abi/address.md)).
- Run **`docker compose up`** plus **`pnpm dev:fe-v1`** / **`pnpm dev:ops`** (see below) so judges see indexer-backed UI against the deployed engine.
- Deep operator flows (`upsertTemplate`, `initializeMarket`, epoch actions): [`package/contract/.operator/.runbook.md`](package/contract/.operator/.runbook.md).

---

## Base Sepolia deployment (judges)

**Chain id `84532`.** Use the **MarketEngine proxy** for all routine reads and writes; implementation addresses are for verification/debugging only ([`address.md`](package/abi/address.md) notes).

| Role | Address |
|------|---------|
| **MarketEngine proxy** (`ERC1967`) | `0x1ed89defc8fbcbd512c562b148868ffdc778018a` |
| **Implementation** (`MarketEngineDispatcher`) | `0xf8b69b881fb35feb804cfec761fdeb88c4e45ef1` |
| **TokenFaucet** | `0xf6c1b6bddd06972f08772de7954432e10c853231` |
| **MockERC20 stake** (`mSTK`, 18 decimals) | `0xb7f49377af6adbef64f513cf04dbdac9d0af01b1` |

**Oracle adapters** (ChainlinkAdapter, Rate, SmartData, Macro, Equity) and **lifecycle modules** (View, CoreLifecycle, RollingLifecycle, Admin, UserOpsClaims) — full list with **Basescan / Blockscout** links: [`package/abi/address.md`](package/abi/address.md).

Apps consume the same addresses via [`packages/contracts/registry.base-sepolia.json`](packages/contracts/registry.base-sepolia.json). After changing deployments, regenerate:

```bash
pnpm contracts:registry
```

---

## Prerequisites

| Tool | Notes |
|------|--------|
| **Node.js** | 20+ |
| **pnpm** | 10.x (see [`package.json`](package.json) `packageManager`) |
| **Docker & Docker Compose** | Recommended for Postgres + API + indexer + ops |
| **Docker Buildx** | Compose v2 uses Buildx Bake for builds; install the [Buildx CLI plugin](https://docs.docker.com/build/install-buildx/) so `docker buildx version` works and you avoid Compose bake warnings. On Ubuntu/WSL, `apt-get install docker-buildx-plugin` only appears after Docker’s APT repo is configured (see Troubleshooting). |
| **Go** | 1.24+ optional, only if you run `apps/backend` on the host |

---

## First-time setup

From the repository root:

```bash
pnpm install
```

Workspace packages are declared in [`pnpm-workspace.yaml`](pnpm-workspace.yaml) (`apps/*`, `packages/*`). Use **`pnpm` from the repo root**; plain `npm install` inside a workspace package can fail on `workspace:*` references.

---

## Run the stack (Docker, recommended)

Build and start Postgres, API, indexer, and the operator UI:

```bash
docker compose up -d --build
```

Shortcuts: `pnpm docker:up`, `pnpm docker:down`, `pnpm docker:build`. Image builds use **BuildKit** by default (expects `DOCKER_BUILDKIT=1`) for layer and cache mounts in Dockerfiles.

| Service | Host port | Purpose |
|---------|-----------|---------|
| Postgres | `5432` | User `retropick`, password `retropick`, DB `retropick` |
| API | `8080` | REST + WebSocket; migrations run in `cmd/api` on startup |
| Indexer | — | Follows Base Sepolia via `RPC_URL` |
| Ops | `3001` | Next.js operator UI |

Compose defaults align with **`84532`**: `RPC_URL=https://sepolia.base.org`, `DATABASE_URL` pointing at the `postgres` service.

### Verify

```bash
curl -sS http://127.0.0.1:8080/api/v1/health
curl -sS http://127.0.0.1:8080/api/v1/config/contracts
```

Stop containers (`docker compose down`; add `-v` to remove the Postgres volume).

---

## Environment templates

| File | Use |
|------|-----|
| [`.env.example`](.env.example) | Host-run Go API / indexer (`DATABASE_URL`, `PORT`, `RPC_URL`, …) |
| [`docker-compose.yml`](docker-compose.yml) | Container defaults for the same variables |
| [`apps/fe-v1/.env.local.example`](apps/fe-v1/.env.local.example) | `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_DOCS_URL` for the user app |
| [`apps/ops/.env.local.example`](apps/ops/.env.local.example) | `NEXT_PUBLIC_API_URL` for the operator UI |
| [`package/contract/.env.example`](package/contract/.env.example) | Foundry / deployment scripts |

Do not commit real `.env` files (see root [`.gitignore`](.gitignore)).

---

## Frontends against a local API

Ensure the API is reachable (default `http://127.0.0.1:8080`).

```bash
# User app — http://localhost:3000
pnpm dev:fe-v1

# Operator UI — prefers port 3001 (see apps/ops/scripts/dev.mjs)
pnpm dev:ops

# Docs — http://localhost:3002/docs
pnpm dev:docs
```

If the API is not on `127.0.0.1:8080`, set `NEXT_PUBLIC_API_URL` for `apps/fe-v1` and `apps/ops` (browser-side requests). If docs are not on `localhost:3002`, set `NEXT_PUBLIC_DOCS_URL` for `apps/fe-v1`.

Use a wallet on **Base Sepolia** with test ETH/USDC per your deployment.

---

## Production deployment

Step-by-step walkthrough (why Vercel and the API are separate, env vars, CORS, smoke tests): **[docs/vercel-and-api-deployment.md](docs/vercel-and-api-deployment.md)**.

End-to-end tutorial for hosting **only** the Go API on Vercel (`apps/backend`, `cmd/api`): **[docs/vercel-backend.md](docs/vercel-backend.md)** (Postgres + migrator off-Vercel; **indexer** needs another host).

Deploy the browser apps and Go backend as separate services:

| Service | Recommended target | Notes |
|---------|--------------------|-------|
| User app | Vercel project rooted at `apps/fe-v1` | Build command: `cd ../.. && pnpm --filter fe-v1 build` |
| Docs | Vercel project rooted at `apps/docs` | Build command: `cd ../.. && pnpm --filter docs build` |
| API | Container host from [`apps/backend/Dockerfile`](apps/backend/Dockerfile) with `SERVICE=api` | Expose HTTPS at a public API domain |
| Indexer | Container host from [`apps/backend/Dockerfile`](apps/backend/Dockerfile) with `SERVICE=indexer` | Long-running worker; no public port required |
| Migrator | Release/predeploy job with `SERVICE=migrator` | Run before API/indexer start after schema changes |
| Postgres | Managed Postgres | Use provider-required SSL settings, commonly `sslmode=require` |

Vercel only deploys the selected root directory. A project rooted at `apps/fe-v1` will not run `apps/backend` or `apps/docs`, so production must not rely on local fallbacks like `127.0.0.1:8080` or `localhost:3002`.

Set these Vercel variables on the `apps/fe-v1` project:

```bash
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_DOCS_URL=https://docs.example.com/docs
```

Set these variables on the backend API service:

```bash
PORT=8080
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DB?sslmode=require
RPC_URL=https://sepolia.base.org
CORS_STRICT=1
CORS_ALLOWED_ORIGINS=https://app.example.com,https://docs.example.com
# Optional for Vercel preview deployments:
CORS_ALLOWED_ORIGIN_PATTERNS=https://*.vercel.app
```

Smoke-test production after deploy:

```bash
curl -sS https://api.example.com/api/v1/health
curl -sS https://api.example.com/api/v1/markets
```

---

## API on the host (Go only)

1. Postgres up: `docker compose up -d postgres`
2. Export vars (see [`.env.example`](.env.example)) or:

   ```bash
   export DATABASE_URL='postgres://retropick:retropick@127.0.0.1:5432/retropick?sslmode=disable'
   export PORT=8080
   export RPC_URL=https://sepolia.base.org
   ```

3. From `apps/backend`:

   ```bash
   GOTOOLCHAIN=auto go run ./cmd/api
   ```

Live operator RPC routes (`/api/v1/ops/live/*`) need `RPC_URL` and ABIs under `apps/backend/internal/abis/` (aligned with [`package/abi`](package/abi)).

---

## Testing

```bash
# All workspace packages that define a test script (frontend Vitest today)
pnpm test

# Explicit targets
pnpm --filter fe-v1 test
cd apps/backend && make test   # go test ./...
```

---

## Troubleshooting

**WSL2 + Docker:** If logs show DNS errors (`lookup postgres on 127.0.0.11:53`) or migrations flap while Postgres starts, confirm Docker Desktop is running, wait until Postgres is ready, or adjust Docker DNS if a VPN breaks embedded resolution.

**`E: Unable to locate package docker-buildx-plugin` / Compose “build using Bake, but buildx isn’t installed”:** The APT package exists in **Docker’s** package repository (`download.docker.com`), not in Ubuntu’s default indexes alone. Either:

1. Add Docker Engine’s repo for your distro ([Ubuntu](https://docs.docker.com/engine/install/ubuntu/), [Debian](https://docs.docker.com/engine/install/debian/)), run `sudo apt-get update`, then `sudo apt-get install docker-buildx-plugin`, or  

2. Install the CLI plugin binary for your architecture (often `amd64` on Windows/WSL on Intel):

```bash
mkdir -p ~/.docker/cli-plugins
VERSION=v0.32.1
case "$(uname -m)" in
  x86_64|amd64) SUFFIX=linux-amd64 ;;
  aarch64|arm64) SUFFIX=linux-arm64 ;;
  *) echo "unsupported CPU: $(uname -m)"; exit 1 ;;
esac
curl -fsSL "https://github.com/docker/buildx/releases/download/${VERSION}/buildx-${VERSION}.${SUFFIX}" -o ~/.docker/cli-plugins/docker-buildx
chmod +x ~/.docker/cli-plugins/docker-buildx
docker buildx version
```

Bump `VERSION` periodically from [buildx releases](https://github.com/docker/buildx/releases).

---

## RETRODEPLOYER (internal ops CLI)

**RETRODEPLOYER** is the **single entry point** for RetroPick operator workflows: it builds **calldata via the local API** (`POST` `/tx/prepare` and related routes), then **broadcasts** with Foundry **`cast send`** using scripts under [`package/contract/scripts/market/`](package/contract/scripts/market/). It does **not** duplicate HTTP/RPC logic—the repo-root wrapper delegates there.

### Requirements

| Requirement | Why |
|-------------|-----|
| **Run from the monorepo root** | Paths assume `$V1_ROOT`; `cd package/contract` and running a different `./scripts/` will not work as documented. |
| **Go API up** | Prepare flows need **`API_URL`** (default `http://127.0.0.1:8080`). Start Docker Compose (or host API) before `prepare` / `deploy-all`. |
| **`package/contract/.env`** | Copy from [`package/contract/.env.example`](package/contract/.env.example). At minimum set **`RPC_URL`**, **`CAST_ACCOUNT`** (Foundry keystore account name), and optionally **`ETH_PASSWORD`** or your usual Foundry password setup. **`API_URL`** overrides the default if your API is not on localhost:8080. |

Upsert fixtures live under **`package/contract/.operator/upsert-params/`** (override with **`UPSERT_DIR`**). Calldata always comes from the API before on-chain broadcast—same rule as deployment scripts in [`package/contract/scripts/market/broadcast-prepared-ops-tx.sh`](package/contract/scripts/market/broadcast-prepared-ops-tx.sh) (explicit nonce / precheck behavior is implemented there).

### How to invoke

```bash
# Full help (authoritative list of subcommands and env vars — use this first)
./scripts/RETRODEPLOYER help

# Same entry point
bash ./scripts/RETRODEPLOYER help
pnpm run retropick:deployer -- help

# Interactive menu (no subcommand defaults to menu)
./scripts/RETRODEPLOYER
pnpm run retro

# Convenience: deploy-all alias
pnpm run retropick:deploy
```

Shorthands **`./scripts/retro`**, **`pnpm run retro`**, and menu option **`./scripts/retro d`** mirror **`deploy-all`** (nine manual-type fixtures, keystore-driven flow—see **`help`** output).

### Command map (summary)

Use **`./scripts/RETRODEPLOYER help`** for exact flags; this table is an index.

| Area | Examples |
|------|----------|
| **Prepare** | `prepare upsert` (manual type `1`–`9`, `01`–`09`, or path to JSON), `prepare fn`, `prepare all`, `prepare all-to <dir>` |
| **Send** | `send` with a prepared JSON path or stdin; **`send last-lock`**, **`last-resolve`**, **`last-activate`** pick the newest `/tmp/retropick-*.json` |
| **Batch** | `batch-send <dir>` (optional **`-y`**, **`--resume`**, **`--manifest`**, retries) |
| **Full pipeline** | `deploy-all` (types, steps, resume, dry-run—see **`help`**) |
| **Launch** | `launch` with optional **`open`** / **`--open-at`** / **`--lock-at`** / **`--resolve-at`** |
| **Epoch control** | `activate-epoch`, `advance-epoch` (lock → resolve → open; **`--fast`** for short dev windows), `prepare-lock-epoch`, `prepare-resolve-epoch`, `prepare-open-all`, `resume-open` |
| **Feeds / oracle** | `feeds discover`, `feeds auto-assign`, `feeds fix-adapter` |
| **Recovery** | `auto-deploy`, `recover-feed-drift`; aliases **`recover-stuck-epoch`** / **`recover`** |
| **Monitoring** | `monitor overview`, `monitor trade-ready`, `monitor templates`, `monitor global`, `monitor incidents`, … |
| **Product** | `frontend-visibility` (`hide`, `unhide`, `list`) — toggles indexer/API visibility for discover |
| **Emergency (prepare-only)** | `emergency prepare …` (pause, halt rolling, cancel epoch, …) — inspect JSON then **`send`** |

### Environment variables (common)

Loaded from **`package/contract/.env`** (see **`help`** for the full set):

| Variable | Role |
|----------|------|
| `API_URL` | Backend for calldata preparation (default `http://127.0.0.1:8080`). |
| `RPC_URL` | JSON-RPC for `cast send` / read prechecks. |
| `CAST_ACCOUNT` | Foundry keystore account name for broadcasts. |
| `ETH_PASSWORD` | Optional path to one-line password file for Foundry. |
| `RETRODEPLOYER_*` | Timeouts, work dirs, retries, **`--fast`** epoch windows, index wait after txs, **`NO_COLOR`**, etc.—see **`help`**. |

### When you are stuck

- **On-chain errors** (e.g. `No access`, `TooEarlyToResolve`): `broadcast-prepared-ops-tx.sh` prints hints; feed gating on Base Sepolia is a common cause—follow the **`feeds discover` → `fix-adapter` → re-upsert** path in **`help`** and in the [operator runbook](package/contract/.operator/.runbook.md).
- **Authoritative detail:** always run **`./scripts/RETRODEPLOYER help`** and keep [`.operator/runbook.md`](package/contract/.operator/.runbook.md) open for end-to-end **`upsertTemplate` → `initializeMarket` → epoch** procedures.

---

## Further reading

- Operator flows: [`package/contract/.operator/.runbook.md`](package/contract/.operator/.runbook.md)
- Integration specs and ABI mapping: [`.dev/`](.dev/)
