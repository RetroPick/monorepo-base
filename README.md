# RetroPick

**RetroPick** is a product suite for prediction-market discovery and structured outcomes:

| Product | Description | Client |
|---------|-------------|--------|
| **Markets** | Polymarket-native discovery, trading, portfolio (V1 in progress) | Web, Android |
| **PRISM** | Fully collateralized structured-outcome derivatives (future) | Web |
| **Android** | Native Markets client (Kotlin + Jetpack Compose) | Mobile |

Current Markets V1 authority: `AGENTS.md`.

## Prerequisites

| Tool | Version | Used for |
|------|---------|----------|
| [Docker](https://docs.docker.com/get-docker/) | Desktop or Engine + Compose v2 | **Recommended** — full Markets stack |
| [Node.js](https://nodejs.org/) | 22+ | Web apps, `pnpm` |
| [pnpm](https://pnpm.io/) | 10 | Monorepo installs |
| [Go](https://go.dev/) | 1.24+ (1.26 recommended) | Host-run BFF, backend tests |
| [Foundry](https://book.getfoundry.sh/) | latest | Legacy contract tests only |
| [JDK](https://adoptium.net/) | 17+ | Native Android builds (Capacitor / Gradle) |
| [Android Studio](https://developer.android.com/studio) | latest | Android SDK, emulator, `adb` (native app only) |

On **WSL2**, install Docker Desktop on Windows and enable **WSL integration** for your distro. Verify with `docker info` before starting any compose stack.

---

## Run with Docker (Markets V1 — recommended)

The greenfield Markets product (`apps/web` + `markets-api`) has a **one-command** dev stack via [`docker-compose.markets-dev.yml`](docker-compose.markets-dev.yml). Root [`docker-compose.yml`](docker-compose.yml) is a simplified Markets alias (postgres + markets-api + web).

### Start everything

From the repo root:

```bash
pnpm install
pnpm dev:markets-stack -- --build   # first run or after code changes
pnpm dev:markets-stack              # reuse existing images (fast)
```

Equivalent:

```bash
bash scripts/markets-dev-up.sh --build
retro stack markets up
```

First run with `--build` compiles three images (Postgres base pull, unified Go backend, Next.js web) and can take a few minutes. Subsequent `up` without `--build` reuses images and starts in seconds.

### What runs

Compose file: [`docker-compose.markets-dev.yml`](docker-compose.markets-dev.yml)

```text
postgres (:5433) → markets-api (migrate + seed + serve :8080) → markets-web (:3001)
```

| Service | Host port | Purpose |
|---------|-----------|---------|
| `postgres` | **5433** → 5432 | Projection DB (`retropick` / `retropick`) |
| `markets-api` | **8080** | Go Markets BFF — runs migrations, dev seed, and HTTP ([`cmd/markets-api`](apps/backend/cmd/markets-api)) |
| `markets-web` | **3001** | Next.js Discover UI ([`apps/web`](apps/web)) |

The browser talks to the BFF at `http://127.0.0.1:8080` (baked into the web image). Catalog data comes from a **seeded** Postgres projection — live Polymarket Gamma/CLOB calls are disabled in this stack.

**Open Discover:** [http://localhost:3001/markets](http://localhost:3001/markets)

### Stop, logs, fresh database

```bash
pnpm dev:markets-stack:down          # stop containers (keep DB volume)
pnpm dev:markets-stack:down -- -v   # stop and wipe seeded Postgres

retro stack markets status
retro stack markets logs
retro stack markets logs markets-api
```

### Docker Desktop hairpin (WSL / bridge timeouts)

If Postgres or migrations hang from inside containers, use the hairpin env override:

```bash
docker compose --env-file compose.desktop-hairpin.env \
  -f docker-compose.markets-dev.yml up --build -d
```

See [`compose.desktop-hairpin.env`](compose.desktop-hairpin.env) — routes container DB traffic via `host.docker.internal:5433`.

### Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Cannot connect to Docker daemon` | Start Docker Desktop; enable WSL integration; run `docker info` |
| `port 8080 is already in use` | Stop other processes on 8080/3001/5433 or run `pnpm dev:markets-stack:down` |
| Discover shows API errors | Confirm BFF: `curl -s http://127.0.0.1:8080/api/v1/markets/events \| head` returns JSON, not HTML |
| Empty catalog after wipe | `pnpm dev:markets-stack:down -- -v` then `pnpm dev:markets-stack -- --build` |

Go module for host-run commands is **`apps/backend/`** — there is no `go.mod` at the repo root.

---

## Test the Markets API

### Automated smoke (stack must be running)

```bash
pnpm smoke:markets-stack
# or: retro stack markets smoke
```

Checks liveness, readiness, capabilities, events JSON, `schemaVersion`, and seeded event id `polymarket:event:seed-multi`.

### Manual curl

Base URL: `http://127.0.0.1:8080`

```bash
# Liveness (always 200 when process is up)
curl -s http://127.0.0.1:8080/api/v1/health/live | jq .

# Readiness (200 or 503 with degraded detail)
curl -s http://127.0.0.1:8080/api/v1/health/ready | jq .

# Runtime capabilities
curl -s http://127.0.0.1:8080/api/v1/markets/capabilities | jq .

# Paginated event catalog (seeded in dev stack)
curl -s 'http://127.0.0.1:8080/api/v1/markets/events?limit=5' | jq .

# Event detail (URL-encode canonical ids)
curl -s 'http://127.0.0.1:8080/api/v1/markets/events/polymarket:event:seed-multi' | jq .

# Market detail
curl -s 'http://127.0.0.1:8080/api/v1/markets/markets/polymarket:market:seed-binary' | jq .
```

**Seeded IDs** (populated scenario):

| Resource | ID |
|----------|-----|
| Multi-market event | `polymarket:event:seed-multi` |
| Single-market event | `polymarket:event:seed-single` |
| Binary market (prices) | `polymarket:market:seed-binary` |
| Unavailable prices | `polymarket:market:seed-unavailable` |
| Closed market | `polymarket:market:seed-closed` |

Canonical contract: [`schemas/openapi/markets-v1.yaml`](schemas/openapi/markets-v1.yaml). Full endpoint list: [`apps/backend/internal/markets/README.md`](apps/backend/internal/markets/README.md).

### Browser checks (apps/web)

| Route | URL |
|-------|-----|
| Discover | http://localhost:3001/markets |
| Event | http://localhost:3001/markets/events/polymarket%3Aevent%3Aseed-multi |
| Market | http://localhost:3001/markets/m/polymarket%3Amarket%3Aseed-binary |

In DevTools → Network, catalog requests should go to **`127.0.0.1:8080`**, not to `gamma-api.polymarket.com` or the Next.js origin.

---

## Alternative: host-run (no web container)

Use when iterating on `apps/web` with hot reload while BFF runs in Docker or on the host.

**BFF + Postgres (host Go):**

```bash
docker compose -f docker-compose.markets-dev.yml up -d postgres
# wait for :5433, then:
export DATABASE_URL=postgres://retropick:retropick@127.0.0.1:5433/retropick?sslmode=disable
export MARKETS_CATALOG_ENABLED=1
go -C apps/backend run ./cmd/markets-seed -scenario populated
go -C apps/backend run ./cmd/markets-api
```

**Web dev server:**

```bash
cd apps/web
cp .env.local.example .env.local   # optional; defaults to http://127.0.0.1:8080 in dev
pnpm dev                           # http://localhost:3001
```

Legacy **fe-v1** + host BFF (Vite on `:5173`): `bash scripts/markets-v1-bff-dev.sh populated`

More detail: [`apps/web/README.md`](apps/web/README.md), [`docs/architecture/fe-v1-markets-bff-dev.md`](docs/architecture/fe-v1-markets-bff-dev.md)

---

## Run Android locally (`apps/android`)

[`apps/android`](apps/android) is a **Capacitor + Next.js** mobile prototype (git submodule → [RetroPick-Android](https://github.com/RetroPick/RetroPick-Android)). It ships mock catalog data from `lib/retropick-data.ts` and does **not** call the Markets BFF yet. The production target is a greenfield **Kotlin + Jetpack Compose** app (`apps/android-markets/`, PHASE-5) — see [`.dev/ANDROID_MARKETS.md`](.dev/ANDROID_MARKETS.md).

### Submodule checkout

If `apps/android` is empty:

```bash
git submodule update --init apps/android
cd apps/android && pnpm install
```

### Browser preview (fastest)

Good for UI iteration without Android Studio:

```bash
cd apps/android
pnpm install          # first run
pnpm dev              # http://localhost:3000
```

### Native Android (emulator or device)

**Prerequisites:** Node/pnpm, JDK 17+, Android Studio with SDK (compile SDK 36), platform tools (`adb`), and an emulator or USB-debugged device.

Set SDK env vars (adjust path to your install):

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"
```

On **WSL2**, install Android Studio on **Windows** and either open the project from `\\wsl$\...` or point `ANDROID_HOME` at the Windows SDK. Running the emulator purely inside WSL is often unreliable; Windows-side Android Studio is the smoother path.

**Build, sync, and run** from `apps/android`:

```bash
pnpm install
pnpm build              # static export → out/
npx cap sync android    # copy web assets into android/
npx cap run android     # deploy to emulator/device
# or: npx cap open android   → Run (▶) in Android Studio
```

**Gradle directly** (after `cap sync`):

```bash
cd android
./gradlew installDebug
adb shell am start -n com.retropick.app/.MainActivity
```

### Dev loop after UI changes

Capacitor serves the static `out/` bundle — rebuild and re-sync after edits:

```bash
pnpm build && npx cap sync android
```

Use `pnpm dev` in the browser for faster UI work; use the native build when you need device behavior.

### Troubleshooting

| Symptom | Fix |
|---------|-----|
| `ERR_SDK_NOT_FOUND` | Install Android Studio; set `ANDROID_HOME`; ensure `adb` is on `PATH` |
| Empty or stale UI on device | Run `pnpm build && npx cap sync android` before re-launching |
| Gradle / JDK errors | Use JDK 17+; open `android/` in Android Studio and sync Gradle |
| No devices listed | Start an emulator in Android Studio, or enable USB debugging on a physical device |

---

## Simplified local stack (`docker-compose.yml`)

Root [`docker-compose.yml`](docker-compose.yml) is a **Markets alias** (postgres + `markets-api` + `apps/web`). Prefer the seeded stack:

```bash
pnpm dev:markets-stack
pnpm docker:up              # alias → markets-dev-up.sh
pnpm docker:down            # alias → markets-dev-down.sh
retro stack dev up            # same as docker-compose.yml
```

Do **not** run two stacks that both bind **8080** at once.

---

## Documentation

| Resource | Path |
|----------|------|
| Product suite | [`.dev/README.md`](.dev/README.md) |
| Markets V1 harness | [`.dev/markets-v1/`](.dev/markets-v1/) |
| Markets web app | [`apps/web/README.md`](apps/web/README.md) |
| Android product spec | [`.dev/ANDROID_MARKETS.md`](.dev/ANDROID_MARKETS.md) |
| BFF architecture | [`apps/backend/internal/markets/README.md`](apps/backend/internal/markets/README.md) |
| Architecture | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| OpenAPI | [`schemas/openapi/markets-v1.yaml`](schemas/openapi/markets-v1.yaml) |
| Agent contract | [`.harness/products/markets-v1/governance/AGENT_OPERATING_CONTRACT.md`](.harness/products/markets-v1/governance/AGENT_OPERATING_CONTRACT.md) |
Current Markets V1 authority: `AGENTS.md`.
| Markets-only backend | [`docs/engineering/adr/ADR-R5-MARKETS-ONLY-BACKEND.md`](docs/engineering/adr/ADR-R5-MARKETS-ONLY-BACKEND.md) |

## Monorepo layout

```text
apps/web              Markets Next.js shell (Discover on :3001)
apps/android          Markets Android gitlink (RetroPick-Android)
apps/backend          Go Markets BFF (cmd/markets-api, internal/markets)
packages/polymarket   Shared TS client + types
schemas/openapi       Web + Android API contract
docker-compose.markets-dev.yml   One-button Markets V1 stack
Current Markets V1 authority: `AGENTS.md`.
```

## Verify (without Docker)

```bash
pnpm --filter @retropick/markets-web test:markets
pnpm --filter @retropick/markets-web typecheck
go -C apps/backend test ./internal/markets/...
pnpm smoke                        # full backend Go test suite
```

Deploy env templates: [`deploy/web-markets/.env.example`](deploy/web-markets/.env.example), [`apps/web/.env.local.example`](apps/web/.env.local.example).
