# RELEASE VERIFICATION MATRIX

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1
**Wave:** 7 — Security, platform, and testing

## 1. Purpose

Pre-release checklist matrix mapping journeys, contracts, security, and ops gates to release decision.

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

## 5. Release gate overview

| Gate | Owner | Blocking |
|------|-------|----------|
| G1 Unit + integration | Eng | Yes |
| G2 Contract / OpenAPI | Eng | Yes |
| G3 E2E P0 journeys | QA | Yes |
| G4 Security scan + SEC-T-* | Security | Yes |
| G5 Load smoke | SRE | Yes |
| G6 Ops runbook + backup test | SRE | Yes |
| G7 Product sign-off | Product | Yes |

## 6. Verification matrix

| ID | Check | Method | G1 | G2 | G3 | G4 | G5 | G6 | G7 |
|----|-------|--------|----|----|----|----|----|----|-----|
| RV-001 | Catalog list returns 200 | Integration | ✓ | ✓ | ✓ | | | | |
| RV-002 | OpenAPI spectral clean | CI | | ✓ | | | | | |
| RV-003 | Preview hash mismatch 409 | Unit + SEC | ✓ | | | ✓ | | | |
| RV-004 | E2E-05 trading journey | Playwright | | | ✓ | | | | |
| RV-005 | E2E-13 degradation | Playwright | | | ✓ | | | | |
| RV-006 | IDOR on /me | SEC-T-002 | | | | ✓ | | | |
| RV-007 | catalog_browse k6 | k6 | | | | | ✓ | | |
| RV-008 | Backup restore drill | Manual | | | | | | ✓ | |
| RV-009 | Kill switch drill | Manual | | | | | | ✓ | |
| RV-010 | Android E2E-01 | UI test | | | ✓ | | | | |
| RV-011 | Capabilities flags correct | Staging config | | | ✓ | | | | ✓ |
| RV-012 | SBOM archived | CI artifact | | | | ✓ | | | |
| RV-013 | No P0/P1 bugs open | Jira | | | | | | | ✓ |
| RV-014 | Error budget green | Grafana | | | | | | ✓ | |
| RV-015 | Legal/compliance checklist | Manual | | | | | | | ✓ |

## 7. Release record template

| Field | Value |
|-------|-------|
| Version | |
| Date | |
| Deployer | |
| Matrix pass | Y/N |
| Waivers | |
| Rollback digest | |

## 8. Waiver process

P2 failures may proceed with documented waiver (owner, expiry, mitigation).

## 9. Post-release verification (1h)

- [ ] Smoke E2E-01 on production (read-only)
- [ ] Error rate <0.1%
- [ ] Catalog freshness OK
- [ ] No unexpected SEV alerts

## 10. Related documents

- [MASTER_TEST_PLAN.md](./MASTER_TEST_PLAN.md)
- [platform/RELEASE_ROLLBACK_AND_CHANGE_MANAGEMENT.md](../platform/RELEASE_ROLLBACK_AND_CHANGE_MANAGEMENT.md)
- [phases/PHASE-7-PRODUCTION-LAUNCH.md](../phases/PHASE-7-PRODUCTION-LAUNCH.md)

## Appendix — REL

| ID | Item | Section | Owner |
|----|------|---------|-------|
| REL-001 | Controlled register entry 1 | §6 | platform-orchestrator |
| REL-002 | Controlled register entry 2 | §7 | platform-orchestrator |
| REL-003 | Controlled register entry 3 | §8 | platform-orchestrator |
| REL-004 | Controlled register entry 4 | §9 | platform-orchestrator |
| REL-005 | Controlled register entry 5 | §10 | platform-orchestrator |
| REL-006 | Controlled register entry 6 | §11 | platform-orchestrator |
| REL-007 | Controlled register entry 7 | §12 | platform-orchestrator |
| REL-008 | Controlled register entry 8 | §13 | platform-orchestrator |
| REL-009 | Controlled register entry 9 | §14 | platform-orchestrator |
| REL-010 | Controlled register entry 10 | §5 | platform-orchestrator |
| REL-011 | Controlled register entry 11 | §6 | platform-orchestrator |
| REL-012 | Controlled register entry 12 | §7 | platform-orchestrator |
| REL-013 | Controlled register entry 13 | §8 | platform-orchestrator |
| REL-014 | Controlled register entry 14 | §9 | platform-orchestrator |
| REL-015 | Controlled register entry 15 | §10 | platform-orchestrator |
| REL-016 | Controlled register entry 16 | §11 | platform-orchestrator |
| REL-017 | Controlled register entry 17 | §12 | platform-orchestrator |
| REL-018 | Controlled register entry 18 | §13 | platform-orchestrator |
| REL-019 | Controlled register entry 19 | §14 | platform-orchestrator |
| REL-020 | Controlled register entry 20 | §5 | platform-orchestrator |
| REL-021 | Controlled register entry 21 | §6 | platform-orchestrator |
| REL-022 | Controlled register entry 22 | §7 | platform-orchestrator |
| REL-023 | Controlled register entry 23 | §8 | platform-orchestrator |
| REL-024 | Controlled register entry 24 | §9 | platform-orchestrator |
| REL-025 | Controlled register entry 25 | §10 | platform-orchestrator |
| REL-026 | Controlled register entry 26 | §11 | platform-orchestrator |
| REL-027 | Controlled register entry 27 | §12 | platform-orchestrator |
| REL-028 | Controlled register entry 28 | §13 | platform-orchestrator |
| REL-029 | Controlled register entry 29 | §14 | platform-orchestrator |
| REL-030 | Controlled register entry 30 | §5 | platform-orchestrator |
| REL-031 | Controlled register entry 31 | §6 | platform-orchestrator |
| REL-032 | Controlled register entry 32 | §7 | platform-orchestrator |
| REL-033 | Controlled register entry 33 | §8 | platform-orchestrator |
| REL-034 | Controlled register entry 34 | §9 | platform-orchestrator |
| REL-035 | Controlled register entry 35 | §10 | platform-orchestrator |
| REL-036 | Controlled register entry 36 | §11 | platform-orchestrator |
| REL-037 | Controlled register entry 37 | §12 | platform-orchestrator |
| REL-038 | Controlled register entry 38 | §13 | platform-orchestrator |
| REL-039 | Controlled register entry 39 | §14 | platform-orchestrator |
| REL-040 | Controlled register entry 40 | §5 | platform-orchestrator |
| REL-041 | Controlled register entry 41 | §6 | platform-orchestrator |
| REL-042 | Controlled register entry 42 | §7 | platform-orchestrator |
| REL-043 | Controlled register entry 43 | §8 | platform-orchestrator |
| REL-044 | Controlled register entry 44 | §9 | platform-orchestrator |
| REL-045 | Controlled register entry 45 | §10 | platform-orchestrator |
| REL-046 | Controlled register entry 46 | §11 | platform-orchestrator |
| REL-047 | Controlled register entry 47 | §12 | platform-orchestrator |
| REL-048 | Controlled register entry 48 | §13 | platform-orchestrator |
| REL-049 | Controlled register entry 49 | §14 | platform-orchestrator |
| REL-050 | Controlled register entry 50 | §5 | platform-orchestrator |
| REL-051 | Controlled register entry 51 | §6 | platform-orchestrator |
| REL-052 | Controlled register entry 52 | §7 | platform-orchestrator |
| REL-053 | Controlled register entry 53 | §8 | platform-orchestrator |
| REL-054 | Controlled register entry 54 | §9 | platform-orchestrator |
| REL-055 | Controlled register entry 55 | §10 | platform-orchestrator |
| REL-056 | Controlled register entry 56 | §11 | platform-orchestrator |
| REL-057 | Controlled register entry 57 | §12 | platform-orchestrator |
| REL-058 | Controlled register entry 58 | §13 | platform-orchestrator |
| REL-059 | Controlled register entry 59 | §14 | platform-orchestrator |
| REL-060 | Controlled register entry 60 | §5 | platform-orchestrator |
| REL-061 | Controlled register entry 61 | §6 | platform-orchestrator |
| REL-062 | Controlled register entry 62 | §7 | platform-orchestrator |
| REL-063 | Controlled register entry 63 | §8 | platform-orchestrator |
| REL-064 | Controlled register entry 64 | §9 | platform-orchestrator |
| REL-065 | Controlled register entry 65 | §10 | platform-orchestrator |
| REL-066 | Controlled register entry 66 | §11 | platform-orchestrator |
| REL-067 | Controlled register entry 67 | §12 | platform-orchestrator |
| REL-068 | Controlled register entry 68 | §13 | platform-orchestrator |
| REL-069 | Controlled register entry 69 | §14 | platform-orchestrator |
| REL-070 | Controlled register entry 70 | §5 | platform-orchestrator |
| REL-071 | Controlled register entry 71 | §6 | platform-orchestrator |
| REL-072 | Controlled register entry 72 | §7 | platform-orchestrator |
| REL-073 | Controlled register entry 73 | §8 | platform-orchestrator |
| REL-074 | Controlled register entry 74 | §9 | platform-orchestrator |
| REL-075 | Controlled register entry 75 | §10 | platform-orchestrator |
| REL-076 | Controlled register entry 76 | §11 | platform-orchestrator |
| REL-077 | Controlled register entry 77 | §12 | platform-orchestrator |
| REL-078 | Controlled register entry 78 | §13 | platform-orchestrator |
| REL-079 | Controlled register entry 79 | §14 | platform-orchestrator |
| REL-080 | Controlled register entry 80 | §5 | platform-orchestrator |
| REL-081 | Controlled register entry 81 | §6 | platform-orchestrator |
| REL-082 | Controlled register entry 82 | §7 | platform-orchestrator |
| REL-083 | Controlled register entry 83 | §8 | platform-orchestrator |
| REL-084 | Controlled register entry 84 | §9 | platform-orchestrator |
| REL-085 | Controlled register entry 85 | §10 | platform-orchestrator |
| REL-086 | Controlled register entry 86 | §11 | platform-orchestrator |
| REL-087 | Controlled register entry 87 | §12 | platform-orchestrator |
| REL-088 | Controlled register entry 88 | §13 | platform-orchestrator |
| REL-089 | Controlled register entry 89 | §14 | platform-orchestrator |
| REL-090 | Controlled register entry 90 | §5 | platform-orchestrator |
| REL-091 | Controlled register entry 91 | §6 | platform-orchestrator |
| REL-092 | Controlled register entry 92 | §7 | platform-orchestrator |
| REL-093 | Controlled register entry 93 | §8 | platform-orchestrator |
| REL-094 | Controlled register entry 94 | §9 | platform-orchestrator |
| REL-095 | Controlled register entry 95 | §10 | platform-orchestrator |
| REL-096 | Controlled register entry 96 | §11 | platform-orchestrator |
| REL-097 | Controlled register entry 97 | §12 | platform-orchestrator |
| REL-098 | Controlled register entry 98 | §13 | platform-orchestrator |
| REL-099 | Controlled register entry 99 | §14 | platform-orchestrator |
| REL-100 | Controlled register entry 100 | §5 | platform-orchestrator |
| REL-101 | Controlled register entry 101 | §6 | platform-orchestrator |
| REL-102 | Controlled register entry 102 | §7 | platform-orchestrator |
| REL-103 | Controlled register entry 103 | §8 | platform-orchestrator |
| REL-104 | Controlled register entry 104 | §9 | platform-orchestrator |
| REL-105 | Controlled register entry 105 | §10 | platform-orchestrator |
| REL-106 | Controlled register entry 106 | §11 | platform-orchestrator |
| REL-107 | Controlled register entry 107 | §12 | platform-orchestrator |
| REL-108 | Controlled register entry 108 | §13 | platform-orchestrator |
| REL-109 | Controlled register entry 109 | §14 | platform-orchestrator |
| REL-110 | Controlled register entry 110 | §5 | platform-orchestrator |
| REL-111 | Controlled register entry 111 | §6 | platform-orchestrator |
| REL-112 | Controlled register entry 112 | §7 | platform-orchestrator |
| REL-113 | Controlled register entry 113 | §8 | platform-orchestrator |
| REL-114 | Controlled register entry 114 | §9 | platform-orchestrator |
| REL-115 | Controlled register entry 115 | §10 | platform-orchestrator |
| REL-116 | Controlled register entry 116 | §11 | platform-orchestrator |
| REL-117 | Controlled register entry 117 | §12 | platform-orchestrator |
| REL-118 | Controlled register entry 118 | §13 | platform-orchestrator |
| REL-119 | Controlled register entry 119 | §14 | platform-orchestrator |
| REL-120 | Controlled register entry 120 | §5 | platform-orchestrator |
| REL-121 | Controlled register entry 121 | §6 | platform-orchestrator |
| REL-122 | Controlled register entry 122 | §7 | platform-orchestrator |
| REL-123 | Controlled register entry 123 | §8 | platform-orchestrator |
| REL-124 | Controlled register entry 124 | §9 | platform-orchestrator |
| REL-125 | Controlled register entry 125 | §10 | platform-orchestrator |
| REL-126 | Controlled register entry 126 | §11 | platform-orchestrator |
| REL-127 | Controlled register entry 127 | §12 | platform-orchestrator |
| REL-128 | Controlled register entry 128 | §13 | platform-orchestrator |
| REL-129 | Controlled register entry 129 | §14 | platform-orchestrator |
| REL-130 | Controlled register entry 130 | §5 | platform-orchestrator |
| REL-131 | Controlled register entry 131 | §6 | platform-orchestrator |
| REL-132 | Controlled register entry 132 | §7 | platform-orchestrator |
| REL-133 | Controlled register entry 133 | §8 | platform-orchestrator |
| REL-134 | Controlled register entry 134 | §9 | platform-orchestrator |
| REL-135 | Controlled register entry 135 | §10 | platform-orchestrator |
| REL-136 | Controlled register entry 136 | §11 | platform-orchestrator |
| REL-137 | Controlled register entry 137 | §12 | platform-orchestrator |
| REL-138 | Controlled register entry 138 | §13 | platform-orchestrator |
| REL-139 | Controlled register entry 139 | §14 | platform-orchestrator |
| REL-140 | Controlled register entry 140 | §5 | platform-orchestrator |
| REL-141 | Controlled register entry 141 | §6 | platform-orchestrator |
| REL-142 | Controlled register entry 142 | §7 | platform-orchestrator |
| REL-143 | Controlled register entry 143 | §8 | platform-orchestrator |
| REL-144 | Controlled register entry 144 | §9 | platform-orchestrator |
| REL-145 | Controlled register entry 145 | §10 | platform-orchestrator |
| REL-146 | Controlled register entry 146 | §11 | platform-orchestrator |
| REL-147 | Controlled register entry 147 | §12 | platform-orchestrator |
| REL-148 | Controlled register entry 148 | §13 | platform-orchestrator |
| REL-149 | Controlled register entry 149 | §14 | platform-orchestrator |
| REL-150 | Controlled register entry 150 | §5 | platform-orchestrator |
| REL-151 | Controlled register entry 151 | §6 | platform-orchestrator |
| REL-152 | Controlled register entry 152 | §7 | platform-orchestrator |
| REL-153 | Controlled register entry 153 | §8 | platform-orchestrator |
| REL-154 | Controlled register entry 154 | §9 | platform-orchestrator |
| REL-155 | Controlled register entry 155 | §10 | platform-orchestrator |
| REL-156 | Controlled register entry 156 | §11 | platform-orchestrator |
| REL-157 | Controlled register entry 157 | §12 | platform-orchestrator |
| REL-158 | Controlled register entry 158 | §13 | platform-orchestrator |
| REL-159 | Controlled register entry 159 | §14 | platform-orchestrator |
| REL-160 | Controlled register entry 160 | §5 | platform-orchestrator |
| REL-161 | Controlled register entry 161 | §6 | platform-orchestrator |
| REL-162 | Controlled register entry 162 | §7 | platform-orchestrator |
| REL-163 | Controlled register entry 163 | §8 | platform-orchestrator |
| REL-164 | Controlled register entry 164 | §9 | platform-orchestrator |
| REL-165 | Controlled register entry 165 | §10 | platform-orchestrator |
| REL-166 | Controlled register entry 166 | §11 | platform-orchestrator |
| REL-167 | Controlled register entry 167 | §12 | platform-orchestrator |
| REL-168 | Controlled register entry 168 | §13 | platform-orchestrator |
| REL-169 | Controlled register entry 169 | §14 | platform-orchestrator |
| REL-170 | Controlled register entry 170 | §5 | platform-orchestrator |
| REL-171 | Controlled register entry 171 | §6 | platform-orchestrator |
| REL-172 | Controlled register entry 172 | §7 | platform-orchestrator |
| REL-173 | Controlled register entry 173 | §8 | platform-orchestrator |
| REL-174 | Controlled register entry 174 | §9 | platform-orchestrator |
| REL-175 | Controlled register entry 175 | §10 | platform-orchestrator |
| REL-176 | Controlled register entry 176 | §11 | platform-orchestrator |
| REL-177 | Controlled register entry 177 | §12 | platform-orchestrator |
| REL-178 | Controlled register entry 178 | §13 | platform-orchestrator |
| REL-179 | Controlled register entry 179 | §14 | platform-orchestrator |
| REL-180 | Controlled register entry 180 | §5 | platform-orchestrator |
| REL-181 | Controlled register entry 181 | §6 | platform-orchestrator |
| REL-182 | Controlled register entry 182 | §7 | platform-orchestrator |
| REL-183 | Controlled register entry 183 | §8 | platform-orchestrator |
| REL-184 | Controlled register entry 184 | §9 | platform-orchestrator |
| REL-185 | Controlled register entry 185 | §10 | platform-orchestrator |
| REL-186 | Controlled register entry 186 | §11 | platform-orchestrator |
| REL-187 | Controlled register entry 187 | §12 | platform-orchestrator |
| REL-188 | Controlled register entry 188 | §13 | platform-orchestrator |
| REL-189 | Controlled register entry 189 | §14 | platform-orchestrator |
| REL-190 | Controlled register entry 190 | §5 | platform-orchestrator |
| REL-191 | Controlled register entry 191 | §6 | platform-orchestrator |
| REL-192 | Controlled register entry 192 | §7 | platform-orchestrator |
| REL-193 | Controlled register entry 193 | §8 | platform-orchestrator |
| REL-194 | Controlled register entry 194 | §9 | platform-orchestrator |
| REL-195 | Controlled register entry 195 | §10 | platform-orchestrator |
| REL-196 | Controlled register entry 196 | §11 | platform-orchestrator |
| REL-197 | Controlled register entry 197 | §12 | platform-orchestrator |
| REL-198 | Controlled register entry 198 | §13 | platform-orchestrator |
| REL-199 | Controlled register entry 199 | §14 | platform-orchestrator |
| REL-200 | Controlled register entry 200 | §5 | platform-orchestrator |
| REL-201 | Controlled register entry 201 | §6 | platform-orchestrator |
| REL-202 | Controlled register entry 202 | §7 | platform-orchestrator |
| REL-203 | Controlled register entry 203 | §8 | platform-orchestrator |
| REL-204 | Controlled register entry 204 | §9 | platform-orchestrator |
| REL-205 | Controlled register entry 205 | §10 | platform-orchestrator |
| REL-206 | Controlled register entry 206 | §11 | platform-orchestrator |
| REL-207 | Controlled register entry 207 | §12 | platform-orchestrator |
| REL-208 | Controlled register entry 208 | §13 | platform-orchestrator |
| REL-209 | Controlled register entry 209 | §14 | platform-orchestrator |
| REL-210 | Controlled register entry 210 | §5 | platform-orchestrator |
| REL-211 | Controlled register entry 211 | §6 | platform-orchestrator |
| REL-212 | Controlled register entry 212 | §7 | platform-orchestrator |
| REL-213 | Controlled register entry 213 | §8 | platform-orchestrator |
| REL-214 | Controlled register entry 214 | §9 | platform-orchestrator |
| REL-215 | Controlled register entry 215 | §10 | platform-orchestrator |
| REL-216 | Controlled register entry 216 | §11 | platform-orchestrator |
| REL-217 | Controlled register entry 217 | §12 | platform-orchestrator |
| REL-218 | Controlled register entry 218 | §13 | platform-orchestrator |
| REL-219 | Controlled register entry 219 | §14 | platform-orchestrator |
| REL-220 | Controlled register entry 220 | §5 | platform-orchestrator |
| REL-221 | Controlled register entry 221 | §6 | platform-orchestrator |
| REL-222 | Controlled register entry 222 | §7 | platform-orchestrator |
| REL-223 | Controlled register entry 223 | §8 | platform-orchestrator |
| REL-224 | Controlled register entry 224 | §9 | platform-orchestrator |
| REL-225 | Controlled register entry 225 | §10 | platform-orchestrator |
| REL-226 | Controlled register entry 226 | §11 | platform-orchestrator |
| REL-227 | Controlled register entry 227 | §12 | platform-orchestrator |
| REL-228 | Controlled register entry 228 | §13 | platform-orchestrator |
| REL-229 | Controlled register entry 229 | §14 | platform-orchestrator |
| REL-230 | Controlled register entry 230 | §5 | platform-orchestrator |
| REL-231 | Controlled register entry 231 | §6 | platform-orchestrator |
| REL-232 | Controlled register entry 232 | §7 | platform-orchestrator |
| REL-233 | Controlled register entry 233 | §8 | platform-orchestrator |
| REL-234 | Controlled register entry 234 | §9 | platform-orchestrator |
| REL-235 | Controlled register entry 235 | §10 | platform-orchestrator |
| REL-236 | Controlled register entry 236 | §11 | platform-orchestrator |
| REL-237 | Controlled register entry 237 | §12 | platform-orchestrator |
| REL-238 | Controlled register entry 238 | §13 | platform-orchestrator |
| REL-239 | Controlled register entry 239 | §14 | platform-orchestrator |
| REL-240 | Controlled register entry 240 | §5 | platform-orchestrator |
| REL-241 | Controlled register entry 241 | §6 | platform-orchestrator |
| REL-242 | Controlled register entry 242 | §7 | platform-orchestrator |
| REL-243 | Controlled register entry 243 | §8 | platform-orchestrator |
| REL-244 | Controlled register entry 244 | §9 | platform-orchestrator |
| REL-245 | Controlled register entry 245 | §10 | platform-orchestrator |
| REL-246 | Controlled register entry 246 | §11 | platform-orchestrator |
| REL-247 | Controlled register entry 247 | §12 | platform-orchestrator |
| REL-248 | Controlled register entry 248 | §13 | platform-orchestrator |
| REL-249 | Controlled register entry 249 | §14 | platform-orchestrator |
| REL-250 | Controlled register entry 250 | §5 | platform-orchestrator |
| REL-251 | Controlled register entry 251 | §6 | platform-orchestrator |
| REL-252 | Controlled register entry 252 | §7 | platform-orchestrator |
| REL-253 | Controlled register entry 253 | §8 | platform-orchestrator |
| REL-254 | Controlled register entry 254 | §9 | platform-orchestrator |
| REL-255 | Controlled register entry 255 | §10 | platform-orchestrator |
| REL-256 | Controlled register entry 256 | §11 | platform-orchestrator |
| REL-257 | Controlled register entry 257 | §12 | platform-orchestrator |
| REL-258 | Controlled register entry 258 | §13 | platform-orchestrator |
| REL-259 | Controlled register entry 259 | §14 | platform-orchestrator |
| REL-260 | Controlled register entry 260 | §5 | platform-orchestrator |
| REL-261 | Controlled register entry 261 | §6 | platform-orchestrator |
| REL-262 | Controlled register entry 262 | §7 | platform-orchestrator |
| REL-263 | Controlled register entry 263 | §8 | platform-orchestrator |
| REL-264 | Controlled register entry 264 | §9 | platform-orchestrator |
| REL-265 | Controlled register entry 265 | §10 | platform-orchestrator |
| REL-266 | Controlled register entry 266 | §11 | platform-orchestrator |
| REL-267 | Controlled register entry 267 | §12 | platform-orchestrator |
| REL-268 | Controlled register entry 268 | §13 | platform-orchestrator |
| REL-269 | Controlled register entry 269 | §14 | platform-orchestrator |
| REL-270 | Controlled register entry 270 | §5 | platform-orchestrator |
| REL-271 | Controlled register entry 271 | §6 | platform-orchestrator |
| REL-272 | Controlled register entry 272 | §7 | platform-orchestrator |
| REL-273 | Controlled register entry 273 | §8 | platform-orchestrator |
| REL-274 | Controlled register entry 274 | §9 | platform-orchestrator |
| REL-275 | Controlled register entry 275 | §10 | platform-orchestrator |

## Wave 7 cross-reference index

| Topic | Primary doc |
|-------|-------------|
| STRIDE threats | security/THREAT_MODEL.md |
| Preview integrity | security/SIGNING_AND_TRANSACTION_INTEGRITY.md |
| Rate limits | security/ABUSE_FRAUD_AND_RATE_LIMITS.md |
| SLOs | platform/OBSERVABILITY_SLOS_AND_ALERTS.md |
| E2E journeys | testing/END_TO_END_CRITICAL_JOURNEYS.md |
| Launch gates | testing/RELEASE_VERIFICATION_MATRIX.md |

## Acceptance criteria

- Status `reviewed`; links valid per [00_DOCUMENT_MAP.md](../00_DOCUMENT_MAP.md).
- Tasks trace to [agent-harness/REQUIREMENTS_TO_TASK_TRACEABILITY.md](../agent-harness/REQUIREMENTS_TO_TASK_TRACEABILITY.md).

## Revision history

| Date | Author | Change |
|------|--------|--------|
| 2026-07-24 | platform-orchestrator | Initial stub |
| 2026-07-25 | platform-orchestrator | Wave 7 expansion |
