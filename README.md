# RetroPick V1

**RetroPick** is an **on-chain prediction market engine** for Base Sepolia: one upgradeable **`MarketEngine`** hosts **many markets** (templates), each running **epochs**—open → lock → resolve → claim—with settlement driven by **Chainlink-family oracles** and optional trusted reporters. Operators define markets via `upsertTemplate` / `initializeMarket`; traders deposit stake on sides per epoch; winners claim after resolution; protocol fees route to treasury.

**Problem addressed:** Teams need a **single protocol instance** that supports **many market shapes** (direction, thresholds, ranges, composites, …), **professional ops** (templates, epochs, treasury), and **flexible automation** (manual keeper steps vs rolling rounds)—not one-off pools per market.

**How it fits together (off-chain stack):** This monorepo adds Solidity (`contracts/legacy-pool-v1`), shared ABIs (`packages/legacy/abi`), a **Go API + indexer** (`apps/backend`), the **user app** (`apps/web`), and an **operator dashboard** (`apps/ops-web`). Deep contract behavior—including modular `MarketEngineDispatcher`, oracle routing, checkpoints, and gas notes—is documented in [`contracts/legacy-pool-v1/currentSmartContract.md`](contracts/legacy-pool-v1/currentSmartContract.md).

**Differentiators**

- **Modular UUPS engine:** Admin, user, and claims hot paths on the dispatcher; lifecycle and views delegated to modules; one storage layout ([`MarketEngineState`](contracts/legacy-pool-v1/src/engine/MarketEngineState.sol)).
- **Multi-adapter Chainlink routing:** Templates select oracle class (price, rate, smart data, macro, equity) per [`currentSmartContract.md`](contracts/legacy-pool-v1/currentSmartContract.md) §1.2.
- **Epoch modes:** **Manual** epochs (discrete `openEpoch` / `lockEpoch` / `resolveEpoch`) vs **rolling** automation where a keeper advances the pipeline on an interval—see the same doc for ops narrative (§0.3).

---

## README Guide

- [Project explanation](#project-explanation)
- [Setup](#setup)
- [Debug](#debug)
- [Curl](#curl)
- [Test script](#test-script)
- [Architecture and deep reference](#architecture-and-deep-reference)

---

## Project explanation

RetroPick combines:

- **Smart contracts** for market lifecycle, settlement, and claims.
- **Go backend** for API, indexer, funding flow, and realtime events.
- **Frontend apps** for users and operators.

At a high level:

1. Operators create and initialize markets.
2. Users trade during epoch open windows.
3. Epochs lock and resolve via configured oracle routes.
4. Winners claim and fees route to treasury.
5. Optional funding abstraction lets users bridge/swap into settlement USDC balance.

For full protocol internals, see [`contracts/legacy-pool-v1/currentSmartContract.md`](contracts/legacy-pool-v1/currentSmartContract.md).

---

## Setup

### Operator CLI

Use the root-aware `retro` launcher from any directory:

```bash
retro doctor
retro costs estimate --rpc-url https://mainnet.base.org --json --color always
retro stack dev up -d --build
retro stack prod config
retro stack prod up -d --build
retro stack prod smoke
retro db backup
retro contracts test
retro market help
```

`contracts/legacy-pool-v1` is the canonical Foundry tree. `contracts/legacy-pool-v1` remains a compatibility symlink for older links and scripts.

### Prerequisites

| Tool | Notes |
|------|--------|
| **Node.js** | 20+ |
| **pnpm** | 10.x (see [`package.json`](package.json) `packageManager`) |
| **Docker & Docker Compose** | Recommended for Postgres + API + indexer + ops |
| **Docker Buildx** | Required by Compose v2 Bake builds |
| **Go** | 1.24+ optional when running backend on host |

### First install

From repo root:

```bash
pnpm install
```

### Monorepo workflow

Root commands:

```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm check
pnpm contracts:build
pnpm contracts:test
```

Shared TypeScript package destinations live under `packages/*`, including market labels, payout math, event envelopes, validators, chain abstractions, and future resolution/equivalence foundations. Keep app adoption incremental and test-backed.

### Start full stack (recommended)

```bash
docker compose up -d --build
```

If Docker Desktop bridge cannot reach `postgres:5432`, use:

```bash
docker compose --env-file compose.desktop-hairpin.env up -d --build
```

If backend need update, use:

```bash
pnpm docker:down && pnpm docker:up
```

### Start frontends

```bash
# User app
pnpm dev:web

# Operator app
pnpm dev:ops-web

# Docs app
pnpm dev:docs
```

---

## Curl

### Basic health

```bash
curl -sS http://127.0.0.1:8080/api/v1/health
curl -sS http://127.0.0.1:8080/api/v1/config/contracts
```

### Funding abstraction (quick checks)

```bash
curl -sS http://127.0.0.1:8080/api/funding/config
curl -sS http://127.0.0.1:8080/api/funding/intents/<intentId>
curl -sS http://127.0.0.1:8080/api/funding/executions/<executionId>
```

---

## Test script

Use the complete testnet funding smoke script in:

- [Funding abstraction (testnet smoke script)](#funding-abstraction-testnet-smoke-script)

It covers intent creation, option selection, execution tracking, optional webhook hints, and final balance/intent polling.

---

## Debug

### Common checks

1. **API is up:** `/api/v1/health` returns `ok: true`.
2. **Contracts loaded:** `/api/v1/config/contracts` returns expected chain and addresses.
3. **Migrations applied:** new funding tables/columns exist before testing abstraction flow.
4. **Workers running:** credit, matcher, destination poller should be active in API logs.

### Frequent issues

- **Funding endpoints return 404:** backend process is not running latest code or not restarted after changes.
- **No destination credits:** verify `SETTLEMENT_*` env vars, poller/matcher intervals, and destination transfer ingestion rows.
- **Docker Buildx warnings:** install buildx plugin (see Troubleshooting section).

---

## Architecture and deep reference

## Architecture at a glance

High-level protocol flow (deploy → template → epochs → settlement → treasury), aligned with §0.5 of [`currentSmartContract.md`](contracts/legacy-pool-v1/currentSmartContract.md):

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

Conceptual **epoch lifecycle** (one round per template; exact rules vary by [`MarketType`](contracts/legacy-pool-v1/.operator/.marketType.md)). Users typically **deposit or switch sides** while the epoch is **open** (and where allowed **before lock**); **manual** vs **rolling** differs in **how** the admin/keeper advances open/lock/resolve:

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

The canonical **`MarketType`** set has **nine** variants: **Direction**, **Threshold**, **RangeClose**, **Velocity**, **Ladder**, **Convergence**, **Composite**, **Corridor**, **Cascade**. For guarded launches, **Direction / Threshold / RangeClose** are the lowest operator burden; **Convergence / Composite / Corridor / Cascade** need the most oracle and incident discipline. Full approval guidance is in [`contracts/legacy-pool-v1/.operator/.marketType.md`](contracts/legacy-pool-v1/.operator/.marketType.md).

---

## Hackathon demo path

- Fund exploration from **`TokenFaucet`** on Base Sepolia (address below; explorers in [`packages/legacy/abi/address.md`](packages/legacy/abi/address.md)).
- Run **`docker compose up`** plus **`pnpm dev:web`** / **`pnpm dev:ops-web`** (see below) so judges see indexer-backed UI against the deployed engine.
- Deep operator flows (`upsertTemplate`, `initializeMarket`, epoch actions): [`contracts/legacy-pool-v1/.operator/.runbook.md`](contracts/legacy-pool-v1/.operator/.runbook.md).

---

## Base Sepolia deployment (judges)

**Chain id `84532`.** Use the **MarketEngine proxy** for all routine reads and writes; implementation addresses are for verification/debugging only ([`address.md`](packages/legacy/abi/address.md) notes).

| Role | Address |
|------|---------|
| **MarketEngine proxy** (`ERC1967`) | `0x1ed89defc8fbcbd512c562b148868ffdc778018a` |
| **Implementation** (`MarketEngineDispatcher`) | `0xf8b69b881fb35feb804cfec761fdeb88c4e45ef1` |
| **TokenFaucet** | `0xf6c1b6bddd06972f08772de7954432e10c853231` |
| **MockERC20 stake** (`mSTK`, 18 decimals) | `0xb7f49377af6adbef64f513cf04dbdac9d0af01b1` |

**Oracle adapters** (ChainlinkAdapter, Rate, SmartData, Macro, Equity) and **lifecycle modules** (View, CoreLifecycle, RollingLifecycle, Admin, UserOpsClaims) — full list with **Basescan / Blockscout** links: [`packages/legacy/abi/address.md`](packages/legacy/abi/address.md).

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

In-stack **`DATABASE_URL`** defaults to **`postgres:5432`** (Compose service DNS). That matches **Linux Docker Engine**, **WSL**, and many setups.

If **`retropick-migrator`** waits ~5 minutes then exits **1** while Postgres is healthy (Docker Desktop userland bridge cannot reach **`postgres:5432`**), start with the host-published port:

```bash
docker compose --env-file compose.desktop-hairpin.env up -d --build
```

(`compose.desktop-hairpin.env` sets **`host.docker.internal:5433`**; **`extra_hosts: host.docker.internal:host-gateway`** is already in **`docker-compose.yml`** so that name resolves on engines that do not define it—fixing **`no such host`**.)

Shortcuts: `pnpm docker:up`, `pnpm docker:up:desktop`, `pnpm docker:down`, `pnpm docker:build`. Image builds use **BuildKit** by default (expects `DOCKER_BUILDKIT=1`) for layer and cache mounts in Dockerfiles.

| Service | Host port | Purpose |
|---------|-----------|---------|
| Postgres | `5433`→`5432` | Published on host `5433` (container still listens on `5432`); avoids host conflicts on `5432` |
| API | `8080` | REST + WebSocket; migrations run in `cmd/api` on startup |
| Indexer | — | Follows Base Sepolia via `RPC_URL` |
| Ops | `3001` | Next.js operator UI |

Compose defaults align with **`84532`**: `RPC_URL=https://sepolia.base.org`. In-stack **`DATABASE_URL`** defaults to **`postgres:5432`**; use **`compose.desktop-hairpin.env`** (or **`RETROPICK_COMPOSE_DATABASE_URL`**) when the bridge path to Postgres times out. Host tools use **`127.0.0.1:5433`**.

### Verify

```bash
curl -sS http://127.0.0.1:8080/api/v1/health
curl -sS http://127.0.0.1:8080/api/v1/config/contracts
```

### Funding abstraction (testnet smoke script)

Use this script to smoke-test the target-amount funding abstraction flow on testnet once the API is running with latest migrations and env vars (`SETTLEMENT_*`, `LIFI_*`, poll/matcher intervals, etc.).

```bash
#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:8080}"
WALLET="${WALLET:-}"
TARGET_AMOUNT="${TARGET_AMOUNT:-25.00}"
WEBHOOK_SECRET="${LIFI_WEBHOOK_SECRET:-}"
CLIENT_NONCE="${CLIENT_NONCE:-smoke-$(date +%s)}"

if [[ -z "$WALLET" ]]; then
  echo "Set WALLET=0x... before running."
  exit 1
fi

echo "== Health and contracts =="
curl -fsS "$BASE_URL/api/v1/health" | jq .
curl -fsS "$BASE_URL/api/v1/config/contracts" | jq .

echo "== Funding config =="
curl -fsS "$BASE_URL/api/funding/config" | jq .

echo "== Create intent =="
CREATE_RESP="$(curl -fsS -X POST "$BASE_URL/api/funding/intents" \
  -H "Content-Type: application/json" \
  -d "{
    \"userAddress\":\"$WALLET\",
    \"targetCurrency\":\"USD\",
    \"targetAmount\":\"$TARGET_AMOUNT\",
    \"clientNonce\":\"$CLIENT_NONCE\",
    \"mode\":\"AUTO_BEST_SOURCE\"
  }")"
echo "$CREATE_RESP" | jq .
INTENT_ID="$(echo "$CREATE_RESP" | jq -r '.intentId')"

echo "== Scan balances / build options =="
curl -fsS -X POST "$BASE_URL/api/funding/intents/$INTENT_ID/scan-balances" \
  -H "Content-Type: application/json" \
  -d '{}' | jq .

echo "== Fetch options =="
OPTIONS_RESP="$(curl -fsS "$BASE_URL/api/funding/intents/$INTENT_ID/options")"
echo "$OPTIONS_RESP" | jq .
OPTION_ID="$(echo "$OPTIONS_RESP" | jq -r '.recommendedOptionId // (.options[0].optionId // empty)')"
if [[ -z "$OPTION_ID" ]]; then
  echo "No funding option available."
  exit 1
fi

echo "== Select option =="
SELECT_RESP="$(curl -fsS -X POST "$BASE_URL/api/funding/intents/$INTENT_ID/select-option" \
  -H "Content-Type: application/json" \
  -d "{\"optionId\":\"$OPTION_ID\"}")"
echo "$SELECT_RESP" | jq .
EXECUTION_ID="$(echo "$SELECT_RESP" | jq -r '.execution.executionId')"

echo "== Fetch execution payload (canonical route) =="
curl -fsS "$BASE_URL/api/funding/executions/$EXECUTION_ID" | jq .

echo
echo "Manual wallet step required next:"
echo "1) Execute the serialized route from FE/wallet."
echo "2) Capture source tx hash as SOURCE_TX_HASH."
echo
read -r -p "Enter SOURCE_TX_HASH (0x...) to continue, or Ctrl+C to stop: " SOURCE_TX_HASH

echo "== Mark execution started =="
curl -fsS -X POST "$BASE_URL/api/funding/executions/$EXECUTION_ID/start" \
  -H "Content-Type: application/json" \
  -d "{\"walletAddress\":\"$WALLET\",\"clientRouteExecutionId\":\"$(uuidgen)\"}" | jq .

echo "== Submit source tx =="
curl -fsS -X POST "$BASE_URL/api/funding/executions/$EXECUTION_ID/source-tx" \
  -H "Content-Type: application/json" \
  -d "{\"chainId\":84532,\"txHash\":\"$SOURCE_TX_HASH\"}" | jq .

echo "== Route update hint =="
curl -fsS -X POST "$BASE_URL/api/funding/executions/$EXECUTION_ID/route-update" \
  -H "Content-Type: application/json" \
  -d "{
    \"status\":\"BRIDGING\",
    \"observedTxHashes\":[{\"chainId\":84532,\"txHash\":\"$SOURCE_TX_HASH\",\"stepIndex\":0,\"type\":\"SOURCE\"}]
  }" | jq .

if [[ -n "$WEBHOOK_SECRET" ]]; then
  echo "== Optional LI.FI webhook hint =="
  curl -fsS -X POST "$BASE_URL/api/funding/webhooks/lifi" \
    -H "Content-Type: application/json" \
    -H "X-Lifi-Webhook-Secret: $WEBHOOK_SECRET" \
    -d "{
      \"eventId\":\"smoke-$EXECUTION_ID\",
      \"eventType\":\"ROUTE_UPDATE\",
      \"executionId\":\"$EXECUTION_ID\",
      \"status\":\"BRIDGING\",
      \"sourceTxHash\":\"$SOURCE_TX_HASH\"
    }" | jq .
fi

echo "== Poll intent + balance =="
for i in $(seq 1 20); do
  INTENT_RESP="$(curl -fsS "$BASE_URL/api/funding/intents/$INTENT_ID")"
  STATUS="$(echo "$INTENT_RESP" | jq -r '.status')"
  echo "intent status: $STATUS"
  if [[ "$STATUS" == "CREDITED" || "$STATUS" == "MANUAL_REVIEW" || "$STATUS" == "FAILED" ]]; then
    break
  fi
  sleep 3
done

curl -fsS "$BASE_URL/api/users/$WALLET/balance" | jq .

cat <<'EOF'

Expected DB progression:
- destination_usdc_transfers: UNMATCHED -> matched_* populated -> CREDITED (or AMOUNT_TOO_LOW)
- funding_executions: source_tx_hash/destination_tx_hash/provider_status updated
- funding_intents: BRIDGING -> CREDITED (or MANUAL_REVIEW/FAILED)
- user_balances + balance_ledger updated on credit
EOF
```

Notes:
- The script uses `jq` and `uuidgen`; install them if missing.
- Replace `chainId` in `source-tx` payload if your source chain differs from `84532`.
- Webhook is optional and non-authoritative; credit still requires verified destination transfer ingestion.

Stop containers (`docker compose down`; add `-v` to remove the Postgres volume).

---

## Environment templates

| File | Use |
|------|-----|
| [`.env.example`](.env.example) | Host-run Go API / indexer (`DATABASE_URL`, `PORT`, `RPC_URL`, …) |
| [`compose.desktop-hairpin.env`](compose.desktop-hairpin.env) | `RETROPICK_COMPOSE_DATABASE_URL` → `host.docker.internal:5433` when `postgres:5432` from containers fails |
| [`docker-compose.yml`](docker-compose.yml) | Container defaults; optional `RETROPICK_COMPOSE_DATABASE_URL` interpolation |
| [`apps/web/.env.local.example`](apps/web/.env.local.example) | `NEXT_PUBLIC_API_URL`, optional `NEXT_PUBLIC_DOCS_URL`, and `NEXT_PUBLIC_REOWN_PROJECT_ID` (Reown / WalletConnect) for the user app |
| [`apps/ops-web/.env.local.example`](apps/ops-web/.env.local.example) | `NEXT_PUBLIC_API_URL` for the operator UI |
| [`contracts/legacy-pool-v1/.env.example`](contracts/legacy-pool-v1/.env.example) | Foundry / deployment scripts |

Do not commit real `.env` files (see root [`.gitignore`](.gitignore)).

**Watchlist mutations:** `POST /api/v1/user/watchlist` accepts JSON with `wallet`, `action`, and `templateId` / `templateIds` only (no signature). **Note:** any client can send any `wallet` address; protect the API with network policy or add your own auth if you expose it publicly.

---

## Frontends against a local API

Ensure the API is reachable (default `http://127.0.0.1:8080`).

```bash
# User app — http://localhost:3000
pnpm dev:web

# Operator UI — prefers port 3001 (see apps/ops-web/scripts/dev.mjs)
pnpm dev:ops-web

# Docs — http://localhost:3002/docs
pnpm dev:docs
```

If the API is not on `127.0.0.1:8080`, set `NEXT_PUBLIC_API_URL` for `apps/web` and `apps/ops-web` (browser-side requests). If docs are not on `localhost:3002`, set `NEXT_PUBLIC_DOCS_URL` for `apps/web`. Set `NEXT_PUBLIC_REOWN_PROJECT_ID` to override the bundled Reown (WalletConnect Cloud) project id; in the [Reown Dashboard](https://dashboard.reown.com) enable **Google** under Email & Socials and add your app origins (e.g. `http://localhost:3000`) under allowed domains.

Use a wallet on **Base Sepolia** with test ETH/USDC per your deployment.

---

## Production deployment

Step-by-step walkthrough (why Vercel and the API are separate, env vars, CORS, smoke tests): **[docs/vercel-and-api-deployment.md](docs/vercel-and-api-deployment.md)**.

Non-production experiment — hosting **only** the Go API on Vercel (`apps/backend`, `cmd/api`): **[docs/archive/design/vercel-backend.md](docs/archive/design/vercel-backend.md)** (see [PRODUCTION.md](PRODUCTION.md) for supported shapes; indexer needs a persistent host).

Deploy the browser apps and Go backend as separate services:

| Service | Recommended target | Notes |
|---------|--------------------|-------|
| User app | Vercel project rooted at `apps/web` | Build command: `cd ../.. && pnpm --filter web build` |
| Docs | Vercel project rooted at `apps/docs` | Build command: `cd ../.. && pnpm --filter docs build` |
| API | Container host from [`apps/backend/Dockerfile`](apps/backend/Dockerfile) with `SERVICE=api` | Expose HTTPS at a public API domain |
| Indexer | Container host from [`apps/backend/Dockerfile`](apps/backend/Dockerfile) with `SERVICE=indexer` | Long-running worker; no public port required |
| Migrator | Release/predeploy job with `SERVICE=migrator` | Run before API/indexer start after schema changes |
| Postgres | Managed Postgres | Use provider-required SSL settings, commonly `sslmode=require` |

Vercel only deploys the selected root directory. A project rooted at `apps/web` will not run `apps/backend` or `apps/docs`, so production must not rely on local fallbacks like `127.0.0.1:8080` or `localhost:3002`.

Set these Vercel variables on the `apps/web` project:

```bash
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_DOCS_URL=https://docs.example.com/docs
NEXT_PUBLIC_REOWN_PROJECT_ID=d2f5d76bb1b000f9443e2172d3a560ba
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
   export DATABASE_URL='postgres://retropick:retropick@127.0.0.1:5433/retropick?sslmode=disable'
   export PORT=8080
   export RPC_URL=https://sepolia.base.org
   ```

3. From `apps/backend`:

   ```bash
   GOTOOLCHAIN=auto go run ./cmd/api
   ```

Live operator RPC routes (`/api/v1/ops/live/*`) need `RPC_URL` and ABIs under `apps/backend/internal/abis/` (aligned with [`packages/legacy/abi`](packages/legacy/abi)).

---

## Testing

```bash
# All workspace packages that define a test script (frontend Vitest today)
pnpm test

# Explicit targets
pnpm --filter web test
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

**`retro market`** is the operator workflow entry point. The compatibility script [`scripts/RETRODEPLOYER`](scripts/RETRODEPLOYER) builds calldata through the local API and broadcasts with Foundry `cast send`. Repository-owned helpers live under [`scripts/market`](scripts/market); contract sources remain under [`contracts/legacy-pool-v1`](contracts/legacy-pool-v1).

### Requirements

| Requirement | Why |
|-------------|-----|
| **Run from the monorepo root** | Paths assume `$V1_ROOT`; `cd contracts/legacy-pool-v1` and running a different `./scripts/` will not work as documented. |
| **Go API up** | Prepare flows need **`API_URL`** (default `http://127.0.0.1:8080`). Start Docker Compose (or host API) before `prepare` / `deploy-all`. |
| **`contracts/legacy-pool-v1/.env`** | Copy from [`contracts/legacy-pool-v1/.env.example`](contracts/legacy-pool-v1/.env.example). At minimum set **`RPC_URL`**, **`CAST_ACCOUNT`** (Foundry keystore account name), and optionally **`ETH_PASSWORD`** or your usual Foundry password setup. **`API_URL`** overrides the default if your API is not on localhost:8080. |

Upsert fixtures live under **`contracts/legacy-pool-v1/.operator/upsert-params/`** (override with **`UPSERT_DIR`**). Calldata always comes from the API before on-chain broadcast. Keep `contracts/legacy-pool-v1` only as a compatibility alias; use `contracts/legacy-pool-v1` in new documentation.

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

Loaded from **`contracts/legacy-pool-v1/.env`** (see **`help`** for the full set):

| Variable | Role |
|----------|------|
| `API_URL` | Backend for calldata preparation (default `http://127.0.0.1:8080`). |
| `RPC_URL` | JSON-RPC for `cast send` / read prechecks. |
| `CAST_ACCOUNT` | Foundry keystore account name for broadcasts. |
| `ETH_PASSWORD` | Optional path to one-line password file for Foundry. |
| `RETRODEPLOYER_*` | Timeouts, work dirs, retries, **`--fast`** epoch windows, index wait after txs, **`NO_COLOR`**, etc.—see **`help`**. |

### When you are stuck

- **On-chain errors** (e.g. `No access`, `TooEarlyToResolve`): `broadcast-prepared-ops-tx.sh` prints hints; feed gating on Base Sepolia is a common cause—follow the **`feeds discover` → `fix-adapter` → re-upsert** path in **`help`** and in the [operator runbook](contracts/legacy-pool-v1/.operator/.runbook.md).
- **Authoritative detail:** always run **`./scripts/RETRODEPLOYER help`** and keep [`.operator/runbook.md`](contracts/legacy-pool-v1/.operator/.runbook.md) open for end-to-end **`upsertTemplate` → `initializeMarket` → epoch** procedures.

---

## Further reading

- Documentation map: [`docs/README.md`](docs/README.md)
- Operator flows: [`contracts/legacy-pool-v1/.operator/.runbook.md`](contracts/legacy-pool-v1/.operator/.runbook.md)
- Integration specs and ABI mapping: [`.dev/`](.dev/)
