# TEST PYRAMID AND ENVIRONMENTS

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1
**Wave:** 7 — Security, platform, and testing

## 1. Purpose

Test pyramid distribution, environment topology, test data, and mocking strategy for Markets V1.

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

## 5. Pyramid target

```
        /  E2E  \        ~5%  — critical journeys
       /--------\
      / Contract \      ~15% — OpenAPI + ACL golden
     /------------\
    / Integration  \    ~30% — DB, Redis, HTTP mocks
   /----------------\
  /      Unit        \  ~50% — domain, state machines
```

## 6. Environment catalog

| Env | Purpose | Upstream | Data | Access |
|-----|---------|----------|------|--------|
| local | Dev | Wiremock/fixtures | Docker PG seed | Developer |
| ci | PR gates | Wiremock | Ephemeral | CI only |
| staging | Pre-prod | Polymarket prod read | Anonymized snapshot | Team + QA |
| production | Live | Polymarket | Real | Monitoring only |

## 7. Local stack

```bash
docker compose -f deploy/backend/docker-compose.test.yml up -d
go test ./apps/backend/internal/markets/...
pnpm --filter web test
```

## 8. Mocking strategy

| Dependency | Local/CI | Staging |
|------------|----------|---------|
| Gamma | JSON fixtures in `testdata/` | Live |
| CLOB | httptest + recorded cassettes | Live |
| Wallet | Stub signer | Test wallet (limited funds) |
| FCM | Mock server | Firebase test project |
| Polygon RPC | Anvil fork | Alchemy/Infura |

## 9. Test data rules

- No production PII in non-prod.
- Wallet addresses: use known test EOAs.
- Seed script `scripts/seed-markets-staging.sql`.
- Synthetic markets only in CI fixtures.

## 10. Flake policy

| Flake rate | Action |
|------------|--------|
| >1% per suite | Quarantine test |
| >3 retries | Fix or delete test |

## 11. Parallelization

- Go: `t.Parallel()` where safe; separate DB schemas per test.
- Playwright: sharded by journey file.
- Android: Firebase Test Lab for device matrix (pre-release).

## 12. Related documents

- [CONTRACT_AND_CONFORMANCE_TESTS.md](./CONTRACT_AND_CONFORMANCE_TESTS.md)
- [platform/ENVIRONMENT_AND_CONFIGURATION.md](../platform/ENVIRONMENT_AND_CONFIGURATION.md)

## Appendix — TES

| ID | Item | Section | Owner |
|----|------|---------|-------|
| TES-001 | Controlled register entry 1 | §6 | platform-orchestrator |
| TES-002 | Controlled register entry 2 | §7 | platform-orchestrator |
| TES-003 | Controlled register entry 3 | §8 | platform-orchestrator |
| TES-004 | Controlled register entry 4 | §9 | platform-orchestrator |
| TES-005 | Controlled register entry 5 | §10 | platform-orchestrator |
| TES-006 | Controlled register entry 6 | §11 | platform-orchestrator |
| TES-007 | Controlled register entry 7 | §12 | platform-orchestrator |
| TES-008 | Controlled register entry 8 | §13 | platform-orchestrator |
| TES-009 | Controlled register entry 9 | §14 | platform-orchestrator |
| TES-010 | Controlled register entry 10 | §5 | platform-orchestrator |
| TES-011 | Controlled register entry 11 | §6 | platform-orchestrator |
| TES-012 | Controlled register entry 12 | §7 | platform-orchestrator |
| TES-013 | Controlled register entry 13 | §8 | platform-orchestrator |
| TES-014 | Controlled register entry 14 | §9 | platform-orchestrator |
| TES-015 | Controlled register entry 15 | §10 | platform-orchestrator |
| TES-016 | Controlled register entry 16 | §11 | platform-orchestrator |
| TES-017 | Controlled register entry 17 | §12 | platform-orchestrator |
| TES-018 | Controlled register entry 18 | §13 | platform-orchestrator |
| TES-019 | Controlled register entry 19 | §14 | platform-orchestrator |
| TES-020 | Controlled register entry 20 | §5 | platform-orchestrator |
| TES-021 | Controlled register entry 21 | §6 | platform-orchestrator |
| TES-022 | Controlled register entry 22 | §7 | platform-orchestrator |
| TES-023 | Controlled register entry 23 | §8 | platform-orchestrator |
| TES-024 | Controlled register entry 24 | §9 | platform-orchestrator |
| TES-025 | Controlled register entry 25 | §10 | platform-orchestrator |
| TES-026 | Controlled register entry 26 | §11 | platform-orchestrator |
| TES-027 | Controlled register entry 27 | §12 | platform-orchestrator |
| TES-028 | Controlled register entry 28 | §13 | platform-orchestrator |
| TES-029 | Controlled register entry 29 | §14 | platform-orchestrator |
| TES-030 | Controlled register entry 30 | §5 | platform-orchestrator |
| TES-031 | Controlled register entry 31 | §6 | platform-orchestrator |
| TES-032 | Controlled register entry 32 | §7 | platform-orchestrator |
| TES-033 | Controlled register entry 33 | §8 | platform-orchestrator |
| TES-034 | Controlled register entry 34 | §9 | platform-orchestrator |
| TES-035 | Controlled register entry 35 | §10 | platform-orchestrator |
| TES-036 | Controlled register entry 36 | §11 | platform-orchestrator |
| TES-037 | Controlled register entry 37 | §12 | platform-orchestrator |
| TES-038 | Controlled register entry 38 | §13 | platform-orchestrator |
| TES-039 | Controlled register entry 39 | §14 | platform-orchestrator |
| TES-040 | Controlled register entry 40 | §5 | platform-orchestrator |
| TES-041 | Controlled register entry 41 | §6 | platform-orchestrator |
| TES-042 | Controlled register entry 42 | §7 | platform-orchestrator |
| TES-043 | Controlled register entry 43 | §8 | platform-orchestrator |
| TES-044 | Controlled register entry 44 | §9 | platform-orchestrator |
| TES-045 | Controlled register entry 45 | §10 | platform-orchestrator |
| TES-046 | Controlled register entry 46 | §11 | platform-orchestrator |
| TES-047 | Controlled register entry 47 | §12 | platform-orchestrator |
| TES-048 | Controlled register entry 48 | §13 | platform-orchestrator |
| TES-049 | Controlled register entry 49 | §14 | platform-orchestrator |
| TES-050 | Controlled register entry 50 | §5 | platform-orchestrator |
| TES-051 | Controlled register entry 51 | §6 | platform-orchestrator |
| TES-052 | Controlled register entry 52 | §7 | platform-orchestrator |
| TES-053 | Controlled register entry 53 | §8 | platform-orchestrator |
| TES-054 | Controlled register entry 54 | §9 | platform-orchestrator |
| TES-055 | Controlled register entry 55 | §10 | platform-orchestrator |
| TES-056 | Controlled register entry 56 | §11 | platform-orchestrator |
| TES-057 | Controlled register entry 57 | §12 | platform-orchestrator |
| TES-058 | Controlled register entry 58 | §13 | platform-orchestrator |
| TES-059 | Controlled register entry 59 | §14 | platform-orchestrator |
| TES-060 | Controlled register entry 60 | §5 | platform-orchestrator |
| TES-061 | Controlled register entry 61 | §6 | platform-orchestrator |
| TES-062 | Controlled register entry 62 | §7 | platform-orchestrator |
| TES-063 | Controlled register entry 63 | §8 | platform-orchestrator |
| TES-064 | Controlled register entry 64 | §9 | platform-orchestrator |
| TES-065 | Controlled register entry 65 | §10 | platform-orchestrator |
| TES-066 | Controlled register entry 66 | §11 | platform-orchestrator |
| TES-067 | Controlled register entry 67 | §12 | platform-orchestrator |
| TES-068 | Controlled register entry 68 | §13 | platform-orchestrator |
| TES-069 | Controlled register entry 69 | §14 | platform-orchestrator |
| TES-070 | Controlled register entry 70 | §5 | platform-orchestrator |
| TES-071 | Controlled register entry 71 | §6 | platform-orchestrator |
| TES-072 | Controlled register entry 72 | §7 | platform-orchestrator |
| TES-073 | Controlled register entry 73 | §8 | platform-orchestrator |
| TES-074 | Controlled register entry 74 | §9 | platform-orchestrator |
| TES-075 | Controlled register entry 75 | §10 | platform-orchestrator |
| TES-076 | Controlled register entry 76 | §11 | platform-orchestrator |
| TES-077 | Controlled register entry 77 | §12 | platform-orchestrator |
| TES-078 | Controlled register entry 78 | §13 | platform-orchestrator |
| TES-079 | Controlled register entry 79 | §14 | platform-orchestrator |
| TES-080 | Controlled register entry 80 | §5 | platform-orchestrator |
| TES-081 | Controlled register entry 81 | §6 | platform-orchestrator |
| TES-082 | Controlled register entry 82 | §7 | platform-orchestrator |
| TES-083 | Controlled register entry 83 | §8 | platform-orchestrator |
| TES-084 | Controlled register entry 84 | §9 | platform-orchestrator |
| TES-085 | Controlled register entry 85 | §10 | platform-orchestrator |
| TES-086 | Controlled register entry 86 | §11 | platform-orchestrator |
| TES-087 | Controlled register entry 87 | §12 | platform-orchestrator |
| TES-088 | Controlled register entry 88 | §13 | platform-orchestrator |
| TES-089 | Controlled register entry 89 | §14 | platform-orchestrator |
| TES-090 | Controlled register entry 90 | §5 | platform-orchestrator |
| TES-091 | Controlled register entry 91 | §6 | platform-orchestrator |
| TES-092 | Controlled register entry 92 | §7 | platform-orchestrator |
| TES-093 | Controlled register entry 93 | §8 | platform-orchestrator |
| TES-094 | Controlled register entry 94 | §9 | platform-orchestrator |
| TES-095 | Controlled register entry 95 | §10 | platform-orchestrator |
| TES-096 | Controlled register entry 96 | §11 | platform-orchestrator |
| TES-097 | Controlled register entry 97 | §12 | platform-orchestrator |
| TES-098 | Controlled register entry 98 | §13 | platform-orchestrator |
| TES-099 | Controlled register entry 99 | §14 | platform-orchestrator |
| TES-100 | Controlled register entry 100 | §5 | platform-orchestrator |
| TES-101 | Controlled register entry 101 | §6 | platform-orchestrator |
| TES-102 | Controlled register entry 102 | §7 | platform-orchestrator |
| TES-103 | Controlled register entry 103 | §8 | platform-orchestrator |
| TES-104 | Controlled register entry 104 | §9 | platform-orchestrator |
| TES-105 | Controlled register entry 105 | §10 | platform-orchestrator |
| TES-106 | Controlled register entry 106 | §11 | platform-orchestrator |
| TES-107 | Controlled register entry 107 | §12 | platform-orchestrator |
| TES-108 | Controlled register entry 108 | §13 | platform-orchestrator |
| TES-109 | Controlled register entry 109 | §14 | platform-orchestrator |
| TES-110 | Controlled register entry 110 | §5 | platform-orchestrator |
| TES-111 | Controlled register entry 111 | §6 | platform-orchestrator |
| TES-112 | Controlled register entry 112 | §7 | platform-orchestrator |
| TES-113 | Controlled register entry 113 | §8 | platform-orchestrator |
| TES-114 | Controlled register entry 114 | §9 | platform-orchestrator |
| TES-115 | Controlled register entry 115 | §10 | platform-orchestrator |
| TES-116 | Controlled register entry 116 | §11 | platform-orchestrator |
| TES-117 | Controlled register entry 117 | §12 | platform-orchestrator |
| TES-118 | Controlled register entry 118 | §13 | platform-orchestrator |
| TES-119 | Controlled register entry 119 | §14 | platform-orchestrator |
| TES-120 | Controlled register entry 120 | §5 | platform-orchestrator |
| TES-121 | Controlled register entry 121 | §6 | platform-orchestrator |
| TES-122 | Controlled register entry 122 | §7 | platform-orchestrator |
| TES-123 | Controlled register entry 123 | §8 | platform-orchestrator |
| TES-124 | Controlled register entry 124 | §9 | platform-orchestrator |
| TES-125 | Controlled register entry 125 | §10 | platform-orchestrator |
| TES-126 | Controlled register entry 126 | §11 | platform-orchestrator |
| TES-127 | Controlled register entry 127 | §12 | platform-orchestrator |
| TES-128 | Controlled register entry 128 | §13 | platform-orchestrator |
| TES-129 | Controlled register entry 129 | §14 | platform-orchestrator |
| TES-130 | Controlled register entry 130 | §5 | platform-orchestrator |
| TES-131 | Controlled register entry 131 | §6 | platform-orchestrator |
| TES-132 | Controlled register entry 132 | §7 | platform-orchestrator |
| TES-133 | Controlled register entry 133 | §8 | platform-orchestrator |
| TES-134 | Controlled register entry 134 | §9 | platform-orchestrator |
| TES-135 | Controlled register entry 135 | §10 | platform-orchestrator |
| TES-136 | Controlled register entry 136 | §11 | platform-orchestrator |
| TES-137 | Controlled register entry 137 | §12 | platform-orchestrator |
| TES-138 | Controlled register entry 138 | §13 | platform-orchestrator |
| TES-139 | Controlled register entry 139 | §14 | platform-orchestrator |
| TES-140 | Controlled register entry 140 | §5 | platform-orchestrator |
| TES-141 | Controlled register entry 141 | §6 | platform-orchestrator |
| TES-142 | Controlled register entry 142 | §7 | platform-orchestrator |
| TES-143 | Controlled register entry 143 | §8 | platform-orchestrator |
| TES-144 | Controlled register entry 144 | §9 | platform-orchestrator |
| TES-145 | Controlled register entry 145 | §10 | platform-orchestrator |
| TES-146 | Controlled register entry 146 | §11 | platform-orchestrator |
| TES-147 | Controlled register entry 147 | §12 | platform-orchestrator |
| TES-148 | Controlled register entry 148 | §13 | platform-orchestrator |
| TES-149 | Controlled register entry 149 | §14 | platform-orchestrator |
| TES-150 | Controlled register entry 150 | §5 | platform-orchestrator |
| TES-151 | Controlled register entry 151 | §6 | platform-orchestrator |
| TES-152 | Controlled register entry 152 | §7 | platform-orchestrator |
| TES-153 | Controlled register entry 153 | §8 | platform-orchestrator |
| TES-154 | Controlled register entry 154 | §9 | platform-orchestrator |
| TES-155 | Controlled register entry 155 | §10 | platform-orchestrator |
| TES-156 | Controlled register entry 156 | §11 | platform-orchestrator |
| TES-157 | Controlled register entry 157 | §12 | platform-orchestrator |
| TES-158 | Controlled register entry 158 | §13 | platform-orchestrator |
| TES-159 | Controlled register entry 159 | §14 | platform-orchestrator |
| TES-160 | Controlled register entry 160 | §5 | platform-orchestrator |
| TES-161 | Controlled register entry 161 | §6 | platform-orchestrator |
| TES-162 | Controlled register entry 162 | §7 | platform-orchestrator |
| TES-163 | Controlled register entry 163 | §8 | platform-orchestrator |
| TES-164 | Controlled register entry 164 | §9 | platform-orchestrator |
| TES-165 | Controlled register entry 165 | §10 | platform-orchestrator |
| TES-166 | Controlled register entry 166 | §11 | platform-orchestrator |
| TES-167 | Controlled register entry 167 | §12 | platform-orchestrator |
| TES-168 | Controlled register entry 168 | §13 | platform-orchestrator |
| TES-169 | Controlled register entry 169 | §14 | platform-orchestrator |
| TES-170 | Controlled register entry 170 | §5 | platform-orchestrator |
| TES-171 | Controlled register entry 171 | §6 | platform-orchestrator |
| TES-172 | Controlled register entry 172 | §7 | platform-orchestrator |
| TES-173 | Controlled register entry 173 | §8 | platform-orchestrator |
| TES-174 | Controlled register entry 174 | §9 | platform-orchestrator |
| TES-175 | Controlled register entry 175 | §10 | platform-orchestrator |
| TES-176 | Controlled register entry 176 | §11 | platform-orchestrator |
| TES-177 | Controlled register entry 177 | §12 | platform-orchestrator |
| TES-178 | Controlled register entry 178 | §13 | platform-orchestrator |
| TES-179 | Controlled register entry 179 | §14 | platform-orchestrator |
| TES-180 | Controlled register entry 180 | §5 | platform-orchestrator |
| TES-181 | Controlled register entry 181 | §6 | platform-orchestrator |
| TES-182 | Controlled register entry 182 | §7 | platform-orchestrator |
| TES-183 | Controlled register entry 183 | §8 | platform-orchestrator |
| TES-184 | Controlled register entry 184 | §9 | platform-orchestrator |
| TES-185 | Controlled register entry 185 | §10 | platform-orchestrator |
| TES-186 | Controlled register entry 186 | §11 | platform-orchestrator |
| TES-187 | Controlled register entry 187 | §12 | platform-orchestrator |
| TES-188 | Controlled register entry 188 | §13 | platform-orchestrator |
| TES-189 | Controlled register entry 189 | §14 | platform-orchestrator |
| TES-190 | Controlled register entry 190 | §5 | platform-orchestrator |
| TES-191 | Controlled register entry 191 | §6 | platform-orchestrator |
| TES-192 | Controlled register entry 192 | §7 | platform-orchestrator |
| TES-193 | Controlled register entry 193 | §8 | platform-orchestrator |
| TES-194 | Controlled register entry 194 | §9 | platform-orchestrator |
| TES-195 | Controlled register entry 195 | §10 | platform-orchestrator |
| TES-196 | Controlled register entry 196 | §11 | platform-orchestrator |
| TES-197 | Controlled register entry 197 | §12 | platform-orchestrator |
| TES-198 | Controlled register entry 198 | §13 | platform-orchestrator |
| TES-199 | Controlled register entry 199 | §14 | platform-orchestrator |
| TES-200 | Controlled register entry 200 | §5 | platform-orchestrator |
| TES-201 | Controlled register entry 201 | §6 | platform-orchestrator |
| TES-202 | Controlled register entry 202 | §7 | platform-orchestrator |
| TES-203 | Controlled register entry 203 | §8 | platform-orchestrator |
| TES-204 | Controlled register entry 204 | §9 | platform-orchestrator |
| TES-205 | Controlled register entry 205 | §10 | platform-orchestrator |
| TES-206 | Controlled register entry 206 | §11 | platform-orchestrator |
| TES-207 | Controlled register entry 207 | §12 | platform-orchestrator |
| TES-208 | Controlled register entry 208 | §13 | platform-orchestrator |
| TES-209 | Controlled register entry 209 | §14 | platform-orchestrator |
| TES-210 | Controlled register entry 210 | §5 | platform-orchestrator |
| TES-211 | Controlled register entry 211 | §6 | platform-orchestrator |
| TES-212 | Controlled register entry 212 | §7 | platform-orchestrator |
| TES-213 | Controlled register entry 213 | §8 | platform-orchestrator |
| TES-214 | Controlled register entry 214 | §9 | platform-orchestrator |
| TES-215 | Controlled register entry 215 | §10 | platform-orchestrator |
| TES-216 | Controlled register entry 216 | §11 | platform-orchestrator |
| TES-217 | Controlled register entry 217 | §12 | platform-orchestrator |
| TES-218 | Controlled register entry 218 | §13 | platform-orchestrator |
| TES-219 | Controlled register entry 219 | §14 | platform-orchestrator |
| TES-220 | Controlled register entry 220 | §5 | platform-orchestrator |
| TES-221 | Controlled register entry 221 | §6 | platform-orchestrator |
| TES-222 | Controlled register entry 222 | §7 | platform-orchestrator |
| TES-223 | Controlled register entry 223 | §8 | platform-orchestrator |
| TES-224 | Controlled register entry 224 | §9 | platform-orchestrator |
| TES-225 | Controlled register entry 225 | §10 | platform-orchestrator |
| TES-226 | Controlled register entry 226 | §11 | platform-orchestrator |
| TES-227 | Controlled register entry 227 | §12 | platform-orchestrator |
| TES-228 | Controlled register entry 228 | §13 | platform-orchestrator |
| TES-229 | Controlled register entry 229 | §14 | platform-orchestrator |
| TES-230 | Controlled register entry 230 | §5 | platform-orchestrator |
| TES-231 | Controlled register entry 231 | §6 | platform-orchestrator |
| TES-232 | Controlled register entry 232 | §7 | platform-orchestrator |
| TES-233 | Controlled register entry 233 | §8 | platform-orchestrator |
| TES-234 | Controlled register entry 234 | §9 | platform-orchestrator |
| TES-235 | Controlled register entry 235 | §10 | platform-orchestrator |
| TES-236 | Controlled register entry 236 | §11 | platform-orchestrator |
| TES-237 | Controlled register entry 237 | §12 | platform-orchestrator |
| TES-238 | Controlled register entry 238 | §13 | platform-orchestrator |
| TES-239 | Controlled register entry 239 | §14 | platform-orchestrator |
| TES-240 | Controlled register entry 240 | §5 | platform-orchestrator |
| TES-241 | Controlled register entry 241 | §6 | platform-orchestrator |
| TES-242 | Controlled register entry 242 | §7 | platform-orchestrator |
| TES-243 | Controlled register entry 243 | §8 | platform-orchestrator |
| TES-244 | Controlled register entry 244 | §9 | platform-orchestrator |
| TES-245 | Controlled register entry 245 | §10 | platform-orchestrator |
| TES-246 | Controlled register entry 246 | §11 | platform-orchestrator |
| TES-247 | Controlled register entry 247 | §12 | platform-orchestrator |
| TES-248 | Controlled register entry 248 | §13 | platform-orchestrator |
| TES-249 | Controlled register entry 249 | §14 | platform-orchestrator |
| TES-250 | Controlled register entry 250 | §5 | platform-orchestrator |
| TES-251 | Controlled register entry 251 | §6 | platform-orchestrator |
| TES-252 | Controlled register entry 252 | §7 | platform-orchestrator |
| TES-253 | Controlled register entry 253 | §8 | platform-orchestrator |
| TES-254 | Controlled register entry 254 | §9 | platform-orchestrator |
| TES-255 | Controlled register entry 255 | §10 | platform-orchestrator |
| TES-256 | Controlled register entry 256 | §11 | platform-orchestrator |
| TES-257 | Controlled register entry 257 | §12 | platform-orchestrator |
| TES-258 | Controlled register entry 258 | §13 | platform-orchestrator |
| TES-259 | Controlled register entry 259 | §14 | platform-orchestrator |
| TES-260 | Controlled register entry 260 | §5 | platform-orchestrator |
| TES-261 | Controlled register entry 261 | §6 | platform-orchestrator |
| TES-262 | Controlled register entry 262 | §7 | platform-orchestrator |
| TES-263 | Controlled register entry 263 | §8 | platform-orchestrator |
| TES-264 | Controlled register entry 264 | §9 | platform-orchestrator |
| TES-265 | Controlled register entry 265 | §10 | platform-orchestrator |
| TES-266 | Controlled register entry 266 | §11 | platform-orchestrator |
| TES-267 | Controlled register entry 267 | §12 | platform-orchestrator |
| TES-268 | Controlled register entry 268 | §13 | platform-orchestrator |
| TES-269 | Controlled register entry 269 | §14 | platform-orchestrator |
| TES-270 | Controlled register entry 270 | §5 | platform-orchestrator |
| TES-271 | Controlled register entry 271 | §6 | platform-orchestrator |

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
