# Markets V1 standalone local rehearsal runbook

Scope: a non-seeded, production-like **local rehearsal** served by Caddy's internal CA at loopback-only `https://localhost:8443`. The standalone `docker-compose.markets-rehearsal.yml` never inherits the seeded developer topology. Ordinary `docker-compose.markets-dev.yml` behavior remains unchanged.

## Static-only gate (current authorization)

The candidate is pending exact-SHA review and the backend owner's PostgreSQL/heavy-build lease. **Do not run** image builds, Compose `up`/`down`, container restart/recreate/stop, `/migrator`, database backup/restore, browser/device installation, or runtime probes until both gates are explicitly released. The commands in the runtime section are a future operator procedure, not current authorization.

Static checks use dummy non-secret values only; they do not inspect any environment, container, database, or secret:

```bash
cd /opt/worktrees/retropick/w3-staging-rehearsal
python3 -m py_compile scripts/check-markets-rehearsal-config.py
python3 scripts/check-markets-rehearsal-config.py

# Positive expansion with an exact nonempty revision and dummy non-secret fixtures.
env \
  RETROPICK_VCS_REF=aa2acb3edf60f932a7101e407d56f7f896f5c352 \
  REHEARSAL_POSTGRES_PASSWORD=dummy-config-only-password \
  MARKETS_AUTH_SESSION_SECRET=dummy-config-only-session-secret-32bytes \
  MARKETS_AUTH_ALLOWED_DOMAINS=localhost \
  MARKETS_CORS_ALLOWED_ORIGINS=https://localhost:8443 \
  MARKETS_REALTIME_ALLOWED_ORIGINS=https://localhost:8443 \
  docker compose -f docker-compose.markets-rehearsal.yml config --quiet

# Every required input must also reject an explicitly empty value. Repeat with
# the named field omitted to prove missing-value rejection as well.
env RETROPICK_VCS_REF= REHEARSAL_POSTGRES_PASSWORD=dummy-config-only-password \
  MARKETS_AUTH_SESSION_SECRET=dummy-config-only-session-secret-32bytes \
  MARKETS_AUTH_ALLOWED_DOMAINS=localhost \
  MARKETS_CORS_ALLOWED_ORIGINS=https://localhost:8443 \
  MARKETS_REALTIME_ALLOWED_ORIGINS=https://localhost:8443 \
  docker compose -f docker-compose.markets-rehearsal.yml config >/dev/null 2>&1 && exit 1 || true
env RETROPICK_VCS_REF=aa2acb3edf60f932a7101e407d56f7f896f5c352 \
  REHEARSAL_POSTGRES_PASSWORD=dummy-config-only-password MARKETS_AUTH_SESSION_SECRET= \
  MARKETS_AUTH_ALLOWED_DOMAINS=localhost \
  MARKETS_CORS_ALLOWED_ORIGINS=https://localhost:8443 \
  MARKETS_REALTIME_ALLOWED_ORIGINS=https://localhost:8443 \
  docker compose -f docker-compose.markets-rehearsal.yml config >/dev/null 2>&1 && exit 1 || true
env RETROPICK_VCS_REF=aa2acb3edf60f932a7101e407d56f7f896f5c352 \
  REHEARSAL_POSTGRES_PASSWORD=dummy-config-only-password \
  MARKETS_AUTH_SESSION_SECRET=dummy-config-only-session-secret-32bytes \
  MARKETS_AUTH_ALLOWED_DOMAINS= \
  MARKETS_CORS_ALLOWED_ORIGINS=https://localhost:8443 \
  MARKETS_REALTIME_ALLOWED_ORIGINS=https://localhost:8443 \
  docker compose -f docker-compose.markets-rehearsal.yml config >/dev/null 2>&1 && exit 1 || true

# Repeat each negative probe with `env -u RETROPICK_VCS_REF`,
# `env -u MARKETS_AUTH_SESSION_SECRET`, and `env -u MARKETS_AUTH_ALLOWED_DOMAINS`
# while supplying the other fixtures; the diagnostic must name the missing field.

# Networkless/read-only syntax validation; this does not join or mutate a stack.
docker run --rm --network none --read-only --tmpfs /data --tmpfs /config \
  -v "$PWD/docker/Caddyfile.markets-rehearsal:/etc/caddy/Caddyfile:ro" \
  caddy:2 caddy adapt --config /etc/caddy/Caddyfile --adapter caddyfile --validate
```

Static acceptance also requires `bash -n` for extracted shell snippets, `git diff --check`, an added-line secret scan, and proof that the original developer Compose file has no diff.

## Topology contract

- Dedicated `markets_rehearsal_postgres_data`, `markets_rehearsal_caddy_data`, and `markets_rehearsal_caddy_config` volumes cannot alias developer/staging state.
- Healthy PostgreSQL precedes one-shot `/migrator`; successful migration precedes API; readiness precedes Web/Caddy.
- API has no `MARKETS_BOOTSTRAP`, seed scenario, or seed refresh. Realtime is enabled only to permit a real WebSocket handshake proof; `order_submit=false` and `portfolio_read=false` stay fail closed.
- API and migrator share the same backend image identity. Backend and Web carry the exact `org.opencontainers.image.revision` OCI label.
- PostgreSQL `127.0.0.1:5434`, API/metrics `127.0.0.1:8081`, and Web `127.0.0.1:3002` are diagnostic-only. Caddy alone serves the product at `127.0.0.1:8443`.
- Caddy returns 404 for `/metrics`, sends `/api/*` (including health and `/api/v1/markets/realtime`) to `markets-api:8080` with native WebSocket upgrade handling, and sends every other path to `markets-web:3001`.

## Future runtime rehearsal (blocked now)

After independent approval of the exact candidate SHA **and** explicit lease release, start from a clean approved worktree. Secrets must already be supplied by the operator environment; there is no committed/default secret:

```bash
cd /opt/worktrees/retropick/w3-staging-rehearsal
export RETROPICK_VCS_REF="$(git rev-parse HEAD)"
: "${MARKETS_AUTH_SESSION_SECRET:?operator must supply MARKETS_AUTH_SESSION_SECRET}"
: "${REHEARSAL_POSTGRES_PASSWORD:?operator must supply REHEARSAL_POSTGRES_PASSWORD}"
export MARKETS_AUTH_ALLOWED_DOMAINS=localhost
export MARKETS_CORS_ALLOWED_ORIGINS=https://localhost:8443
export MARKETS_REALTIME_ALLOWED_ORIGINS=https://localhost:8443

sudo -n --preserve-env=RETROPICK_VCS_REF,MARKETS_AUTH_SESSION_SECRET,REHEARSAL_POSTGRES_PASSWORD,MARKETS_AUTH_ALLOWED_DOMAINS,MARKETS_CORS_ALLOWED_ORIGINS,MARKETS_REALTIME_ALLOWED_ORIGINS \
  docker compose -f docker-compose.markets-rehearsal.yml up --build -d --wait --wait-timeout 600
```

Never combine this manifest with `docker-compose.markets-dev.yml`. Never use `down -v` unless the operator explicitly approves destruction of rehearsal-only state.

## Future exact-SHA runtime proof (blocked now)

1. Inspect selected non-secret image fields only. Require both labels to equal `$RETROPICK_VCS_REF`:
   - `retropick-markets-rehearsal-backend:$RETROPICK_VCS_REF`
   - `retropick-markets-rehearsal-web:$RETROPICK_VCS_REF`
   - OCI key `org.opencontainers.image.revision`
2. Require PostgreSQL health, migration exit 0, API readiness 200, Web health, and Caddy health. Verify schema version 25 and `dirty=false` read-only.
3. Prove listeners exist only on loopback at `5434`, `8081`, `3002`, and `8443`; non-loopback connection attempts must fail.
4. Trust only the copied rehearsal Caddy root certificate. Through TLS, require health/capabilities 200, `/metrics` 404, and security headers. Direct loopback API `/metrics` remains diagnostic-only.
5. Require capabilities with `.features.order_submit == false` and `.features.portfolio_read == false`; no submit/cancel success is permitted.
6. Exercise `/api/v1/markets/realtime` with an allowed `Origin: https://localhost:8443` and require a WebSocket `101` plus subscription proof. Evil and missing Origin must fail. This is the residual WS proof; static Caddy adaptation alone is not a handshake.
7. Use a disposable wallet/session to prove SIWE domain `localhost`, CORS exact-origin behavior, Secure/HttpOnly/SameSite=Lax cookies, CSRF rejection/acceptance, and logout. Never print or inspect the session secret.
8. Under the database lease, prove restart persistence and create a fresh backup. List and restore it only into a second isolated rehearsal volume; never restore over shared or production data.
9. Record observability and rollback evidence. Roll back backend/Web by immutable image identity without deleting PostgreSQL/Caddy volumes; stop on provenance, migration, health, exposure, cookie, CSRF, WS, or capability mismatch.

Runtime build, backup, isolated restore, restart/persistence, SIWE/CSRF/WS, browser, observability, and rollback remain explicitly blocked until review and lease release.
