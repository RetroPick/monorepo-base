> **Archived — non-production experiment.** Supported deploy shapes: [`PRODUCTION.md`](../../../PRODUCTION.md). Prefer [`docs/vercel-and-api-deployment.md`](../../vercel-and-api-deployment.md) for frontend + API split.

# Tutorial: Deploy RetroPick Go API on Vercel

This guide deploys **only** the HTTP API in [`apps/backend`](../apps/backend) (`cmd/api`) to [Vercel’s Go runtime](https://vercel.com/docs/functions/runtimes/go). Your **Postgres** database must be hosted elsewhere (Neon, Supabase, RDS, etc.). Vercel does **not** run Docker images from [`Dockerfile`](../apps/backend/Dockerfile); it compiles Go from source.

**Important limits**

| Component | On Vercel (this tutorial) | Not covered here |
|-----------|---------------------------|------------------|
| **API** (`cmd/api`) | Yes — supported entrypoint `cmd/api/main.go` | — |
| **Migrator** (`cmd/migrator`) | Run **once** from your machine or CI (see Step 2) | Not a long-lived Vercel service |
| **Indexer** (`cmd/indexer`) | **No** — Vercel’s Go preset only looks for `main.go`, `cmd/api/main.go`, or `cmd/server/main.go`. Host the indexer on Fly, Railway, Render, a VPS, etc. | Required for chain sync / live index updates |
| **Postgres** | External provider | Vercel is not a database host |

If you need the **indexer** in production, plan a **second** deployment (container platform or always-on VM) with the same `DATABASE_URL` and `RPC_URL` as the API.

---

## Prerequisites

- Git repository (GitHub, GitLab, or Bitbucket) with this monorepo.
- A Vercel account.
- A **managed Postgres** instance reachable from the public internet, with a connection string (usually `sslmode=require`).
- Local **Go toolchain** (optional but recommended) to run the migrator in Step 2—matching [`apps/backend/go.mod`](../apps/backend/go.mod) (`go 1.24.x` as of this repo).

---

## Step 1 — Create the database

1. Create a database (examples: [Neon](https://neon.tech), [Supabase](https://supabase.com), AWS RDS, etc.).
2. Copy both **connection URIs**:
   - **Transaction pooler** (recommended for Vercel/serverless runtime).
   - **Direct connection** (useful for local/CI migrations).
3. For Supabase, open your project and use the top-bar **Connect** button, then choose the connection string type.
4. For TLS, URIs typically look like:
   ```text
   # Vercel runtime (pooler)
   postgresql://postgres.PROJECT_REF:PASSWORD@aws-REGION.pooler.supabase.com:6543/postgres?sslmode=require

   # Local/CI migration (direct)
   postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres?sslmode=require
   ```
5. Allow **incoming connections** from Vercel’s egress IPs if your provider uses IP allowlists (many managed providers use hostname + TLS and do not require this).

Keep this URI secret; you will add it as `DATABASE_URL` in Vercel in Step 4.

---

## Step 2 — Run migrations (before the first API deploy)

The API process **waits** for an existing, non-dirty migration state (`schema_migrations`). It does **not** apply migrations for you on startup. The **migrator** binary applies embedded SQL under [`apps/backend/migrations`](../apps/backend/migrations).

From your laptop or CI, use your **direct** Postgres URL first (`:5432`) for migrations:

```bash
cd apps/backend
export DATABASE_URL='postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres?sslmode=require'
GOTOOLCHAIN=auto go run ./cmd/migrator
```

Expect a clean exit. If this fails, fix credentials or network before deploying the API.

Whenever you **upgrade** the repo and new migration files appear, run the migrator again **before** or **right after** deploying a new API version (same as any other host).

---

## Step 3 — Create a Vercel project for the API

1. In [Vercel Dashboard](https://vercel.com/dashboard) → **Add New…** → **Project**.
2. **Import** your Git repository.
3. Open **Configure Project**:
   - **Root Directory**: set to **`apps/backend`** (not the monorepo root).
   - **Framework Preset**: choose **Go**  
     ([docs](https://vercel.com/docs/functions/runtimes/go): Vercel detects `go.mod` and `cmd/api/main.go`.)
4. Leave the default **Build** / **Output** for Go unless Vercel shows a custom suggestion (the repo may include [`apps/backend/vercel.json`](../apps/backend/vercel.json) for build flags only).
5. **Deploy** once (it will likely fail until env vars exist—that is OK, or add vars first in Step 4).

### Monorepo note

Only **`apps/backend`** is built for this project. The Next.js app in `apps/fe-v1` stays on a **separate** Vercel project (or another host).

---

## Step 4 — Environment variables

In the **API** Vercel project → **Settings** → **Environment Variables**, add at least:

| Name | Value | Notes |
|------|--------|------|
| `DATABASE_URL` | Your Postgres URI | For Vercel runtime, use Supabase **transaction pooler** (`:6543`) with `sslmode=require`. Required by [`internal/config/config.go`](../apps/backend/internal/config/config.go). |
| `RPC_URL` | e.g. `https://sepolia.base.org` | JSON-RPC for chain reads; defaults in code if unset, but set explicitly in production. |
| `PORT` | *(usually omit)* | Vercel sets `PORT` automatically; [`internal/config/config.go`](../apps/backend/internal/config/config.go) reads it. |

**CORS** (browser calls from `fe-v1` on another origin):

| Name | Example |
|------|---------|
| `CORS_STRICT` | `1` |
| `CORS_ALLOWED_ORIGINS` | `https://your-app.vercel.app,https://your-domain.com` |
| `CORS_ALLOWED_ORIGIN_PATTERNS` | `https://*.vercel.app` *(optional, for preview URLs)* |

See [README § Production deployment](../README.md#production-deployment) and [`internal/api/cors.go`](../apps/backend/internal/api/cors.go).

Optional tuning (same as Docker/host):

- `DB_MAX_CONNS`, `DB_MIN_CONNS`, `LOG_LEVEL`, etc. (see [`.env.example`](../.env.example)).

Apply variables to **Production** (and **Preview** if you deploy preview APIs).

**Redeploy** after changing variables so new values apply.

---

## Step 5 — Custom domain (recommended)

1. **Settings** → **Domains** → add `api.yourdomain.com`.
2. Follow Vercel DNS instructions (CNAME / A records).
3. Use that HTTPS URL as **`NEXT_PUBLIC_API_URL`** on your **frontend** project (see Step 7).

Until then, the default `*.vercel.app` URL is fine for testing (still HTTPS).

---

## Step 6 — Verify the API

Replace the host with your deployment URL:

```bash
curl -sS https://YOUR-API.vercel.app/api/v1/health
curl -sS https://YOUR-API.vercel.app/api/v1/markets
```

- **502 / crash**: check **Vercel** → **Deployments** → **Functions** / logs — common causes: missing `DATABASE_URL`, migrations not run, wrong `RPC_URL`, or DB firewall.
- **401/403 CORS in browser**: adjust `CORS_*` env vars and redeploy.

If you use **WebSockets** (`/ws`), test from the browser or a WS client; behavior can differ from a single long-lived VPS—confirm for your traffic pattern.

---

## Step 7 — Point the frontend at this API

On your **`apps/fe-v1`** Vercel project:

1. **Settings** → **Environment Variables**:
   - `NEXT_PUBLIC_API_URL` = `https://YOUR-API.vercel.app` (or your custom domain).
2. **Redeploy** `fe-v1` so Next embeds the value at build time.

The frontend must **not** use `localhost` for production (see [`next.config.mjs`](../apps/fe-v1/next.config.mjs) when `VERCEL` is set).

---

## Supabase-specific values (RetroPick current project)

If your Supabase project is `udhtksxrhjywyqqtxrnw` and region pooler host is `aws-1-ap-southeast-2.pooler.supabase.com`, the runtime URI shape is:

```text
postgresql://postgres.udhtksxrhjywyqqtxrnw:PASSWORD@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=require
```

For migration from local/CI, use direct:

```text
postgresql://postgres:PASSWORD@db.udhtksxrhjywyqqtxrnw.supabase.co:5432/postgres?sslmode=require
```

Do not commit these values into `.env` files in the repository.

---

## Architecture snapshot

```mermaid
flowchart TB
  subgraph vercel [Vercel]
    FE[fe-v1 Next.js project]
    API[backend Go project cmd/api]
  end
  subgraph external [External]
    DB[(Managed Postgres)]
    Chain[JSON-RPC e.g. Base Sepolia]
  end
  subgraph elsewhere [Recommended separate host]
    IDX[indexer cmd/indexer]
  end
  Browser[Browser] --> FE
  Browser --> API
  API --> DB
  API --> Chain
  IDX --> DB
  IDX --> Chain
```

---

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| Build: unsupported Go version | Vercel must match `go` version in `go.mod`. If the build fails, check [Vercel Go docs](https://vercel.com/docs/functions/runtimes/go) / changelog or temporarily align with a supported toolchain (coordinate with your team before changing `go.mod`). |
| `wait for schema` / timeout | Run **`cmd/migrator`** against `DATABASE_URL` (Step 2). |
| Cold starts / latency | Normal on serverless-style platforms; tune DB pool (`DB_MAX_CONNS`) if you scale to many concurrent instances. |
| Indexer missing | Markets may not update from chain; deploy **`cmd/indexer`** on another platform using the same image or binary as in README. |

---

## Related docs

- [Deploy frontend + API concept guide](./vercel-and-api-deployment.md) (why two services, CORS, smoke tests).
- [README — Production deployment](../README.md#production-deployment) (env snippets and service table).
