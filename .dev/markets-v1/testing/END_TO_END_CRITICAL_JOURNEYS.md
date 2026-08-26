# END-TO-END CRITICAL JOURNEYS

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1
**Wave:** 7 — Security, platform, and testing

## Description

This document catalogs launch-critical end-to-end journeys for RetroPick Markets V1: browse, eligibility allow/deny (geo), wallet connect, preview and submit, cancel, portfolio, redeem/deposit/withdraw (P1), alerts, intelligence, degraded upstream banner (P0), and session expiry—with detailed steps for trading core (E2E-05) and degradation (E2E-13).

It sits in Wave 7 under apps/web/e2e/markets/, Android e2e trees, and optional shared e2e paths. Staging only for funded paths; CI may run a mocked subset per the pyramid doc. Signing stays in the wallet under test—no RetroPick key custody. Evidence includes Playwright screenshots, JUnit XML, and optional redacted HAR.

Read this for staging smoke on deploy, full P0 before release, and regression on trading or eligibility changes. Prefer TEST_PYRAMID_AND_ENVIRONMENTS for layer choice and web/Android error UX docs for screen-state detail.

It excludes production user wallets in automation and skipping geo-deny or degradation coverage.

## 0. Developer intent (5W+1H)

Short orientation for implementers and agents. Read this before the normative sections below.

| Lens | Answer |
|------|--------|
| **Who** | QA + web/Android eng implementing Playwright / UI Automator journeys; staging wallet operators (test EOAs only); release verifiers requiring P0 greens; agents extending catalog without inventing gambling-heavy UX copy. |
| **What** | Launch-critical E2E catalog: browse, eligibility allow/deny (**geo**), wallet connect, preview+submit, cancel, portfolio, redeem/deposit/withdraw (P1), alerts, intelligence, **degraded upstream banner (P0)**, session expiry. Detailed steps for E2E-05 trading core and E2E-13 degradation; evidence artifacts. |
| **When** | Staging smoke on deploy; full P0 before release; regression on trading/eligibility changes; scheduled Android where phase-gated. |
| **Where** | Spec: this file. `apps/web/e2e/markets/`, Android e2e tree, optional `tests/e2e/markets/`. Staging only for funded paths; CI may run subset with mocks per pyramid doc. |
| **Why** | Journeys prove cross-stack wiring CI units cannot: cookie/session, geo deny UX, human preview, wallet sign, portfolio. P0 geo-deny and degradation prevent “happy path only” launches. No RetroPick key custody—signing stays in wallet under test. |
| **How** | Automate steps/expected; seed eligible vs geo-denied users; assert preview fields before sign; assert `order_attempts`/CLOB; capture screenshots/JUnit; reconcile test wallet daily; never use real user wallets in automation. |

### P0 journey set

| ID | Journey |
|----|---------|
| E2E-01 | Catalog → event detail |
| E2E-02 | Eligibility allowed |
| E2E-03 | Eligibility denied (geo) |
| E2E-04 | Connect wallet |
| E2E-05 | Preview + submit limit order |
| E2E-07 | Portfolio positions |
| E2E-13 | Upstream down banner / trading disabled |

### Evidence artifacts

| Artifact | Use |
|----------|-----|
| Playwright screenshot on failure | Debug UX |
| JUnit XML | CI gate |
| Redacted HAR (optional) | API debugging |

### Worked example

**Happy path.** E2E-05: open market → buy 10 USDC @ 0.50 → preview modal matches → wallet sign → 201 → portfolio lists order; `order_attempts=accepted`.

**Failure / degraded.** E2E-03: geo-denied user sees ineligible; trading controls disabled—not a client bypass. E2E-13: Gamma 503 via toxiproxy → banner “market data delayed”; submit disabled/clear error; restore clears <2min. Staging wallet over cap → stop run; reconcile.

**Never invent.** Using production user wallets or skipping geo-deny coverage.

## 1. Purpose

User journey E2E test specifications for Markets V1 launch-critical paths across web and Android.

## 2. Scope

### In scope

- RetroPick Markets V1: `apps/web`, `apps/android`, Go BFF `apps/backend/internal/markets/`.
- Polymarket upstream (Gamma, CLOB V2, relayer/builder).
- PostgreSQL `markets.*`, Redis, workers (ingest, signal-engine, alert-delivery, reconciliation).
- Intelligence, notifications, eligibility, ops tooling.

### Out of scope

- PRISM (`contracts/prism/`).
Current Markets V1 authority: `.harness/products/markets-v1/governance/AGENT_OPERATING_CONTRACT.md`.
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

## 5. Journey catalog

| ID | Journey | Platforms | Priority |
|----|---------|-----------|----------|
| E2E-01 | Browse catalog → event detail | Web, Android | P0 |
| E2E-02 | Eligibility check (allowed) | Web, Android | P0 |
| E2E-03 | Eligibility denied (geo) | Web | P0 |
| E2E-04 | Connect wallet | Web, Android | P0 |
| E2E-05 | Preview + submit limit order | Web, Android | P0 |
| E2E-06 | Cancel open order | Web | P1 |
| E2E-07 | View portfolio positions | Web, Android | P0 |
| E2E-08 | Redeem resolved position | Web | P1 |
| E2E-09 | Deposit USDC (happy path) | Web | P1 |
| E2E-10 | Withdraw USDC | Web | P1 |
| E2E-11 | Create alert rule + receive push | Android | P1 |
| E2E-12 | Intelligence whale feed | Web | P2 |
| E2E-13 | Degraded: upstream down banner | Web | P0 |
| E2E-14 | Session expiry re-auth | Web, Android | P1 |

## 6. E2E-05 detail (trading core)

**Preconditions:** Staging, eligible user, funded test wallet.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open market | Order book visible |
| 2 | Enter buy 10 USDC @ 0.50 | Preview modal |
| 3 | Confirm preview matches | Amount, market, side correct |
| 4 | Sign in wallet | Signature returned |
| 5 | Submit | 201 + order ID |
| 6 | Portfolio | Open order listed |

**Postconditions:** `order_attempts` row `accepted`; CLOB has order.

## 7. E2E-13 detail (degradation)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Simulate Gamma 503 (toxiproxy) | Banner: market data delayed |
| 2 | Attempt order submit | Disabled or clear error |
| 3 | Restore upstream | Banner clears <2min |

## 8. Test implementation

| Platform | Framework | Location |
|----------|-----------|----------|
| Web | Playwright | `apps/web/e2e/markets/` |
| Android | UI Automator / Compose test | `apps/android/.../e2e/` |
| API-only | Go + staging | `tests/e2e/markets/` |

## 9. Staging wallet discipline

- Dedicated test EOAs; max balance caps.
- No mainnet user wallets in automation.
- Daily reconciliation of test wallet activity.

## 10. Evidence artifacts

- Screenshot on failure (Playwright).
- HAR optional for API debugging (redacted).
- JUnit XML to CI.

## 11. Related documents

- [phases/PHASE-3-WEB-TRADING-CORE.md](../phases/PHASE-3-WEB-TRADING-CORE.md)
- [phases/PHASE-4-PORTFOLIO-REDEMPTION-AND-WITHDRAWAL.md](../phases/PHASE-4-PORTFOLIO-REDEMPTION-AND-WITHDRAWAL.md)
- [RELEASE_VERIFICATION_MATRIX.md](./RELEASE_VERIFICATION_MATRIX.md)

## Appendix — END

| ID | Item | Section | Owner |
|----|------|---------|-------|
| END-001 | Controlled register entry 1 | §6 | platform-orchestrator |
| END-002 | Controlled register entry 2 | §7 | platform-orchestrator |
| END-003 | Controlled register entry 3 | §8 | platform-orchestrator |
| END-004 | Controlled register entry 4 | §9 | platform-orchestrator |
| END-005 | Controlled register entry 5 | §10 | platform-orchestrator |
| END-006 | Controlled register entry 6 | §11 | platform-orchestrator |
| END-007 | Controlled register entry 7 | §12 | platform-orchestrator |
| END-008 | Controlled register entry 8 | §13 | platform-orchestrator |
| END-009 | Controlled register entry 9 | §14 | platform-orchestrator |
| END-010 | Controlled register entry 10 | §5 | platform-orchestrator |
| END-011 | Controlled register entry 11 | §6 | platform-orchestrator |
| END-012 | Controlled register entry 12 | §7 | platform-orchestrator |
| END-013 | Controlled register entry 13 | §8 | platform-orchestrator |
| END-014 | Controlled register entry 14 | §9 | platform-orchestrator |
| END-015 | Controlled register entry 15 | §10 | platform-orchestrator |
| END-016 | Controlled register entry 16 | §11 | platform-orchestrator |
| END-017 | Controlled register entry 17 | §12 | platform-orchestrator |
| END-018 | Controlled register entry 18 | §13 | platform-orchestrator |
| END-019 | Controlled register entry 19 | §14 | platform-orchestrator |
| END-020 | Controlled register entry 20 | §5 | platform-orchestrator |
| END-021 | Controlled register entry 21 | §6 | platform-orchestrator |
| END-022 | Controlled register entry 22 | §7 | platform-orchestrator |
| END-023 | Controlled register entry 23 | §8 | platform-orchestrator |
| END-024 | Controlled register entry 24 | §9 | platform-orchestrator |
| END-025 | Controlled register entry 25 | §10 | platform-orchestrator |
| END-026 | Controlled register entry 26 | §11 | platform-orchestrator |
| END-027 | Controlled register entry 27 | §12 | platform-orchestrator |
| END-028 | Controlled register entry 28 | §13 | platform-orchestrator |
| END-029 | Controlled register entry 29 | §14 | platform-orchestrator |
| END-030 | Controlled register entry 30 | §5 | platform-orchestrator |
| END-031 | Controlled register entry 31 | §6 | platform-orchestrator |
| END-032 | Controlled register entry 32 | §7 | platform-orchestrator |
| END-033 | Controlled register entry 33 | §8 | platform-orchestrator |
| END-034 | Controlled register entry 34 | §9 | platform-orchestrator |
| END-035 | Controlled register entry 35 | §10 | platform-orchestrator |
| END-036 | Controlled register entry 36 | §11 | platform-orchestrator |
| END-037 | Controlled register entry 37 | §12 | platform-orchestrator |
| END-038 | Controlled register entry 38 | §13 | platform-orchestrator |
| END-039 | Controlled register entry 39 | §14 | platform-orchestrator |
| END-040 | Controlled register entry 40 | §5 | platform-orchestrator |
| END-041 | Controlled register entry 41 | §6 | platform-orchestrator |
| END-042 | Controlled register entry 42 | §7 | platform-orchestrator |
| END-043 | Controlled register entry 43 | §8 | platform-orchestrator |
| END-044 | Controlled register entry 44 | §9 | platform-orchestrator |
| END-045 | Controlled register entry 45 | §10 | platform-orchestrator |
| END-046 | Controlled register entry 46 | §11 | platform-orchestrator |
| END-047 | Controlled register entry 47 | §12 | platform-orchestrator |
| END-048 | Controlled register entry 48 | §13 | platform-orchestrator |
| END-049 | Controlled register entry 49 | §14 | platform-orchestrator |
| END-050 | Controlled register entry 50 | §5 | platform-orchestrator |
| END-051 | Controlled register entry 51 | §6 | platform-orchestrator |
| END-052 | Controlled register entry 52 | §7 | platform-orchestrator |
| END-053 | Controlled register entry 53 | §8 | platform-orchestrator |
| END-054 | Controlled register entry 54 | §9 | platform-orchestrator |
| END-055 | Controlled register entry 55 | §10 | platform-orchestrator |
| END-056 | Controlled register entry 56 | §11 | platform-orchestrator |
| END-057 | Controlled register entry 57 | §12 | platform-orchestrator |
| END-058 | Controlled register entry 58 | §13 | platform-orchestrator |
| END-059 | Controlled register entry 59 | §14 | platform-orchestrator |
| END-060 | Controlled register entry 60 | §5 | platform-orchestrator |
| END-061 | Controlled register entry 61 | §6 | platform-orchestrator |
| END-062 | Controlled register entry 62 | §7 | platform-orchestrator |
| END-063 | Controlled register entry 63 | §8 | platform-orchestrator |
| END-064 | Controlled register entry 64 | §9 | platform-orchestrator |
| END-065 | Controlled register entry 65 | §10 | platform-orchestrator |
| END-066 | Controlled register entry 66 | §11 | platform-orchestrator |
| END-067 | Controlled register entry 67 | §12 | platform-orchestrator |
| END-068 | Controlled register entry 68 | §13 | platform-orchestrator |
| END-069 | Controlled register entry 69 | §14 | platform-orchestrator |
| END-070 | Controlled register entry 70 | §5 | platform-orchestrator |
| END-071 | Controlled register entry 71 | §6 | platform-orchestrator |
| END-072 | Controlled register entry 72 | §7 | platform-orchestrator |
| END-073 | Controlled register entry 73 | §8 | platform-orchestrator |
| END-074 | Controlled register entry 74 | §9 | platform-orchestrator |
| END-075 | Controlled register entry 75 | §10 | platform-orchestrator |
| END-076 | Controlled register entry 76 | §11 | platform-orchestrator |
| END-077 | Controlled register entry 77 | §12 | platform-orchestrator |
| END-078 | Controlled register entry 78 | §13 | platform-orchestrator |
| END-079 | Controlled register entry 79 | §14 | platform-orchestrator |
| END-080 | Controlled register entry 80 | §5 | platform-orchestrator |
| END-081 | Controlled register entry 81 | §6 | platform-orchestrator |
| END-082 | Controlled register entry 82 | §7 | platform-orchestrator |
| END-083 | Controlled register entry 83 | §8 | platform-orchestrator |
| END-084 | Controlled register entry 84 | §9 | platform-orchestrator |
| END-085 | Controlled register entry 85 | §10 | platform-orchestrator |
| END-086 | Controlled register entry 86 | §11 | platform-orchestrator |
| END-087 | Controlled register entry 87 | §12 | platform-orchestrator |
| END-088 | Controlled register entry 88 | §13 | platform-orchestrator |
| END-089 | Controlled register entry 89 | §14 | platform-orchestrator |
| END-090 | Controlled register entry 90 | §5 | platform-orchestrator |
| END-091 | Controlled register entry 91 | §6 | platform-orchestrator |
| END-092 | Controlled register entry 92 | §7 | platform-orchestrator |
| END-093 | Controlled register entry 93 | §8 | platform-orchestrator |
| END-094 | Controlled register entry 94 | §9 | platform-orchestrator |
| END-095 | Controlled register entry 95 | §10 | platform-orchestrator |
| END-096 | Controlled register entry 96 | §11 | platform-orchestrator |
| END-097 | Controlled register entry 97 | §12 | platform-orchestrator |
| END-098 | Controlled register entry 98 | §13 | platform-orchestrator |
| END-099 | Controlled register entry 99 | §14 | platform-orchestrator |
| END-100 | Controlled register entry 100 | §5 | platform-orchestrator |
| END-101 | Controlled register entry 101 | §6 | platform-orchestrator |
| END-102 | Controlled register entry 102 | §7 | platform-orchestrator |
| END-103 | Controlled register entry 103 | §8 | platform-orchestrator |
| END-104 | Controlled register entry 104 | §9 | platform-orchestrator |
| END-105 | Controlled register entry 105 | §10 | platform-orchestrator |
| END-106 | Controlled register entry 106 | §11 | platform-orchestrator |
| END-107 | Controlled register entry 107 | §12 | platform-orchestrator |
| END-108 | Controlled register entry 108 | §13 | platform-orchestrator |
| END-109 | Controlled register entry 109 | §14 | platform-orchestrator |
| END-110 | Controlled register entry 110 | §5 | platform-orchestrator |
| END-111 | Controlled register entry 111 | §6 | platform-orchestrator |
| END-112 | Controlled register entry 112 | §7 | platform-orchestrator |
| END-113 | Controlled register entry 113 | §8 | platform-orchestrator |
| END-114 | Controlled register entry 114 | §9 | platform-orchestrator |
| END-115 | Controlled register entry 115 | §10 | platform-orchestrator |
| END-116 | Controlled register entry 116 | §11 | platform-orchestrator |
| END-117 | Controlled register entry 117 | §12 | platform-orchestrator |
| END-118 | Controlled register entry 118 | §13 | platform-orchestrator |
| END-119 | Controlled register entry 119 | §14 | platform-orchestrator |
| END-120 | Controlled register entry 120 | §5 | platform-orchestrator |
| END-121 | Controlled register entry 121 | §6 | platform-orchestrator |
| END-122 | Controlled register entry 122 | §7 | platform-orchestrator |
| END-123 | Controlled register entry 123 | §8 | platform-orchestrator |
| END-124 | Controlled register entry 124 | §9 | platform-orchestrator |
| END-125 | Controlled register entry 125 | §10 | platform-orchestrator |
| END-126 | Controlled register entry 126 | §11 | platform-orchestrator |
| END-127 | Controlled register entry 127 | §12 | platform-orchestrator |
| END-128 | Controlled register entry 128 | §13 | platform-orchestrator |
| END-129 | Controlled register entry 129 | §14 | platform-orchestrator |
| END-130 | Controlled register entry 130 | §5 | platform-orchestrator |
| END-131 | Controlled register entry 131 | §6 | platform-orchestrator |
| END-132 | Controlled register entry 132 | §7 | platform-orchestrator |
| END-133 | Controlled register entry 133 | §8 | platform-orchestrator |
| END-134 | Controlled register entry 134 | §9 | platform-orchestrator |
| END-135 | Controlled register entry 135 | §10 | platform-orchestrator |
| END-136 | Controlled register entry 136 | §11 | platform-orchestrator |
| END-137 | Controlled register entry 137 | §12 | platform-orchestrator |
| END-138 | Controlled register entry 138 | §13 | platform-orchestrator |
| END-139 | Controlled register entry 139 | §14 | platform-orchestrator |
| END-140 | Controlled register entry 140 | §5 | platform-orchestrator |
| END-141 | Controlled register entry 141 | §6 | platform-orchestrator |
| END-142 | Controlled register entry 142 | §7 | platform-orchestrator |
| END-143 | Controlled register entry 143 | §8 | platform-orchestrator |
| END-144 | Controlled register entry 144 | §9 | platform-orchestrator |
| END-145 | Controlled register entry 145 | §10 | platform-orchestrator |
| END-146 | Controlled register entry 146 | §11 | platform-orchestrator |
| END-147 | Controlled register entry 147 | §12 | platform-orchestrator |
| END-148 | Controlled register entry 148 | §13 | platform-orchestrator |
| END-149 | Controlled register entry 149 | §14 | platform-orchestrator |
| END-150 | Controlled register entry 150 | §5 | platform-orchestrator |
| END-151 | Controlled register entry 151 | §6 | platform-orchestrator |
| END-152 | Controlled register entry 152 | §7 | platform-orchestrator |
| END-153 | Controlled register entry 153 | §8 | platform-orchestrator |
| END-154 | Controlled register entry 154 | §9 | platform-orchestrator |
| END-155 | Controlled register entry 155 | §10 | platform-orchestrator |
| END-156 | Controlled register entry 156 | §11 | platform-orchestrator |
| END-157 | Controlled register entry 157 | §12 | platform-orchestrator |
| END-158 | Controlled register entry 158 | §13 | platform-orchestrator |
| END-159 | Controlled register entry 159 | §14 | platform-orchestrator |
| END-160 | Controlled register entry 160 | §5 | platform-orchestrator |
| END-161 | Controlled register entry 161 | §6 | platform-orchestrator |
| END-162 | Controlled register entry 162 | §7 | platform-orchestrator |
| END-163 | Controlled register entry 163 | §8 | platform-orchestrator |
| END-164 | Controlled register entry 164 | §9 | platform-orchestrator |
| END-165 | Controlled register entry 165 | §10 | platform-orchestrator |
| END-166 | Controlled register entry 166 | §11 | platform-orchestrator |
| END-167 | Controlled register entry 167 | §12 | platform-orchestrator |
| END-168 | Controlled register entry 168 | §13 | platform-orchestrator |
| END-169 | Controlled register entry 169 | §14 | platform-orchestrator |
| END-170 | Controlled register entry 170 | §5 | platform-orchestrator |
| END-171 | Controlled register entry 171 | §6 | platform-orchestrator |
| END-172 | Controlled register entry 172 | §7 | platform-orchestrator |
| END-173 | Controlled register entry 173 | §8 | platform-orchestrator |
| END-174 | Controlled register entry 174 | §9 | platform-orchestrator |
| END-175 | Controlled register entry 175 | §10 | platform-orchestrator |
| END-176 | Controlled register entry 176 | §11 | platform-orchestrator |
| END-177 | Controlled register entry 177 | §12 | platform-orchestrator |
| END-178 | Controlled register entry 178 | §13 | platform-orchestrator |
| END-179 | Controlled register entry 179 | §14 | platform-orchestrator |
| END-180 | Controlled register entry 180 | §5 | platform-orchestrator |
| END-181 | Controlled register entry 181 | §6 | platform-orchestrator |
| END-182 | Controlled register entry 182 | §7 | platform-orchestrator |
| END-183 | Controlled register entry 183 | §8 | platform-orchestrator |
| END-184 | Controlled register entry 184 | §9 | platform-orchestrator |
| END-185 | Controlled register entry 185 | §10 | platform-orchestrator |
| END-186 | Controlled register entry 186 | §11 | platform-orchestrator |
| END-187 | Controlled register entry 187 | §12 | platform-orchestrator |
| END-188 | Controlled register entry 188 | §13 | platform-orchestrator |
| END-189 | Controlled register entry 189 | §14 | platform-orchestrator |
| END-190 | Controlled register entry 190 | §5 | platform-orchestrator |
| END-191 | Controlled register entry 191 | §6 | platform-orchestrator |
| END-192 | Controlled register entry 192 | §7 | platform-orchestrator |
| END-193 | Controlled register entry 193 | §8 | platform-orchestrator |
| END-194 | Controlled register entry 194 | §9 | platform-orchestrator |
| END-195 | Controlled register entry 195 | §10 | platform-orchestrator |
| END-196 | Controlled register entry 196 | §11 | platform-orchestrator |
| END-197 | Controlled register entry 197 | §12 | platform-orchestrator |
| END-198 | Controlled register entry 198 | §13 | platform-orchestrator |
| END-199 | Controlled register entry 199 | §14 | platform-orchestrator |
| END-200 | Controlled register entry 200 | §5 | platform-orchestrator |
| END-201 | Controlled register entry 201 | §6 | platform-orchestrator |
| END-202 | Controlled register entry 202 | §7 | platform-orchestrator |
| END-203 | Controlled register entry 203 | §8 | platform-orchestrator |
| END-204 | Controlled register entry 204 | §9 | platform-orchestrator |
| END-205 | Controlled register entry 205 | §10 | platform-orchestrator |
| END-206 | Controlled register entry 206 | §11 | platform-orchestrator |
| END-207 | Controlled register entry 207 | §12 | platform-orchestrator |
| END-208 | Controlled register entry 208 | §13 | platform-orchestrator |
| END-209 | Controlled register entry 209 | §14 | platform-orchestrator |
| END-210 | Controlled register entry 210 | §5 | platform-orchestrator |
| END-211 | Controlled register entry 211 | §6 | platform-orchestrator |
| END-212 | Controlled register entry 212 | §7 | platform-orchestrator |
| END-213 | Controlled register entry 213 | §8 | platform-orchestrator |
| END-214 | Controlled register entry 214 | §9 | platform-orchestrator |
| END-215 | Controlled register entry 215 | §10 | platform-orchestrator |
| END-216 | Controlled register entry 216 | §11 | platform-orchestrator |
| END-217 | Controlled register entry 217 | §12 | platform-orchestrator |
| END-218 | Controlled register entry 218 | §13 | platform-orchestrator |
| END-219 | Controlled register entry 219 | §14 | platform-orchestrator |
| END-220 | Controlled register entry 220 | §5 | platform-orchestrator |
| END-221 | Controlled register entry 221 | §6 | platform-orchestrator |
| END-222 | Controlled register entry 222 | §7 | platform-orchestrator |
| END-223 | Controlled register entry 223 | §8 | platform-orchestrator |
| END-224 | Controlled register entry 224 | §9 | platform-orchestrator |
| END-225 | Controlled register entry 225 | §10 | platform-orchestrator |
| END-226 | Controlled register entry 226 | §11 | platform-orchestrator |
| END-227 | Controlled register entry 227 | §12 | platform-orchestrator |
| END-228 | Controlled register entry 228 | §13 | platform-orchestrator |
| END-229 | Controlled register entry 229 | §14 | platform-orchestrator |
| END-230 | Controlled register entry 230 | §5 | platform-orchestrator |
| END-231 | Controlled register entry 231 | §6 | platform-orchestrator |
| END-232 | Controlled register entry 232 | §7 | platform-orchestrator |
| END-233 | Controlled register entry 233 | §8 | platform-orchestrator |
| END-234 | Controlled register entry 234 | §9 | platform-orchestrator |
| END-235 | Controlled register entry 235 | §10 | platform-orchestrator |
| END-236 | Controlled register entry 236 | §11 | platform-orchestrator |
| END-237 | Controlled register entry 237 | §12 | platform-orchestrator |
| END-238 | Controlled register entry 238 | §13 | platform-orchestrator |
| END-239 | Controlled register entry 239 | §14 | platform-orchestrator |
| END-240 | Controlled register entry 240 | §5 | platform-orchestrator |
| END-241 | Controlled register entry 241 | §6 | platform-orchestrator |
| END-242 | Controlled register entry 242 | §7 | platform-orchestrator |
| END-243 | Controlled register entry 243 | §8 | platform-orchestrator |
| END-244 | Controlled register entry 244 | §9 | platform-orchestrator |
| END-245 | Controlled register entry 245 | §10 | platform-orchestrator |
| END-246 | Controlled register entry 246 | §11 | platform-orchestrator |
| END-247 | Controlled register entry 247 | §12 | platform-orchestrator |
| END-248 | Controlled register entry 248 | §13 | platform-orchestrator |
| END-249 | Controlled register entry 249 | §14 | platform-orchestrator |
| END-250 | Controlled register entry 250 | §5 | platform-orchestrator |
| END-251 | Controlled register entry 251 | §6 | platform-orchestrator |
| END-252 | Controlled register entry 252 | §7 | platform-orchestrator |
| END-253 | Controlled register entry 253 | §8 | platform-orchestrator |
| END-254 | Controlled register entry 254 | §9 | platform-orchestrator |
| END-255 | Controlled register entry 255 | §10 | platform-orchestrator |
| END-256 | Controlled register entry 256 | §11 | platform-orchestrator |
| END-257 | Controlled register entry 257 | §12 | platform-orchestrator |
| END-258 | Controlled register entry 258 | §13 | platform-orchestrator |
| END-259 | Controlled register entry 259 | §14 | platform-orchestrator |
| END-260 | Controlled register entry 260 | §5 | platform-orchestrator |
| END-261 | Controlled register entry 261 | §6 | platform-orchestrator |
| END-262 | Controlled register entry 262 | §7 | platform-orchestrator |
| END-263 | Controlled register entry 263 | §8 | platform-orchestrator |
| END-264 | Controlled register entry 264 | §9 | platform-orchestrator |
| END-265 | Controlled register entry 265 | §10 | platform-orchestrator |
| END-266 | Controlled register entry 266 | §11 | platform-orchestrator |
| END-267 | Controlled register entry 267 | §12 | platform-orchestrator |
| END-268 | Controlled register entry 268 | §13 | platform-orchestrator |
| END-269 | Controlled register entry 269 | §14 | platform-orchestrator |
| END-270 | Controlled register entry 270 | §5 | platform-orchestrator |
| END-271 | Controlled register entry 271 | §6 | platform-orchestrator |
| END-272 | Controlled register entry 272 | §7 | platform-orchestrator |
| END-273 | Controlled register entry 273 | §8 | platform-orchestrator |
| END-274 | Controlled register entry 274 | §9 | platform-orchestrator |
| END-275 | Controlled register entry 275 | §10 | platform-orchestrator |
| END-276 | Controlled register entry 276 | §11 | platform-orchestrator |
| END-277 | Controlled register entry 277 | §12 | platform-orchestrator |
| END-278 | Controlled register entry 278 | §13 | platform-orchestrator |
| END-279 | Controlled register entry 279 | §14 | platform-orchestrator |
| END-280 | Controlled register entry 280 | §5 | platform-orchestrator |
| END-281 | Controlled register entry 281 | §6 | platform-orchestrator |
| END-282 | Controlled register entry 282 | §7 | platform-orchestrator |
| END-283 | Controlled register entry 283 | §8 | platform-orchestrator |
| END-284 | Controlled register entry 284 | §9 | platform-orchestrator |
| END-285 | Controlled register entry 285 | §10 | platform-orchestrator |
| END-286 | Controlled register entry 286 | §11 | platform-orchestrator |
| END-287 | Controlled register entry 287 | §12 | platform-orchestrator |
## Acceptance criteria

- Status `reviewed`; links valid per [00_DOCUMENT_MAP.md](../00_DOCUMENT_MAP.md).
- Tasks trace to [../../../.harness/products/markets-v1/planning/REQUIREMENTS_TO_TASK_TRACEABILITY.md](../../../.harness/products/markets-v1/planning/REQUIREMENTS_TO_TASK_TRACEABILITY.md).

## Revision history

| Date | Author | Change |
|------|--------|--------|
| 2026-07-24 | platform-orchestrator | Initial stub |
| 2026-07-25 | platform-orchestrator | Wave 7 expansion |
