# Markets V1 local staging-proof stack runbook

Scope: a local VPS rehearsal only. The stack uses an ephemeral auth-session secret and a Caddy internal CA on loopback `https://localhost:8443`; it does not touch production containers, production DNS, or public TLS.

## Preconditions

- Docker daemon is reachable (on this VPS, invoke Docker through `sudo -n docker` until the operator deliberately grants the runner Docker-group/rootless access).
- Ports `5433`, `8080`, `3001`, and loopback `8443` are unused.
- Copy `.env.markets-dev.example` to a gitignored `.env` only if a persistent local rehearsal is wanted. Never commit the secret values.

## One-time local proof invocation

```bash
cd /opt/retropick
export MARKETS_AUTH_SESSION_SECRET="$(openssl rand -hex 32)"
export MARKETS_AUTH_ALLOWED_DOMAINS=localhost
sudo -n --preserve-env=MARKETS_AUTH_SESSION_SECRET,MARKETS_AUTH_ALLOWED_DOMAINS \
  docker compose -f docker-compose.markets-dev.yml \
  -f docker-compose.markets-staging-local.yml up --build -d --wait --wait-timeout 600
```

The required `MARKETS_AUTH_ALLOWED_DOMAINS` is intentionally fail-closed: without an explicit SIWE-domain allowlist, the API must not start.

## Verify

```bash
sudo -n docker exec retropick-markets-postgres pg_isready -U retropick -d retropick
MARKETS_BFF_URL=http://127.0.0.1:8080 bash scripts/markets-dev-smoke.sh
curl -fsS http://127.0.0.1:3001/markets >/dev/null

sudo -n docker cp retropick-markets-caddy-staging-local:/data/caddy/pki/authorities/local/root.crt /tmp/retropick-caddy-root.crt
sudo -n install -m 0644 /tmp/retropick-caddy-root.crt /tmp/retropick-caddy-root-readable.crt
curl -fsS --cacert /tmp/retropick-caddy-root-readable.crt \
  https://localhost:8443/api/v1/health/live
```

Expected: Docker health checks are `healthy`; readiness responds HTTP 200 with database `ok`; smoke prints `Markets stack smoke passed.`; Caddy forwards `/api/v1/health/live` over verified local TLS.

Readiness can truthfully be `degraded: true` while catalog worker reports `degraded` and realtime/market data are deliberately disabled in this seed profile. This is not an unhealthy state: `ok` remains true and the smoke contract permits HTTP 200 (or 503 when unhealthy).

## Teardown

```bash
sudo -n docker compose -f docker-compose.markets-dev.yml \
  -f docker-compose.markets-staging-local.yml down
```

Use `down -v` only when intentionally discarding the local seed database and Caddy internal-CA state.

## BLK-001 boundary

This local proof does not clear BLK-001. Production/staging eligibility proof still requires ops-managed GeoIP and geoblock upstream configuration plus a live allowed-region result of `eligible: true`, filed by the designated QA/ops owner. Do not use an allow-all stub.
