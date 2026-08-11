# BLK-001 — Staging eligibility proof

**Blocker:** BLK-001  
**Related task:** MKT-P2-002 (remains `blocked` until live staging passes)  
**Operator:** Chat Ops1  
**Date:** 2026-08-10  
**Status:** **open — staging proof pending**  
**STAGING_API:** TBD (VPS not provisioned)

## Description

Staging clearance artifact for GeoIP + Polymarket geoblock upstream wiring. Code adapters are shipped; this file holds runbook-ready curl commands and **local rehearsal only** until a Singapore/Tokyo VPS is deployed. Does **not** clear BLK-001.

**Authoritative checklist:** [MKT-P2-BLK001-ops-staging-checklist.md](./MKT-P2-BLK001-ops-staging-checklist.md)

---

## 1. Env manifest (names only)

Inject in **staging** via secret manager — never commit values.

### BLK-001 upstreams (required for `eligible: true`)

| Variable | Required | Set in staging | Notes |
|----------|----------|----------------|-------|
| `MARKETS_GEOIP_BASE_URL` | **Yes** | PENDING | e.g. `https://ipinfo.io` |
| `MARKETS_GEOIP_PATH` | No | PENDING | default `/{ip}/json` |
| `MARKETS_GEOIP_API_KEY` | No* | PENDING | or alias `GEO_PROVIDER_API_KEY` |
| `MARKETS_GEOBLOCK_BASE_URL` | **Yes** | PENDING | e.g. `https://polymarket.com` |
| `MARKETS_GEOBLOCK_PATH` | No | PENDING | default `/api/geoblock` |

\*Required if GeoIP provider mandates authentication.

### Staging baseline (from `.whatNeeded.md` §C.1)

| Variable | Required | Set in staging |
|----------|----------|----------------|
| `DATABASE_URL` | Yes | PENDING |
| `MARKETS_AUTH_SESSION_SECRET` | Yes | PENDING |
| `TRUSTED_PROXY_CIDRS` | When behind LB/nginx | PENDING |
| `MARKETS_CORS_ALLOWED_ORIGINS` | Yes | PENDING |

Local reference (rehearsal only): same BLK-001 var **names** set in gitignored `.env` per [MKT-P2-BLK001-local-rehearsal-evidence.md](./MKT-P2-BLK001-local-rehearsal-evidence.md).

---

## 2. Pre-deploy geoblock smoke (on VPS)

Run **on the VPS shell** before deploying `markets-api`. Must return JSON with `"blocked"` field — not Cloudflare HTML.

```bash
curl -sS -H "X-Forwarded-For: <your-public-ip>" \
  -H "Accept: application/json" \
  "https://polymarket.com/api/geoblock" | jq .
```

**Result:** PENDING — run on VPS shell after provision.

---

## 3. Staging verification curls

Replace `STAGING_API` with staging base URL when VPS is live (example: `https://api-staging.markets.retropick.example`).

### 3.1 Public eligibility (primary BLK-001 pass)

```bash
curl -sS "${STAGING_API}/api/v1/markets/eligibility" | jq .
```

**Pass:** `"eligible": true` and non-empty `"region"` from allowed staging egress IP.

**Staging result:** PENDING

```json
{
  "eligible": true,
  "checkedAt": "<UTC timestamp>",
  "region": "<allowed region code>"
}
```

### 3.2 Eligible-gated route (session required)

With valid SIWE session cookie from allowed region:

```bash
curl -sS -b "mkt_session=<cookie>" "${STAGING_API}/api/v1/markets/me/balances" | jq .
```

**While BLK-001 open:** expect `403` `ELIGIBILITY_DENIED`.  
**After BLK-001 clears:** expect `200` (empty balances OK).

**Staging result:** PENDING

### 3.3 Auth-only route (must stay open)

```bash
curl -sS -b "mkt_session=<cookie>" "${STAGING_API}/api/v1/markets/me/wallets" | jq .
```

**Pass:** `200` regardless of eligibility (AUTH §5).

**Staging result:** PENDING

### 3.4 Capabilities invariant (`order_submit` must stay false)

```bash
curl -sS "${STAGING_API}/api/v1/markets/capabilities" | jq '.features.order_submit'
```

**Pass:** `false` — do not flip until explicit human authorization.

**Staging result:** PENDING

### 3.5 Fail-closed metric

```bash
curl -sS "${STAGING_API}/metrics" | grep retropick_markets_eligibility_fail_closed_total
```

**Pass:** metric line present (counter may increment after deny paths).

**Staging result:** PENDING

---

## 4. Pass criteria matrix

| # | Criterion | Local rehearsal | Staging | Evidence |
|---|-----------|-----------------|---------|----------|
| 1 | Both geo + geoblock env vars set | yes (Docker `.env`) | **PENDING** | §1 |
| 2 | `GET /eligibility` → `eligible: true` (allowed IP) | **no** (`geoblock_timeout`) | **PENDING** | §3.1, §5 |
| 3 | Deny path for blocked fixture | not tested | **PENDING** | §3.1 optional |
| 4 | No allow-all stub deployed | **pass** (fail-closed reasons observed) | **PENDING** | §5 |
| 5 | Evidence filed under `verification/PHASE-2/` | **pass** (this file) | **pass** | this file |

---

## 5. Local rehearsal appendix (does not clear BLK-001)

**Environment:** `docker-compose.markets-dev.yml` + gitignored `.env`  
**Timestamp:** 2026-08-10T06:17:30Z (UTC)  
**Note:** X-Forwarded-For used for GeoIP rehearsal only — not valid staging proof per checklist §6.

### Health

```bash
curl -sS http://127.0.0.1:8080/api/v1/health/live
```

```json
{"ok":true,"service":"retropick-markets-api","checkedAt":"2026-08-10T06:17:30.594891601Z","checks":{"process":"ok"}}
```

HTTP 200.

### Eligibility — no XFF (Docker bridge bogon)

```bash
curl -sS http://127.0.0.1:8080/api/v1/markets/eligibility | jq .
```

```json
{
  "eligible": false,
  "reason": "geo_unknown",
  "checkedAt": "2026-08-10T06:17:30.611185228Z"
}
```

**Interpretation:** Expected — Docker bridge IP is not a resolvable public IP without trusted proxy + XFF.

### Eligibility — XFF Indonesia (GeoIP rehearsal)

```bash
curl -sS -H "X-Forwarded-For: 36.71.19.63" \
  http://127.0.0.1:8080/api/v1/markets/eligibility | jq .
```

```json
{
  "eligible": false,
  "reason": "geoblock_timeout",
  "checkedAt": "2026-08-10T06:17:31.367590233Z",
  "region": "ID"
}
```

### Eligibility — XFF US control

```bash
curl -sS -H "X-Forwarded-For: 8.8.8.8" \
  http://127.0.0.1:8080/api/v1/markets/eligibility | jq .
```

```json
{
  "eligible": false,
  "reason": "geoblock_timeout",
  "checkedAt": "2026-08-10T06:17:31.666358833Z",
  "region": "US"
}
```

| Check | Result |
|-------|--------|
| GeoIP resolves region | **PASS** (`ID`, `US`) |
| Geoblock upstream JSON | **FAIL** (`geoblock_timeout`) |
| Fail-closed behavior | **PASS** (no allow-all stub) |

### Capabilities — `order_submit` invariant

```bash
curl -sS http://127.0.0.1:8080/api/v1/markets/capabilities | jq '.features.order_submit'
```

```
false
```

### Fail-closed metric

```bash
curl -sS http://127.0.0.1:8080/metrics | grep eligibility_fail_closed
```

```
retropick_markets_eligibility_fail_closed_total 3
```

### Geoblock direct from ops host (diagnostic)

```bash
curl -sS -H "Accept: application/json" "https://polymarket.com/api/geoblock"
```

```
curl: (60) SSL certificate problem: certificate has expired
```

With `-k` (diagnostic only): HTTP 301 HTML from nginx — not valid JSON `blocked` field. Explains local `geoblock_timeout`; staging VPS egress (Singapore/Tokyo) required per [`.whatNeeded.md`](../../.whatNeeded.md) §C.

---

## 6. Human clearance gate

| Role | Action |
|------|--------|
| **DevOps / ops** | Provision VPS, inject env, redeploy staging |
| **QA / ops** | Run §3 curls; paste live results into §3 slots |
| **Orchestrator / product owner** | Clear BLK-001 in `BLOCKERS_AND_HUMAN_APPROVALS.md`; set MKT-P2-002 `done`; authorize phase advance |

Orchestrator patches (human applies): [MKT-P2-002-BLK001-evidence.md](./MKT-P2-002-BLK001-evidence.md) §Orchestrator patch.

**Agents must not** mark BLK-001 cleared without live `"eligible": true` staging JSON in §3.1.

---

## 7. Related evidence

- [MKT-P2-BLK001-ops-staging-checklist.md](./MKT-P2-BLK001-ops-staging-checklist.md)
- [MKT-P2-BLK001-local-rehearsal-evidence.md](./MKT-P2-BLK001-local-rehearsal-evidence.md)
- [MKT-P2-002-BLK001-evidence.md](./MKT-P2-002-BLK001-evidence.md)
- [PRODUCTION_OPERATIONS_RUNBOOK.md §7.5](../../platform/PRODUCTION_OPERATIONS_RUNBOOK.md#75-eligibility-upstream-wiring-blk-001)
- [`.whatNeeded.md`](../../.whatNeeded.md) §C
