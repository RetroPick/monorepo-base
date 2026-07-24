# RetroPick Production Cost and Deployment Guide

Last updated: 2026-06-02

This document is the production budget, deployment policy, and live-network validation note for the RetroPick MVP.

It is intentionally practical:

- mainnet budget first
- persistent backend only
- public RPC first, paid RPC only when measured need appears
- boring infra over distributed-system theater

## 1. Hard deployment rule

### Supported

1. `Vercel frontend + persistent VPS backend`
2. `Single VPS for everything`

### Not supported

`apps/backend` on Vercel serverless is not a production deployment shape for this protocol.

Reason:

- the backend contains long-lived responsibilities: indexer, keeper scheduling, websocket fanout, projection rebuilds, and chain catch-up
- those are not a clean fit for short-lived serverless execution
- the currently deployed Vercel backend already shows the failure mode: it is alive as an HTTP app but stale as an indexer-backed system

Live check on 2026-05-06:

- deployed API health: `lastIndexedBlock=40921599`
- deployed API sync time: `lastSyncAt=2026-05-01T04:58:06Z`
- live Base Sepolia head: `41153129`
- lag: about `231,530` blocks

That is enough to reject Vercel for the persistent backend path.

## 2. What costs money

RetroPick MVP cost has three buckets:

1. fixed infrastructure
2. variable onchain maintenance
3. optional reliability upgrades

### Fixed infrastructure

- compute
- database disk
- snapshots / backup storage
- frontend hosting if kept on Vercel

### Variable onchain maintenance

- manual market lifecycle transactions
- rolling market lifecycle transactions
- optional protocol-paid claims if you subsidize users

### Optional reliability upgrades

- paid RPC
- external uptime / incident tooling
- log retention SaaS
- separate ops host

## 3. Pricing inputs used here

These numbers were verified on 2026-05-06 from vendor pricing pages and live network queries.

### Hosting references

- OrangeVPS or equivalent single-box VPS
- Vercel pricing
- Backblaze B2 pricing

### Vendor prices used

- OrangeVPS-class target: `4 vCPU / 8 GB / 60+ GB NVMe minimum`
- OrangeVPS-class headroom target for single-box production: not below `8 GB RAM`
- Vercel Pro: `$20/mo`
- Backblaze B2: first `10 GB` free, then `$0.005 / GB / month`

### Onchain pricing inputs

Live network pricing was pulled with:

```bash
retro costs estimate \
  --json --no-deploy-sim --rpc-url https://mainnet.base.org
```

Observed live inputs:

- chain: Base mainnet
- chain id: `8453`
- gas price: `6000000 wei` (`0.006 gwei`)
- ETH/USD: about `$2377.43`

## 4. Fixed monthly infrastructure cost

## A. Lean split stack

Recommended when you want Vercel CDN convenience but keep the backend correct.

- OrangeVPS-class `4 vCPU / 8 GB` host
- 60 to 100 GB attached storage or equivalent NVMe plan
- Backblaze B2 offsite backup `100 GB`: `$0.45`
- Vercel Pro: `$20.00`

Notes:

- this is the cheapest shape I would still call production-capable for the MVP
- use this only after the hot-path backend refactor is complete and websocket/indexer are stable
- do not ship mainnet on 2 GB or 4 GB low-end VPS tiers

## B. Single VPS for everything

Recommended when minimizing vendor count matters more than frontend CDN convenience.

- OrangeVPS-class box with stronger headroom than the lean split stack
- Backblaze B2 offsite backup `200 GB`: `$0.95`

Notes:

- this is cheaper than split-hosting because Vercel Pro disappears
- this is operationally simpler
- the tradeoff is weaker frontend delivery ergonomics and less CDN help

## C. Split production-safe stack

Recommended if you want both stronger VPS headroom and Vercel frontend delivery.

- Single VPS for everything baseline except frontend stays on Vercel
- add Vercel Pro: `$20.00`

Fixed total: **$52.30 / month**

## 5. Variable onchain operating cost

These are the real recurring protocol-maintenance costs from the current smart-contract gas snapshots repriced on Base mainnet.

### Manual markets

Per template, per day, assuming `1 epoch/day`:

- manual threshold keeper flow: **$0.00648/day**
- manual direction keeper flow: **$0.00727/day**

The cost is effectively negligible at MVP scale.

### Rolling markets

Per template, per day, assuming `1 hour` rolling cadence:

- steady-state rolling execution: **$0.16436/day**
- first day including bootstrap: **$0.17214/day**

Rolling markets dominate protocol-paid chain maintenance cost.

### User claims

Per claim:

- about **$0.00099 / claim**

This should normally be treated as **user-paid gas**, not protocol OPEX.

## 6. MVP cost scenarios

## Scenario 1: 8-market MVP

Assumption:

- `4` manual templates
- `4` rolling templates
- manual uses threshold-style estimate
- rolling uses steady-state estimate

Variable protocol OPEX:

- **$0.68 / day**
- **$4.78 / week**
- **$20.50 / month**

All-in monthly totals:

- Lean split stack: **$53.42 / month**
- Single VPS for everything: **$52.80 / month**
- Split production-safe stack: **$72.80 / month**

## Scenario 2: current larger market shape

Assumption:

- `13` manual templates
- `13` rolling templates
- manual uses threshold-style estimate
- rolling uses steady-state estimate

Variable protocol OPEX:

- **$2.22 / day**
- **$15.55 / week**
- **$66.63 / month**

All-in monthly totals:

- Lean split stack: **$99.55 / month**
- Single VPS for everything: **$98.93 / month**
- Split production-safe stack: **$118.93 / month**

## 7. One-time deployment cost

For production deployment, the script was also run with full dry-run simulation:

```bash
retro costs estimate \
  --json --rpc-url https://mainnet.base.org
```

Observed result:

- production deploy dry-run succeeded
- simulated production deploy gas units: `73,606,130`
- dry-run tx count: `50`
- execution-only lower bound: about **$1.05**

Important caveat:

- deploy-path L1 data fee pricing failed during the dry-run because the RPC connection closed during the `GasPriceOracle` pricing path
- therefore **do not** treat `$1.05` as final total deploy cost
- treat it as an **execution-only lower bound**

Practical conclusion:

- recurring maintenance cost matters more than one-time deployment cost for this MVP
- deploy cost is small, but not yet fully measured in this repo

## 8. Recommended production shape

### Default recommendation

For the current MVP, use:

1. `apps/web` on Vercel
2. persistent OrangeVPS box for:
   - API
   - indexer
   - price-worker
   - funding-worker
   - keeper
   - alert
   - websocket / stream gateway
   - Postgres

If minimizing bill and ops complexity matters more than Vercel workflow, move the frontend onto the same VPS and use Cloudflare in front.

### Canonical operator commands

Run these through the root-aware launcher from any working directory:

```bash
retro doctor
retro costs estimate --rpc-url https://mainnet.base.org --json --color always
retro stack prod config
retro stack prod up -d --build
retro stack prod status
retro stack prod logs
retro stack prod smoke
retro db backup
retro db restore-drill ./backups/<dump>.dump
```

The nginx edge proxies `/api/` and `/ws`; metrics stay bound to VPS loopback. Production startup requires explicit CORS and websocket origins, trusted nginx proxy CIDRs, non-zero settlement addresses, and a non-placeholder LI.FI webhook secret.

### Why this is the right default

- fixed monthly cost stays under roughly `$53/mo` for the 8-market MVP plus backup storage
- protocol chain maintenance remains under roughly `$21/mo`
- public RPC can still be the baseline
- there is no need yet for Redis, Kafka, or managed queue infrastructure

## 9. Paid RPC policy

Default budget: **$0**

Start with public RPC, consistent with `.dev/.tecStackPublicRPC.md`.

### Keep public RPC when

- API hot paths make zero routine chain calls
- indexer stays caught up
- keeper preflight latency remains safe
- public endpoint error rate is low

### Upgrade to paid RPC when

- indexer lag stays above target for sustained periods
- public RPC rate limits or error rates cause missed freshness targets
- keeper preflight or broadcast latency puts epoch windows at risk
- operator workflows require more reliable live reads than public endpoints can provide

Practical paid-RPC options:

- Alchemy PAYG: good first paid step
- QuickNode Build: stronger fixed-budget option, around `$49/mo`

Do not add paid RPC before measuring a real problem.

## 10. Operational defaults

These defaults keep the MVP cheap and correct:

- API: zero routine chain reads on hot public paths
- Chainlink price worker: poll curated feeds outside request paths and persist candle/read projections
- alerting: zero routine chain polling
- websocket: persistent process, not serverless
- indexer block range: cap `eth_getLogs` at `10,000` blocks per call
- indexer poll cadence: use `2s-3s` steady-state default, not an aggressive `500ms` forever loop
- database remains Postgres-only
- no Redis unless measured need appears
- keep the production compose stack single-box and provider-neutral

## 11. Real-network validation commands

### Check current deployed backend health

```bash
curl -sS https://backend-retropick-base.vercel.app/api/v1/health
```

### Check currently indexed markets

```bash
curl -sS https://backend-retropick-base.vercel.app/api/v1/markets
```

### Check live Base Sepolia head

```bash
cast block-number --rpc-url https://sepolia.base.org
```

### Reprice mainnet maintenance cost

```bash
retro costs estimate \
  --json --no-deploy-sim --rpc-url https://mainnet.base.org
```

### Reprice with different scenario counts

```bash
MANUAL_TEMPLATES=4 \
ROLLING_TEMPLATES=4 \
MANUAL_EPOCHS_PER_DAY=1 \
ROLLING_INTERVAL_SECONDS=3600 \
retro costs estimate \
  --json --no-deploy-sim --rpc-url https://mainnet.base.org
```

### Scripted production smoke (read-only)

Use this after each VPS or API deploy, **before** announcing green. Scripts only issue `GET` probes; they do not submit transactions or rotate keys.

**Environment (no secrets in git or shell history):**

- **`RETROPICK_API_BASE`** — HTTPS origin of the public API (trailing slash optional). Example: `https://api.yourdomain.com`. You can omit this if you pass the same URL as the first argument to the script.
- **`RETROPICK_OPS_JWT`** — optional. Bearer token for operator-only routes (`/api/v1/ops/*`). Load from your secret store (`export` in the current shell only); never commit or paste into tickets.

**Dry-run sequence (recommended order):**

1. **`./scripts/smoke-production.sh`** — public: `livez`, `health`, `readyz`, `markets`; prints the derived **`/ws`** URL for manual WebSocket checks. With **`RETROPICK_OPS_JWT`** set, also probes `ops/global-state`, `ops/oracle/health`, `ops/audit`.
2. **`./scripts/keeper-operator-smoke.sh`** — same public set plus, when JWT is set, **`ops/keeper/schedule`** and **`ops/keeper/executions`** for pre-rotation / handoff (see [.dev/backend/keeper.md](.dev/backend/keeper.md) — *Operator smoke*).

**Pass criteria:** every `curl` exits 0; **`health`** JSON shows `ok`, expected `environment` / `chainId`, and indexer fields consistent with chain head (see [.dev/backend/operations-runbook.md](.dev/backend/operations-runbook.md)). Ops probes require a valid operator JWT aligned with **`apps/ops-web`**.

**Related:** [docs/feature/ops-admin-operator-workflow.md](docs/feature/ops-admin-operator-workflow.md), [docs/vps-deploy.md](docs/vps-deploy.md) (edge + loopback metrics after smoke).

## 12. Final recommendation

For this MVP, the production answer is simple:

- run the backend on a persistent VPS
- keep the chain maintenance logic boring
- use public RPC until metrics prove otherwise
- treat rolling markets as the real recurring cost center
- keep the 8-market MVP near **$53/month** all-in on the lean recommended stack

The current Vercel backend deployment is suitable as a temporary demo surface, not as production infrastructure.
