# RetroPick OrangeVPS Deploy

RetroPick v1 production is a split stack:

- `apps/fe-v1` on Vercel
- `postgres`, `migrator`, `api`, `indexer`, `price-worker`, `funding-worker`, `keeper`, `alert`, `nginx` on one OrangeVPS box
- `reporter` disabled for Chainlink-only v1

## Recommended host

- OrangeVPS Singapore or nearest region
- Ubuntu 24.04
- 4 vCPU / 8 GB RAM / 60+ GB NVMe minimum
- 4 GB swap
- Cloudflare DNS in front of the VPS
- Tailscale for private ops access

## Bootstrap runbook

1. Provision the VPS and add SSH keys only. Disable password auth.
2. Enable `ufw` and allow `22`, `80`, `443`.
3. Install Docker Engine, Compose v2, and Buildx.
4. Enable unattended security upgrades.
5. Install Tailscale and confirm private admin access before exposing the API host publicly.
6. Clone this repo to `/opt/retropick` (or your chosen deploy root).
7. Copy [`.env.production.example`](../.env.production.example) to `.env.production` and fill real values.
8. Create `/etc/retropick/secrets/keeper.key` with mode `0400` and owner `root`.
9. Put Let’s Encrypt material under `/etc/letsencrypt/live/<host>/`.
10. Install [`ops/systemd/retropick-compose.service`](../ops/systemd/retropick-compose.service), [`ops/systemd/retropick-backup.service`](../ops/systemd/retropick-backup.service), and [`ops/systemd/retropick-backup.timer`](../ops/systemd/retropick-backup.timer).
11. Start the stack and backup timer:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now retropick-compose
sudo systemctl enable --now retropick-backup.timer
```

## Compose workflow

- Default env file: `.env.production`
- Alternate env file: `RETROPICK_ENV_FILE=.env.production.sepolia ./scripts/compose-production.sh config`
- Deploy: `./scripts/compose-production.sh up -d --build`
- Restart one service: `./scripts/compose-production.sh restart funding-worker`
- Restart Chainlink polling independently: `./scripts/compose-production.sh restart price-worker`
- Roll back image/service state: restore the previous git revision, then rerun `./scripts/compose-production.sh up -d --build`

## Nginx and public edge

- [`docker/nginx-production.conf.template`](../docker/nginx-production.conf.template) is the canonical edge config.
- `API_HOST` is required.
- `APP_HOST` is optional and only needed when you intentionally run the `web` profile on the VPS.
- Public edge only exposes `/api/v1/*` and `/ws`.
- Metrics stay on loopback only:
  - `127.0.0.1:9090` api
  - `127.0.0.1:9091` indexer
  - `127.0.0.1:9092` keeper
  - `127.0.0.1:9093` funding-worker
  - `127.0.0.1:9094` price-worker

## Smoke checks

After each deploy, run the read-only HTTP smokes from the repo root (see [PRODUCTION.md](../PRODUCTION.md) — *Scripted production smoke*):

```bash
export RETROPICK_API_BASE="https://api.example.com"
# Optional — same operator JWT as apps/ops; never pass on argv if avoidable
# export RETROPICK_OPS_JWT="$(cat /path/from/secret/store)"

./scripts/smoke-production.sh
./scripts/keeper-operator-smoke.sh

curl -sS http://127.0.0.1:9090/metrics
curl -sS http://127.0.0.1:9091/metrics
curl -sS http://127.0.0.1:9092/metrics
curl -sS http://127.0.0.1:9093/metrics
curl -sS http://127.0.0.1:9094/metrics
```

Expected:

- `migrator` exits successfully
- `api` answers `livez`, `health`, and `readyz`
- `indexer` increments successful tick metrics and stays near chain head
- `price-worker` polls curated Chainlink proxies and persists healthy `oracle_feed_health` rows plus candles
- `funding-worker` stays healthy without API restarts
- `/api/v1/ops/*` works only with operator auth over private access
- `/metrics` is not exposed through nginx

## Backup and restore drill

- Daily backup is handled by `retropick-backup.timer`.
- Manual backup: `set -a && . ./.env.production && set +a && ./scripts/backup-postgres.sh ./backups`
- Restore drill:
  1. Create a fresh Postgres target.
  2. Stop `api`, `indexer`, `price-worker`, `funding-worker`, `keeper`, and `alert`.
  3. Run `set -a && . ./.env.production && set +a && ./scripts/restore-postgres.sh <dump-file>`.
  4. Start the stack again and rerun the smoke checks.

## Operating notes

- Disable keeper safely: set `KEEPER_ENABLED=0`, then restart only `keeper`.
- Rotate the keeper key by replacing `/etc/retropick/secrets/keeper.key`, updating any on-chain role if needed, then restarting `keeper`.
- `funding-worker` owns matcher, destination polling, and crediting. Restart it independently from `api`.
- `price-worker` owns Chainlink feed polling and candle ingestion. Restart it independently from `api`.
- `reporter` is intentionally not part of the active launch shape.
