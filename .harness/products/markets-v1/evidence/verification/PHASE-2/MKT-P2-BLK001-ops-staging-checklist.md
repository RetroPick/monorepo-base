# BLK-001 — Ops staging checklist (geoblock / GeoIP eligibility)

**Blocker:** BLK-001  
**Related task:** MKT-P2-002 (remains `blocked` until this checklist passes)  
**Date:** 2026-08-09  
**Last ops1 update:** 2026-08-10 — proof template filed; staging VPS pending  
**Status:** **open — ops action required**

## Description

Operational checklist to wire GeoIP + Polymarket geoblock env in staging and capture integration proof that `GET /api/v1/markets/eligibility` returns `eligible: true` for an allowed region. Code adapters are shipped; default deploy is fail-closed. Do not clear BLK-001 without live staging evidence.

## Prerequisites

- [MKT-P2-002-BLK001-evidence.md](./MKT-P2-002-BLK001-evidence.md) — shipped code reference
- [AUTH_SESSION_AND_ELIGIBILITY.md §4.1](../../backend/AUTH_SESSION_AND_ELIGIBILITY.md#41-implementation-status-mkt-p2-002)
- [PRODUCTION_OPERATIONS_RUNBOOK.md §7.5](../../platform/PRODUCTION_OPERATIONS_RUNBOOK.md#75-eligibility-upstream-wiring-blk-001)
- [BLOCKERS_AND_HUMAN_APPROVALS.md §3.1](../../BLOCKERS_AND_HUMAN_APPROVALS.md#31-blk-001-progress-note)

---



## 1. Required environment variables

Inject in **staging** (and prod when approved). Store secrets in secret manager — never commit values.

### GeoIP (enables `HTTPResolver`; without → `geo_unknown`)


| Variable                 | Required | Purpose                                         |
| ------------------------ | -------- | ----------------------------------------------- |
| `MARKETS_GEOIP_BASE_URL` | **Yes**  | GeoIP HTTP base (example: `https://ipinfo.io`)  |
| `MARKETS_GEOIP_PATH`     | No       | Path template with `{ip}`; default `/{ip}/json` |
| `MARKETS_GEOIP_API_KEY`  | No*      | Provider token (query param `token`)            |
| `GEO_PROVIDER_API_KEY`   | No*      | Alias when `MARKETS_GEOIP_API_KEY` unset        |
| `MARKETS_GEOIP_TIMEOUT`  | No       | HTTP timeout; default `5s`                      |


Required if provider mandates authentication.

### Geoblock (enables `HTTPChecker`; without → `geoblock_upstream_unavailable`)


| Variable                    | Required | Purpose                                                      |
| --------------------------- | -------- | ------------------------------------------------------------ |
| `MARKETS_GEOBLOCK_BASE_URL` | **Yes**  | Polymarket geoblock base (example: `https://polymarket.com`) |
| `MARKETS_GEOBLOCK_PATH`     | No       | Path; default `/api/geoblock`                                |


**Both** `MARKETS_GEOIP_BASE_URL` and `MARKETS_GEOBLOCK_BASE_URL` must be set for `eligible: true` on allowed regions.

---



## 2. Deploy and smoke

- [ ] Set env vars on staging BFF (`markets-api` / `cmd/markets-api` deploy unit)
- [ ] Redeploy BFF; confirm pods/processes pick up new env (no stale config)
- [ ] Confirm fail-closed metric exists: `retropick_markets_eligibility_fail_closed_total`
- [ ] From a **blocked** test IP/VPN (if available), confirm deny path still works (`eligible: false`, reason `region_blocked` or `geoblock_denied`)

---



## 3. Verification curl commands

Replace `STAGING_API` with staging base URL (example: `https://api-staging.example`).

### 3.1 Public eligibility (no session)

```bash
curl -sS "${STAGING_API}/api/v1/markets/eligibility" | jq .
```

**Pass:** JSON includes `"eligible": true` and a non-empty `region` when called from an **allowed** staging egress IP.

**Fail (expected before wiring):** `"eligible": false` with `"reason": "geo_unknown"` or `"geoblock_upstream_unavailable"`.

### 3.2 Eligible-gated route (session required)

With valid SIWE session cookie from allowed region:

```bash
curl -sS -b "mkt_session=<cookie>" "${STAGING_API}/api/v1/markets/me/balances" | jq .
```

**Pass (after BLK-001):** `200` with balances payload (or empty balances OK).

**Fail while BLK-001 open:** `403` with `ELIGIBILITY_DENIED`.

### 3.3 Auth-only route (must stay open)

```bash
curl -sS -b "mkt_session=<cookie>" "${STAGING_API}/api/v1/markets/me/wallets" | jq .
```

**Pass:** `200` regardless of eligibility (auth-only per AUTH §5).

---



## 4. Pass criteria (BLK-001 clearance)

All must be true before clearing BLK-001:


| #   | Criterion                                                                   | Evidence                                          |
| --- | --------------------------------------------------------------------------- | ------------------------------------------------- |
| 1   | Both geo + geoblock env vars set in staging                                 | Deploy config screenshot or redacted env manifest |
| 2   | `GET /api/v1/markets/eligibility` → `eligible: true` from allowed region/IP | Saved curl output + timestamp                     |
| 3   | Deny path still works for blocked fixture (if testable)                     | Optional curl from blocked IP                     |
| 4   | No allow-all stub deployed                                                  | Code review / env audit                           |
| 5   | Evidence filed under `verification/PHASE-2/`                                | [x] [MKT-P2-BLK001-staging-proof.md](./MKT-P2-BLK001-staging-proof.md) (template; staging curls pending) |


---



## 5. Who clears BLK-001


| Role                             | Action                                                                                                                                                                 |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **DevOps / ops**                 | Inject env, redeploy staging, rotate GeoIP API key as needed                                                                                                           |
| **QA / ops**                     | Run verification curls, file staging proof artifact                                                                                                                    |
| **Orchestrator / product owner** | Update `BLOCKERS_AND_HUMAN_APPROVALS.md` BLK-001 row to resolved; set MKT-P2-002 `done` in task-graph; authorize `current_phase` advance if phase gate otherwise green |


Agents **must not** mark BLK-001 cleared or MKT-P2-002 `done` without human-filed staging proof.

---



## 6. What NOT to do

- **Do not** ship an allow-all geoblock stub or hardcode `eligible: true`
- **Do not** trust client geo headers (`X-Geo-`*, locale) — server-side IP only
- **Do not** mark MKT-P2-002 `done` based on unit tests alone
- **Do not** advance `current_phase` to PHASE-3 until BLK-001 clears **and** orchestrator authorizes
- **Do not** invent curl output or staging success in evidence files

---



## 7. Rollback

Unset `MARKETS_GEOIP_*` and `MARKETS_GEOBLOCK_*`, redeploy → eligibility returns fail-closed (`geo_unknown` / `geoblock_upstream_unavailable`). Trading routes remain `403 ELIGIBILITY_DENIED`.

---



## 8. Related evidence

- [MKT-P2-002-BLK001-evidence.md](./MKT-P2-002-BLK001-evidence.md)
- [MKT-P2-002-evidence.md](./MKT-P2-002-evidence.md)
- [MKT-P2-002-test-output.txt](./MKT-P2-002-test-output.txt)
- [MKT-P2-007-phase-gate.md](./MKT-P2-007-phase-gate.md) — phase advance blocked pending this checklist
- [MKT-P2-BLK001-staging-proof.md](./MKT-P2-BLK001-staging-proof.md) — staging proof template (local rehearsal filed; live staging pending)

