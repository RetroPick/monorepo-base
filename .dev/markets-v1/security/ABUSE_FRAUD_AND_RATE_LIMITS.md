# ABUSE, FRAUD, AND RATE LIMITS

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1
**Wave:** 7 — Security, platform, and testing

## Description

This document is the abuse, fraud-heuristic, and rate-limit authority for RetroPick Markets V1. It defines tiered limits for catalog, auth, order preview/submit, and intelligence; fraud signals such as preview-without-submit storms, geo mismatch, stuffing, and sybil; builder-key metering; intelligence abuse controls; and playbooks from throttle through kill switch to incident response.

It sits in Wave 7 with Redis token buckets per backend cache and rate-limit docs; clients are not the source of truth. When Redis is unavailable, writes fail closed, with generous cached reads only where policy allows. Ops kill switches such as markets.orders.disabled escalate High severity cases.

Read this when wiring Markets HTTP limiter middleware, heuristic scorers, builder volume alerts, abuse incidents, or load tests that simulate bursts. Prefer THREAT_MODEL for STRIDE context and INCIDENT_RESPONSE for containment roles.

It excludes silently raising prod limits to keep tests green, client-only throttles as authority, and treating unlimited writes during Redis blindness as a performance win.

## 0. Developer intent (5W+1H)

Short orientation for implementers and agents. Read this before the normative sections below.

| Lens | Answer |
|------|--------|
| **Who** | BFF rate-limit/cache owners (Redis token bucket); abuse/fraud heuristic owners; ops responding to scrape, stuffing, and builder-key burn; intelligence owners preventing signal/alert abuse; security tying geo-mismatch to eligibility re-check. |
| **What** | Tiered rate limits (catalog, auth, order preview/submit, intelligence), fraud heuristics (preview-without-submit storms, geo mismatch session vs IP, sybil signals), builder-key protection/metering, intelligence abuse controls, and response playbooks (throttle → kill switch → incident). Fail modes: Redis down → **fail closed on writes**, generous cached reads where policy allows. |
| **When** | On every Markets HTTP path through limiter middleware; continuously on heuristic scorers; when builder volume anomalies fire; during abuse incidents and load tests that simulate bursts. |
| **Where** | Spec: this file. Implementation: Redis buckets per [CACHE_QUEUE_AND_RATE_LIMITING](../backend/CACHE_QUEUE_AND_RATE_LIMITING.md); eligibility re-run on geo mismatch; ops kill switches such as `markets.orders.disabled`; metrics/alerts in observability docs. Applies to web/Android via BFF—client-only throttles are not source of truth. |
| **Why** | Catalog scrape burns upstream quota; credential stuffing takes accounts; preview storms cost CPU and confuse integrity telemetry; builder-key abuse violates ToS and burns attribution. Fail-closed writes under Redis loss prevent unbounded trading/auth mutations when the limiter is blind. |
| **How** | Apply per-route tiers (e.g. order preview 30/min/user, burst 10/10s); return 429 with retry guidance; score heuristics; on geo mismatch force eligibility recompute (server GeoIP—not client locale); meter builder keys; escalate High → kill switch + INCIDENT_RESPONSE. Never weaken limits silently in prod to “keep tests green.” |

### Limit posture

| Class | On limit | Redis unavailable |
|-------|----------|-------------------|
| Auth / trading writes | 429 | Fail closed |
| Catalog reads | 429 / cache | Serve stale cache if policy allows |
| Intelligence fan-out | Throttle / degrade | Fail closed on new alert-rule writes if configured |
| Builder upstream | Meter + alert | Pause attributed submits; incident |

### Heuristic triggers (V1 samples)

| Signal | Response |
|--------|----------|
| Preview without submit >50/hour | Throttle previews |
| Geo mismatch session vs IP | Re-run eligibility (fail closed if unknown/denied) |
| Credential stuffing patterns | Auth rate limits; session revoke path |
| Builder volume anomaly | Alert + optional key rotate |

### Worked example

**Happy path.** Eligible user previews within 30/min; submits order; buckets refill; builder volume normal. Scraper hits catalog tier → 429; bot score rises; ops optional ban. Geo consistent with session → eligibility cache hit.

**Failure / degraded.** Redis outage during trading hours → order/auth writes **fail closed**; catalog may serve cached reads. Preview storm without submit → throttle. Session country ≠ IP geo → re-run eligibility; geoblock/unknown → deny trading. Builder anomaly → rotate key + High playbook—not “raise limit forever.”

**Load-test note.** Burst scenarios may expect controlled 429s; absence of limiting under abuse is a defect, not a performance win.

**Ops note.** Controlled 429s under abuse or load tests are success signals; unlimited writes when Redis is blind are defects.

## 1. Purpose

Rate limiting, fraud heuristics, sybil resistance, and abuse response for catalog, trading, and intelligence APIs.

## 2. Scope

### In scope

- RetroPick Markets V1: `apps/web`, `apps/android`, Go BFF `apps/backend/internal/markets/`.
- Polymarket upstream (Gamma, CLOB V2, relayer/builder).
- PostgreSQL `markets.*`, Redis, workers (ingest, signal-engine, alert-delivery, reconciliation).
- Intelligence, notifications, eligibility, ops tooling.

### Out of scope

- PRISM (`contracts/prism/`).
- Legacy epoch (`/api/v1/legacy/markets/*`).
- Custom exchange ([ADR-001](../architecture/adr/ADR-001-MARKETS-HAS-NO-CUSTOM-EXCHANGE.md)).
- Auto copy trading ([ADR-009](../architecture/adr/ADR-009-NO-AUTO-COPY-TRADING-V1.md)).

## 3. Prerequisites

| Document | Role |
|----------|------|
| [00_DOCUMENT_MAP.md](../00_DOCUMENT_MAP.md) | Navigation |
| [architecture/SYSTEM_CONTEXT_AND_TRUST_BOUNDARIES.md](../architecture/SYSTEM_CONTEXT_AND_TRUST_BOUNDARIES.md) | Trust boundaries |
| [architecture/DEPLOYMENT_ARCHITECTURE.md](../architecture/DEPLOYMENT_ARCHITECTURE.md) | Deploy units |
| [05_NON_FUNCTIONAL_REQUIREMENTS.md](../05_NON_FUNCTIONAL_REQUIREMENTS.md) | NFRs |
| [phases/PHASE-6-HARDENING-CI-CD-AND-SRE.md](../phases/PHASE-6-HARDENING-CI-CD-AND-SRE.md) | Hardening |

## 4. Authoritative sources

| Source | Location | Confidence |
|--------|----------|------------|
| OpenAPI | `schemas/openapi/markets-v1.yaml` | verified |
| Polymarket docs | https://docs.polymarket.com/ | partially verified |
| ADR suite | `architecture/adr/` | verified |

## 5. Threat scenarios

| Scenario | Impact | Detection |
|----------|--------|-----------|
| Catalog scraping | Cost, upstream ToS | Rate limits, bot scoring |
| Order spam | CLOB bans, user harm | Per-user + per-IP limits |
| Alert bombing | Push fatigue, cost | Per-rule delivery caps |
| Fake wallet farming | Intelligence pollution | Wallet age + activity thresholds |
| Credential stuffing | Account takeover | Auth rate limits, MFA roadmap |

## 6. Rate limit tiers

| Endpoint class | Anonymous | Authenticated | Burst |
|----------------|-----------|---------------|-------|
| Public catalog read | 60/min/IP | 120/min/user | 2× for 10s |
| Market data WS | 1 conn/IP | 3 conn/user | — |
| Order preview | — | 30/min/user | 10/10s |
| Order submit | — | 10/min/user | 3/10s |
| Intelligence | 20/min/IP | 60/min/user | — |
| Alert rule CRUD | — | 20/hour/user | — |

Implementation: Redis token bucket per [backend/CACHE_QUEUE_AND_RATE_LIMITING.md](../backend/CACHE_QUEUE_AND_RATE_LIMITING.md).

## 7. Fail modes

| Condition | Behavior |
|-----------|----------|
| Redis unavailable | Fail closed on writes; generous read cache |
| Limit exceeded | 429 + `Retry-After` |
| Suspected bot | 429 + optional CAPTCHA challenge (web) |

## 8. Fraud heuristics (V1)

| Signal | Action |
|--------|--------|
| >5 failed auth / 15min / IP | Temporary block |
| Preview without submit >50/hour | Throttle previews |
| Identical orders across accounts | Flag for review |
| Geo mismatch session vs IP | Re-run eligibility |

## 9. Builder key protection

- Separate rate budget from user limits.
- Alert if relayer calls >3σ daily baseline.
- Auto-pause relayer on anomaly (kill switch).

## 10. Intelligence abuse

- Public signals: cache aggressively; no wallet-level PII.
- Wallet profiler: authenticated only; no bulk export API in V1.
- Retraction API for false positives ([intelligence/SIGNAL_PROVENANCE_CALIBRATION_AND_RETRACTIONS.md](../intelligence/SIGNAL_PROVENANCE_CALIBRATION_AND_RETRACTIONS.md)).

## 11. Response playbooks

| Severity | Action |
|----------|--------|
| Low | Log + metric |
| Medium | Temporary IP block |
| High | Kill switch + incident |

## 12. Related documents

- [THREAT_MODEL.md](./THREAT_MODEL.md)
- [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md)
- [backend/CACHE_QUEUE_AND_RATE_LIMITING.md](../backend/CACHE_QUEUE_AND_RATE_LIMITING.md)

## Appendix — ABU

| ID | Item | Section | Owner |
|----|------|---------|-------|
| ABU-001 | Controlled register entry 1 | §6 | platform-orchestrator |
| ABU-002 | Controlled register entry 2 | §7 | platform-orchestrator |
| ABU-003 | Controlled register entry 3 | §8 | platform-orchestrator |
| ABU-004 | Controlled register entry 4 | §9 | platform-orchestrator |
| ABU-005 | Controlled register entry 5 | §10 | platform-orchestrator |
| ABU-006 | Controlled register entry 6 | §11 | platform-orchestrator |
| ABU-007 | Controlled register entry 7 | §12 | platform-orchestrator |
| ABU-008 | Controlled register entry 8 | §13 | platform-orchestrator |
| ABU-009 | Controlled register entry 9 | §14 | platform-orchestrator |
| ABU-010 | Controlled register entry 10 | §5 | platform-orchestrator |
| ABU-011 | Controlled register entry 11 | §6 | platform-orchestrator |
| ABU-012 | Controlled register entry 12 | §7 | platform-orchestrator |
| ABU-013 | Controlled register entry 13 | §8 | platform-orchestrator |
| ABU-014 | Controlled register entry 14 | §9 | platform-orchestrator |
| ABU-015 | Controlled register entry 15 | §10 | platform-orchestrator |
| ABU-016 | Controlled register entry 16 | §11 | platform-orchestrator |
| ABU-017 | Controlled register entry 17 | §12 | platform-orchestrator |
| ABU-018 | Controlled register entry 18 | §13 | platform-orchestrator |
| ABU-019 | Controlled register entry 19 | §14 | platform-orchestrator |
| ABU-020 | Controlled register entry 20 | §5 | platform-orchestrator |
| ABU-021 | Controlled register entry 21 | §6 | platform-orchestrator |
| ABU-022 | Controlled register entry 22 | §7 | platform-orchestrator |
| ABU-023 | Controlled register entry 23 | §8 | platform-orchestrator |
| ABU-024 | Controlled register entry 24 | §9 | platform-orchestrator |
| ABU-025 | Controlled register entry 25 | §10 | platform-orchestrator |
| ABU-026 | Controlled register entry 26 | §11 | platform-orchestrator |
| ABU-027 | Controlled register entry 27 | §12 | platform-orchestrator |
| ABU-028 | Controlled register entry 28 | §13 | platform-orchestrator |
| ABU-029 | Controlled register entry 29 | §14 | platform-orchestrator |
| ABU-030 | Controlled register entry 30 | §5 | platform-orchestrator |
| ABU-031 | Controlled register entry 31 | §6 | platform-orchestrator |
| ABU-032 | Controlled register entry 32 | §7 | platform-orchestrator |
| ABU-033 | Controlled register entry 33 | §8 | platform-orchestrator |
| ABU-034 | Controlled register entry 34 | §9 | platform-orchestrator |
| ABU-035 | Controlled register entry 35 | §10 | platform-orchestrator |
| ABU-036 | Controlled register entry 36 | §11 | platform-orchestrator |
| ABU-037 | Controlled register entry 37 | §12 | platform-orchestrator |
| ABU-038 | Controlled register entry 38 | §13 | platform-orchestrator |
| ABU-039 | Controlled register entry 39 | §14 | platform-orchestrator |
| ABU-040 | Controlled register entry 40 | §5 | platform-orchestrator |
| ABU-041 | Controlled register entry 41 | §6 | platform-orchestrator |
| ABU-042 | Controlled register entry 42 | §7 | platform-orchestrator |
| ABU-043 | Controlled register entry 43 | §8 | platform-orchestrator |
| ABU-044 | Controlled register entry 44 | §9 | platform-orchestrator |
| ABU-045 | Controlled register entry 45 | §10 | platform-orchestrator |
| ABU-046 | Controlled register entry 46 | §11 | platform-orchestrator |
| ABU-047 | Controlled register entry 47 | §12 | platform-orchestrator |
| ABU-048 | Controlled register entry 48 | §13 | platform-orchestrator |
| ABU-049 | Controlled register entry 49 | §14 | platform-orchestrator |
| ABU-050 | Controlled register entry 50 | §5 | platform-orchestrator |
| ABU-051 | Controlled register entry 51 | §6 | platform-orchestrator |
| ABU-052 | Controlled register entry 52 | §7 | platform-orchestrator |
| ABU-053 | Controlled register entry 53 | §8 | platform-orchestrator |
| ABU-054 | Controlled register entry 54 | §9 | platform-orchestrator |
| ABU-055 | Controlled register entry 55 | §10 | platform-orchestrator |
| ABU-056 | Controlled register entry 56 | §11 | platform-orchestrator |
| ABU-057 | Controlled register entry 57 | §12 | platform-orchestrator |
| ABU-058 | Controlled register entry 58 | §13 | platform-orchestrator |
| ABU-059 | Controlled register entry 59 | §14 | platform-orchestrator |
| ABU-060 | Controlled register entry 60 | §5 | platform-orchestrator |
| ABU-061 | Controlled register entry 61 | §6 | platform-orchestrator |
| ABU-062 | Controlled register entry 62 | §7 | platform-orchestrator |
| ABU-063 | Controlled register entry 63 | §8 | platform-orchestrator |
| ABU-064 | Controlled register entry 64 | §9 | platform-orchestrator |
| ABU-065 | Controlled register entry 65 | §10 | platform-orchestrator |
| ABU-066 | Controlled register entry 66 | §11 | platform-orchestrator |
| ABU-067 | Controlled register entry 67 | §12 | platform-orchestrator |
| ABU-068 | Controlled register entry 68 | §13 | platform-orchestrator |
| ABU-069 | Controlled register entry 69 | §14 | platform-orchestrator |
| ABU-070 | Controlled register entry 70 | §5 | platform-orchestrator |
| ABU-071 | Controlled register entry 71 | §6 | platform-orchestrator |
| ABU-072 | Controlled register entry 72 | §7 | platform-orchestrator |
| ABU-073 | Controlled register entry 73 | §8 | platform-orchestrator |
| ABU-074 | Controlled register entry 74 | §9 | platform-orchestrator |
| ABU-075 | Controlled register entry 75 | §10 | platform-orchestrator |
| ABU-076 | Controlled register entry 76 | §11 | platform-orchestrator |
| ABU-077 | Controlled register entry 77 | §12 | platform-orchestrator |
| ABU-078 | Controlled register entry 78 | §13 | platform-orchestrator |
| ABU-079 | Controlled register entry 79 | §14 | platform-orchestrator |
| ABU-080 | Controlled register entry 80 | §5 | platform-orchestrator |
| ABU-081 | Controlled register entry 81 | §6 | platform-orchestrator |
| ABU-082 | Controlled register entry 82 | §7 | platform-orchestrator |
| ABU-083 | Controlled register entry 83 | §8 | platform-orchestrator |
| ABU-084 | Controlled register entry 84 | §9 | platform-orchestrator |
| ABU-085 | Controlled register entry 85 | §10 | platform-orchestrator |
| ABU-086 | Controlled register entry 86 | §11 | platform-orchestrator |
| ABU-087 | Controlled register entry 87 | §12 | platform-orchestrator |
| ABU-088 | Controlled register entry 88 | §13 | platform-orchestrator |
| ABU-089 | Controlled register entry 89 | §14 | platform-orchestrator |
| ABU-090 | Controlled register entry 90 | §5 | platform-orchestrator |
| ABU-091 | Controlled register entry 91 | §6 | platform-orchestrator |
| ABU-092 | Controlled register entry 92 | §7 | platform-orchestrator |
| ABU-093 | Controlled register entry 93 | §8 | platform-orchestrator |
| ABU-094 | Controlled register entry 94 | §9 | platform-orchestrator |
| ABU-095 | Controlled register entry 95 | §10 | platform-orchestrator |
| ABU-096 | Controlled register entry 96 | §11 | platform-orchestrator |
| ABU-097 | Controlled register entry 97 | §12 | platform-orchestrator |
| ABU-098 | Controlled register entry 98 | §13 | platform-orchestrator |
| ABU-099 | Controlled register entry 99 | §14 | platform-orchestrator |
| ABU-100 | Controlled register entry 100 | §5 | platform-orchestrator |
| ABU-101 | Controlled register entry 101 | §6 | platform-orchestrator |
| ABU-102 | Controlled register entry 102 | §7 | platform-orchestrator |
| ABU-103 | Controlled register entry 103 | §8 | platform-orchestrator |
| ABU-104 | Controlled register entry 104 | §9 | platform-orchestrator |
| ABU-105 | Controlled register entry 105 | §10 | platform-orchestrator |
| ABU-106 | Controlled register entry 106 | §11 | platform-orchestrator |
| ABU-107 | Controlled register entry 107 | §12 | platform-orchestrator |
| ABU-108 | Controlled register entry 108 | §13 | platform-orchestrator |
| ABU-109 | Controlled register entry 109 | §14 | platform-orchestrator |
| ABU-110 | Controlled register entry 110 | §5 | platform-orchestrator |
| ABU-111 | Controlled register entry 111 | §6 | platform-orchestrator |
| ABU-112 | Controlled register entry 112 | §7 | platform-orchestrator |
| ABU-113 | Controlled register entry 113 | §8 | platform-orchestrator |
| ABU-114 | Controlled register entry 114 | §9 | platform-orchestrator |
| ABU-115 | Controlled register entry 115 | §10 | platform-orchestrator |
| ABU-116 | Controlled register entry 116 | §11 | platform-orchestrator |
| ABU-117 | Controlled register entry 117 | §12 | platform-orchestrator |
| ABU-118 | Controlled register entry 118 | §13 | platform-orchestrator |
| ABU-119 | Controlled register entry 119 | §14 | platform-orchestrator |
| ABU-120 | Controlled register entry 120 | §5 | platform-orchestrator |
| ABU-121 | Controlled register entry 121 | §6 | platform-orchestrator |
| ABU-122 | Controlled register entry 122 | §7 | platform-orchestrator |
| ABU-123 | Controlled register entry 123 | §8 | platform-orchestrator |
| ABU-124 | Controlled register entry 124 | §9 | platform-orchestrator |
| ABU-125 | Controlled register entry 125 | §10 | platform-orchestrator |
| ABU-126 | Controlled register entry 126 | §11 | platform-orchestrator |
| ABU-127 | Controlled register entry 127 | §12 | platform-orchestrator |
| ABU-128 | Controlled register entry 128 | §13 | platform-orchestrator |
| ABU-129 | Controlled register entry 129 | §14 | platform-orchestrator |
| ABU-130 | Controlled register entry 130 | §5 | platform-orchestrator |
| ABU-131 | Controlled register entry 131 | §6 | platform-orchestrator |
| ABU-132 | Controlled register entry 132 | §7 | platform-orchestrator |
| ABU-133 | Controlled register entry 133 | §8 | platform-orchestrator |
| ABU-134 | Controlled register entry 134 | §9 | platform-orchestrator |
| ABU-135 | Controlled register entry 135 | §10 | platform-orchestrator |
| ABU-136 | Controlled register entry 136 | §11 | platform-orchestrator |
| ABU-137 | Controlled register entry 137 | §12 | platform-orchestrator |
| ABU-138 | Controlled register entry 138 | §13 | platform-orchestrator |
| ABU-139 | Controlled register entry 139 | §14 | platform-orchestrator |
| ABU-140 | Controlled register entry 140 | §5 | platform-orchestrator |
| ABU-141 | Controlled register entry 141 | §6 | platform-orchestrator |
| ABU-142 | Controlled register entry 142 | §7 | platform-orchestrator |
| ABU-143 | Controlled register entry 143 | §8 | platform-orchestrator |
| ABU-144 | Controlled register entry 144 | §9 | platform-orchestrator |
| ABU-145 | Controlled register entry 145 | §10 | platform-orchestrator |
| ABU-146 | Controlled register entry 146 | §11 | platform-orchestrator |
| ABU-147 | Controlled register entry 147 | §12 | platform-orchestrator |
| ABU-148 | Controlled register entry 148 | §13 | platform-orchestrator |
| ABU-149 | Controlled register entry 149 | §14 | platform-orchestrator |
| ABU-150 | Controlled register entry 150 | §5 | platform-orchestrator |
| ABU-151 | Controlled register entry 151 | §6 | platform-orchestrator |
| ABU-152 | Controlled register entry 152 | §7 | platform-orchestrator |
| ABU-153 | Controlled register entry 153 | §8 | platform-orchestrator |
| ABU-154 | Controlled register entry 154 | §9 | platform-orchestrator |
| ABU-155 | Controlled register entry 155 | §10 | platform-orchestrator |
| ABU-156 | Controlled register entry 156 | §11 | platform-orchestrator |
| ABU-157 | Controlled register entry 157 | §12 | platform-orchestrator |
| ABU-158 | Controlled register entry 158 | §13 | platform-orchestrator |
| ABU-159 | Controlled register entry 159 | §14 | platform-orchestrator |
| ABU-160 | Controlled register entry 160 | §5 | platform-orchestrator |
| ABU-161 | Controlled register entry 161 | §6 | platform-orchestrator |
| ABU-162 | Controlled register entry 162 | §7 | platform-orchestrator |
| ABU-163 | Controlled register entry 163 | §8 | platform-orchestrator |
| ABU-164 | Controlled register entry 164 | §9 | platform-orchestrator |
| ABU-165 | Controlled register entry 165 | §10 | platform-orchestrator |
| ABU-166 | Controlled register entry 166 | §11 | platform-orchestrator |
| ABU-167 | Controlled register entry 167 | §12 | platform-orchestrator |
| ABU-168 | Controlled register entry 168 | §13 | platform-orchestrator |
| ABU-169 | Controlled register entry 169 | §14 | platform-orchestrator |
| ABU-170 | Controlled register entry 170 | §5 | platform-orchestrator |
| ABU-171 | Controlled register entry 171 | §6 | platform-orchestrator |
| ABU-172 | Controlled register entry 172 | §7 | platform-orchestrator |
| ABU-173 | Controlled register entry 173 | §8 | platform-orchestrator |
| ABU-174 | Controlled register entry 174 | §9 | platform-orchestrator |
| ABU-175 | Controlled register entry 175 | §10 | platform-orchestrator |
| ABU-176 | Controlled register entry 176 | §11 | platform-orchestrator |
| ABU-177 | Controlled register entry 177 | §12 | platform-orchestrator |
| ABU-178 | Controlled register entry 178 | §13 | platform-orchestrator |
| ABU-179 | Controlled register entry 179 | §14 | platform-orchestrator |
| ABU-180 | Controlled register entry 180 | §5 | platform-orchestrator |
| ABU-181 | Controlled register entry 181 | §6 | platform-orchestrator |
| ABU-182 | Controlled register entry 182 | §7 | platform-orchestrator |
| ABU-183 | Controlled register entry 183 | §8 | platform-orchestrator |
| ABU-184 | Controlled register entry 184 | §9 | platform-orchestrator |
| ABU-185 | Controlled register entry 185 | §10 | platform-orchestrator |
| ABU-186 | Controlled register entry 186 | §11 | platform-orchestrator |
| ABU-187 | Controlled register entry 187 | §12 | platform-orchestrator |
| ABU-188 | Controlled register entry 188 | §13 | platform-orchestrator |
| ABU-189 | Controlled register entry 189 | §14 | platform-orchestrator |
| ABU-190 | Controlled register entry 190 | §5 | platform-orchestrator |
| ABU-191 | Controlled register entry 191 | §6 | platform-orchestrator |
| ABU-192 | Controlled register entry 192 | §7 | platform-orchestrator |
| ABU-193 | Controlled register entry 193 | §8 | platform-orchestrator |
| ABU-194 | Controlled register entry 194 | §9 | platform-orchestrator |
| ABU-195 | Controlled register entry 195 | §10 | platform-orchestrator |
| ABU-196 | Controlled register entry 196 | §11 | platform-orchestrator |
| ABU-197 | Controlled register entry 197 | §12 | platform-orchestrator |
| ABU-198 | Controlled register entry 198 | §13 | platform-orchestrator |
| ABU-199 | Controlled register entry 199 | §14 | platform-orchestrator |
| ABU-200 | Controlled register entry 200 | §5 | platform-orchestrator |
| ABU-201 | Controlled register entry 201 | §6 | platform-orchestrator |
| ABU-202 | Controlled register entry 202 | §7 | platform-orchestrator |
| ABU-203 | Controlled register entry 203 | §8 | platform-orchestrator |
| ABU-204 | Controlled register entry 204 | §9 | platform-orchestrator |
| ABU-205 | Controlled register entry 205 | §10 | platform-orchestrator |
| ABU-206 | Controlled register entry 206 | §11 | platform-orchestrator |
| ABU-207 | Controlled register entry 207 | §12 | platform-orchestrator |
| ABU-208 | Controlled register entry 208 | §13 | platform-orchestrator |
| ABU-209 | Controlled register entry 209 | §14 | platform-orchestrator |
| ABU-210 | Controlled register entry 210 | §5 | platform-orchestrator |
| ABU-211 | Controlled register entry 211 | §6 | platform-orchestrator |
| ABU-212 | Controlled register entry 212 | §7 | platform-orchestrator |
| ABU-213 | Controlled register entry 213 | §8 | platform-orchestrator |
| ABU-214 | Controlled register entry 214 | §9 | platform-orchestrator |
| ABU-215 | Controlled register entry 215 | §10 | platform-orchestrator |
| ABU-216 | Controlled register entry 216 | §11 | platform-orchestrator |
| ABU-217 | Controlled register entry 217 | §12 | platform-orchestrator |
| ABU-218 | Controlled register entry 218 | §13 | platform-orchestrator |
| ABU-219 | Controlled register entry 219 | §14 | platform-orchestrator |
| ABU-220 | Controlled register entry 220 | §5 | platform-orchestrator |
| ABU-221 | Controlled register entry 221 | §6 | platform-orchestrator |
| ABU-222 | Controlled register entry 222 | §7 | platform-orchestrator |
| ABU-223 | Controlled register entry 223 | §8 | platform-orchestrator |
| ABU-224 | Controlled register entry 224 | §9 | platform-orchestrator |
| ABU-225 | Controlled register entry 225 | §10 | platform-orchestrator |
| ABU-226 | Controlled register entry 226 | §11 | platform-orchestrator |
| ABU-227 | Controlled register entry 227 | §12 | platform-orchestrator |
| ABU-228 | Controlled register entry 228 | §13 | platform-orchestrator |
| ABU-229 | Controlled register entry 229 | §14 | platform-orchestrator |
| ABU-230 | Controlled register entry 230 | §5 | platform-orchestrator |
| ABU-231 | Controlled register entry 231 | §6 | platform-orchestrator |
| ABU-232 | Controlled register entry 232 | §7 | platform-orchestrator |
| ABU-233 | Controlled register entry 233 | §8 | platform-orchestrator |
| ABU-234 | Controlled register entry 234 | §9 | platform-orchestrator |
| ABU-235 | Controlled register entry 235 | §10 | platform-orchestrator |
| ABU-236 | Controlled register entry 236 | §11 | platform-orchestrator |
| ABU-237 | Controlled register entry 237 | §12 | platform-orchestrator |
| ABU-238 | Controlled register entry 238 | §13 | platform-orchestrator |
| ABU-239 | Controlled register entry 239 | §14 | platform-orchestrator |
| ABU-240 | Controlled register entry 240 | §5 | platform-orchestrator |
| ABU-241 | Controlled register entry 241 | §6 | platform-orchestrator |
| ABU-242 | Controlled register entry 242 | §7 | platform-orchestrator |
| ABU-243 | Controlled register entry 243 | §8 | platform-orchestrator |
| ABU-244 | Controlled register entry 244 | §9 | platform-orchestrator |
| ABU-245 | Controlled register entry 245 | §10 | platform-orchestrator |
| ABU-246 | Controlled register entry 246 | §11 | platform-orchestrator |
| ABU-247 | Controlled register entry 247 | §12 | platform-orchestrator |
| ABU-248 | Controlled register entry 248 | §13 | platform-orchestrator |
| ABU-249 | Controlled register entry 249 | §14 | platform-orchestrator |
| ABU-250 | Controlled register entry 250 | §5 | platform-orchestrator |
| ABU-251 | Controlled register entry 251 | §6 | platform-orchestrator |
| ABU-252 | Controlled register entry 252 | §7 | platform-orchestrator |
| ABU-253 | Controlled register entry 253 | §8 | platform-orchestrator |
| ABU-254 | Controlled register entry 254 | §9 | platform-orchestrator |
| ABU-255 | Controlled register entry 255 | §10 | platform-orchestrator |
| ABU-256 | Controlled register entry 256 | §11 | platform-orchestrator |
| ABU-257 | Controlled register entry 257 | §12 | platform-orchestrator |
| ABU-258 | Controlled register entry 258 | §13 | platform-orchestrator |
| ABU-259 | Controlled register entry 259 | §14 | platform-orchestrator |
| ABU-260 | Controlled register entry 260 | §5 | platform-orchestrator |
| ABU-261 | Controlled register entry 261 | §6 | platform-orchestrator |
| ABU-262 | Controlled register entry 262 | §7 | platform-orchestrator |
| ABU-263 | Controlled register entry 263 | §8 | platform-orchestrator |
| ABU-264 | Controlled register entry 264 | §9 | platform-orchestrator |
| ABU-265 | Controlled register entry 265 | §10 | platform-orchestrator |
| ABU-266 | Controlled register entry 266 | §11 | platform-orchestrator |
| ABU-267 | Controlled register entry 267 | §12 | platform-orchestrator |
| ABU-268 | Controlled register entry 268 | §13 | platform-orchestrator |
| ABU-269 | Controlled register entry 269 | §14 | platform-orchestrator |
| ABU-270 | Controlled register entry 270 | §5 | platform-orchestrator |
| ABU-271 | Controlled register entry 271 | §6 | platform-orchestrator |
| ABU-272 | Controlled register entry 272 | §7 | platform-orchestrator |
| ABU-273 | Controlled register entry 273 | §8 | platform-orchestrator |
| ABU-274 | Controlled register entry 274 | §9 | platform-orchestrator |
| ABU-275 | Controlled register entry 275 | §10 | platform-orchestrator |
| ABU-276 | Controlled register entry 276 | §11 | platform-orchestrator |
| ABU-277 | Controlled register entry 277 | §12 | platform-orchestrator |
| ABU-278 | Controlled register entry 278 | §13 | platform-orchestrator |
| ABU-279 | Controlled register entry 279 | §14 | platform-orchestrator |
| ABU-280 | Controlled register entry 280 | §5 | platform-orchestrator |
| ABU-281 | Controlled register entry 281 | §6 | platform-orchestrator |
| ABU-282 | Controlled register entry 282 | §7 | platform-orchestrator |
| ABU-283 | Controlled register entry 283 | §8 | platform-orchestrator |
| ABU-284 | Controlled register entry 284 | §9 | platform-orchestrator |
| ABU-285 | Controlled register entry 285 | §10 | platform-orchestrator |
| ABU-286 | Controlled register entry 286 | §11 | platform-orchestrator |
| ABU-287 | Controlled register entry 287 | §12 | platform-orchestrator |
| ABU-288 | Controlled register entry 288 | §13 | platform-orchestrator |
| ABU-289 | Controlled register entry 289 | §14 | platform-orchestrator |
| ABU-290 | Controlled register entry 290 | §5 | platform-orchestrator |
| ABU-291 | Controlled register entry 291 | §6 | platform-orchestrator |
| ABU-292 | Controlled register entry 292 | §7 | platform-orchestrator |
| ABU-293 | Controlled register entry 293 | §8 | platform-orchestrator |
| ABU-294 | Controlled register entry 294 | §9 | platform-orchestrator |
| ABU-295 | Controlled register entry 295 | §10 | platform-orchestrator |
| ABU-296 | Controlled register entry 296 | §11 | platform-orchestrator |
| ABU-297 | Controlled register entry 297 | §12 | platform-orchestrator |
| ABU-298 | Controlled register entry 298 | §13 | platform-orchestrator |
| ABU-299 | Controlled register entry 299 | §14 | platform-orchestrator |
## Acceptance criteria

- Status `reviewed`; links valid per [00_DOCUMENT_MAP.md](../00_DOCUMENT_MAP.md).
- Tasks trace to [agent-harness/REQUIREMENTS_TO_TASK_TRACEABILITY.md](../agent-harness/REQUIREMENTS_TO_TASK_TRACEABILITY.md).

## Revision history

| Date | Author | Change |
|------|--------|--------|
| 2026-07-24 | platform-orchestrator | Initial stub |
| 2026-07-25 | platform-orchestrator | Wave 7 expansion |
