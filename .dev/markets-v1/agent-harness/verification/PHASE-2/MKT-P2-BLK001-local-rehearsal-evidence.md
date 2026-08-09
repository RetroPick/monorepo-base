# BLK-001 — Local Docker rehearsal evidence (not staging clearance)

**Date:** 2026-08-09  
**Status:** **partial — does not clear BLK-001**  
**Environment:** `docker-compose.markets-dev.yml` + gitignored root `.env`

## Description

Local wiring rehearsal for GeoIP + geoblock env vars and `TRUSTED_PROXY_CIDRS` on `markets-api`. Official BLK-001 clearance still requires **staging** proof per [MKT-P2-BLK001-ops-staging-checklist.md](./MKT-P2-BLK001-ops-staging-checklist.md).

## Env vars set (names only)

| Variable | Set locally |
|----------|-------------|
| `MARKETS_GEOIP_BASE_URL` | yes (`https://ipinfo.io`) |
| `MARKETS_GEOIP_PATH` | yes (`/{ip}/json`) |
| `MARKETS_GEOIP_API_KEY` | yes (secret manager / gitignored `.env`) |
| `MARKETS_GEOBLOCK_BASE_URL` | yes (`https://polymarket.com`) |
| `MARKETS_GEOBLOCK_PATH` | yes (`/api/geoblock`) |
| `TRUSTED_PROXY_CIDRS` | yes (`172.16.0.0/12,127.0.0.0/8,10.0.0.0/8`) |

Template: `.env.markets-dev.example` → copy to `.env` (gitignored).

## Code glue shipped (this session)

- `docker-compose.markets-dev.yml` — `${MARKETS_GEOIP_*}` / `${MARKETS_GEOBLOCK_*}` / `TRUSTED_PROXY_CIDRS`
- `apps/backend/cmd/markets-api/main.go` — `IPTrust` wired to `Service` + auth module (staging/nginx client IP)
- `apps/backend/internal/markets/config/config.go` — `TrustedProxyCIDRs` from `TRUSTED_PROXY_CIDRS`

## Verification commands

Local curl without `X-Forwarded-For` hits Docker bridge bogon IP → `geo_unknown` (expected).

Rehearsal with forwarded public IP (Indonesia egress example):

```bash
curl -sS -H "X-Forwarded-For: 36.71.19.63" \
  http://127.0.0.1:8080/api/v1/markets/eligibility | jq .
```

**Observed (2026-08-09):**

```json
{
  "eligible": false,
  "reason": "geoblock_timeout",
  "checkedAt": "2026-08-09T14:50:40.828638731Z",
  "region": "ID"
}
```

**Interpretation:**

| Check | Result |
|-------|--------|
| GeoIP resolves region | **PASS** (`region: "ID"`) |
| Geoblock upstream JSON | **FAIL** (`geoblock_timeout`) |
| Fail-closed behavior | **PASS** (no allow-all stub) |

Geoblock failure cause from this network: Polymarket `/api/geoblock` returns Cloudflare challenge / non-200 to server-side HTTP clients (not valid JSON `blocked` field). Staging egress must reach Polymarket geoblock with HTTP 200 JSON for BLK-001 clearance.

US IP control (same network):

```bash
curl -sS -H "X-Forwarded-For: 8.8.8.8" \
  http://127.0.0.1:8080/api/v1/markets/eligibility | jq .
```

→ `region: "US"`, `reason: "geoblock_timeout"` (same upstream issue).

## Capabilities invariant

```bash
curl -sS http://127.0.0.1:8080/api/v1/markets/capabilities | jq '.features.order_submit'
# false
```

## BLK-001 clearance gap

| Criterion | Local rehearsal | Staging required |
|-----------|-----------------|------------------|
| Env wired | yes | yes |
| `eligible: true` from allowed IP | **no** (geoblock_timeout) | **yes** |
| Evidence file | this doc (rehearsal only) | `MKT-P2-BLK001-staging-proof.md` |

## Next ops steps

1. Inject same env var **names** on staging `markets-api` (secrets in manager, not git).
2. Set `TRUSTED_PROXY_CIDRS` to staging load-balancer/nginx CIDRs.
3. Redeploy; curl staging `/api/v1/markets/eligibility` from allowed egress (no XFF spoofing in prod — use real client path).
4. File `MKT-P2-BLK001-staging-proof.md` with `"eligible": true` JSON.
5. Human clears BLK-001; orchestrator unblocks MKT-P2-002; user authorizes PHASE-3 advance.
