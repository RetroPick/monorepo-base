# W2-004 — Local staging stack bring-up evidence

Date: 2026-08-12 (UTC)
Commit: `ffff622c1` (`agent/w2-004-staging`)
Scope: local VPS proof only; no production deployment, DNS change, public certificate request, or real credential was used.

## Docker access finding

The non-root runner could not access `/var/run/docker.sock` because it is `root:docker` mode `0660` and the runner was not in the `docker` group. `sudo -n docker` was available and used for this local staging task. Rootless Docker user service was inactive.

## Startup result

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
- `/api/v1/health/ready`: HTTP 200, `ok:true`, database `ok`; it reported `degraded:true` because the seed profile intentionally disables realtime and market data and the catalog worker reports degraded.
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

## Boundary

This local service proof does not close BLK-001. The remote staging eligibility proof still requires operator-managed GeoIP/geoblock configuration and live `eligible:true` evidence from an allowed region, per the BLK-001 checklist.
