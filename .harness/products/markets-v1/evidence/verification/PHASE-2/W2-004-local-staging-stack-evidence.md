# W2-004 — Local staging stack bring-up evidence

Date: 2026-08-12 (UTC)
Commit: `ecf7e2298` (`agent/w2-004-staging`)
Scope: local VPS proof only; no production deployment, DNS change, public certificate request, or real credential was used.

## Docker access finding

The non-root runner could not access `/var/run/docker.sock` because it is `root:docker` mode `0660` and the runner was not in the `docker` group. `sudo -n docker` was available and used for this local staging task. Rootless Docker user service was inactive.

## W2-009 remediation and startup result

The local proof compose file now explicitly binds every published local-development port to loopback: Postgres `127.0.0.1:5433`, Markets API `127.0.0.1:8080`, Markets web `127.0.0.1:3001`, and Caddy `127.0.0.1:8443`.

The previous long-run failure was traced to the intentional unreachable Gamma URL: initial catalog sync failed before a durable projection existed, so readiness correctly returned 503 with `catalogProjection=missing` and `catalogWorker=syncing`. The local-only seed profile now reapplies its deterministic projection every minute while the upstream remains unreachable. This does not weaken readiness: a projection is still required, and the worker remains explicitly `degraded` while serving the fresh durable projection.

The stack was built and started with an ephemeral `MARKETS_AUTH_SESSION_SECRET` and `MARKETS_AUTH_ALLOWED_DOMAINS=localhost`; neither was written to a repository env file. The required SIWE domain allowlist was added to the dev compose contract after startup logs identified the pre-existing runtime requirement.

Docker health result:

```text
/retropick-markets-postgres healthy
/retropick-markets-api healthy
/retropick-markets-web healthy
/retropick-markets-caddy-staging-local healthy
```

Postgres proof from inside its container:

```text
/var/run/postgresql:5432 - accepting connections
retropick:retropick
```

Published endpoints:

- Postgres: `127.0.0.1:5433` / container `5432`
- Markets API: `127.0.0.1:8080`
- Markets web: `127.0.0.1:3001`
- Caddy internal TLS proxy: `127.0.0.1:8443`

## Health/readiness and smoke

- `/api/v1/health/live`: HTTP 200, `ok:true`, process check `ok`.
- `/api/v1/health/ready`: HTTP 200, `ok:true`, database `ok`, `catalogProjection:ok`, `catalogWorker:degraded`; the worker remains degraded because the seed profile intentionally disables realtime/market data and makes its Gamma upstream unreachable.
- `/api/v1/markets/capabilities`: JSON response.
- `/api/v1/markets/events`: contained `polymarket:event:seed-multi`.
- `scripts/markets-dev-smoke.sh` result:

```text
ok    health live
ok    health ready (HTTP 200)
ok    capabilities
ok    events list
ok    seeded event polymarket:event:seed-multi
ok    events schemaVersion present
Markets stack smoke passed.
```

- `http://127.0.0.1:3001/markets`: HTTP 200.

## Caddy/TLS

Caddy configuration adapted successfully and its internal root CA validated as a self-signed local authority. A request through Caddy, using that root CA, returned the BFF liveness JSON over verified TLS:

```text
verified_caddy_tls_proxy=OK
{"ok":true,"service":"retropick-markets-api",...}
```

This Caddy config is loopback-only and uses `tls internal`; it is not a staging-DNS or public-ACME configuration.

## W2-009 bounded soak and exposure proof

After rebuilding the stack, its four Docker-published listeners showed `127.0.0.1` bindings only. TCP connection attempts to the VPS non-loopback address failed for ports `8080`, `3001`, `5433`, and `8443`; all four corresponding loopback connections succeeded.

The deterministic soak ran for 10 minutes and 2 seconds, with one complete probe set each minute from 11:42:02Z through 11:52:04Z. Every one of its eleven samples asserted:

- `/api/v1/health/ready` had `ok:true` and `checks.catalogProjection:ok`;
- `/api/v1/markets/events` included `polymarket:event:seed-multi`;
- `/markets` responded from the web service;
- Caddy forwarded `/api/v1/health/live` over TLS verified against its local internal CA; and
- each required non-loopback TCP connection remained refused.

Migration and persistence proof after the rebuild: `schema_migrations` reports version `24`, `dirty=false`; the named Docker volumes `retropick-markets-dev_markets_dev_postgres_data` and `retropick-markets-dev_markets_staging_caddy_data` remained attached.

## Boundary

This local service proof does not close BLK-001. The remote staging eligibility proof still requires operator-managed GeoIP/geoblock configuration and live `eligible:true` evidence from an allowed region, per the BLK-001 checklist.
