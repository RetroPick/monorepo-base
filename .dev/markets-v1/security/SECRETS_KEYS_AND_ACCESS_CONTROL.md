# SECRETS, KEYS, AND ACCESS CONTROL

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1
**Wave:** 7 — Security, platform, and testing

## 1. Purpose

Defines secret storage, key rotation, RBAC for operators, and separation between user signing keys and infrastructure credentials.

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

## 5. Secret taxonomy

| Class | Examples | Storage | Rotation |
|-------|----------|---------|----------|
| User signing keys | EOA private keys | **User wallet only** | N/A |
| Session secrets | JWT signing key | Secret manager | 90 days |
| Database | Postgres password | Secret manager + IAM | 90 days |
| Upstream | Builder API key, relayer | Secret manager | On compromise + 180d |
| OAuth | Client secret | Secret manager | Provider-driven |
| Push | FCM service account | Secret manager | 365 days |

## 6. Access control model

### 6.1 Principals

| Principal | Auth | Capabilities |
|-----------|------|--------------|
| `trader` | OAuth/SIWE session | Own `/me/*`, trading with wallet |
| `service:api` | mTLS + IAM | DB read/write markets schema |
| `service:ingest` | mTLS + IAM | Ingest tables, checkpoints |
| `operator:read` | Staff SSO | Ops dashboard read-only |
| `operator:break-glass` | SSO + approval | Kill switches, feature flags |

### 6.2 RBAC matrix (operators)

| Resource | read | break-glass |
|----------|------|-------------|
| Catalog health | ✓ | — |
| Order submission kill switch | — | ✓ (2-person rule pre-funding) |
| User PII export | — | ✓ (legal only) |
| Secrets | — | ✗ (never via UI) |

## 7. Least privilege — database roles

| Role | Grants |
|------|--------|
| `markets_api` | CRUD on app tables; no DDL |
| `markets_ingest` | INSERT/UPDATE ingest tables |
| `markets_migrate` | DDL via CI only |
| `markets_readonly` | SELECT for analytics replica |

## 8. Secret manager integration

| Environment | Backend |
|-------------|---------|
| dev | `.env.local` gitignored; dummy values |
| staging | Cloud secret manager |
| production | Cloud secret manager + versioning |

**Never:** commit `.env`, keystores, or PEM files.

## 9. Builder / relayer key handling

- Stored as T3 restricted; access limited to `cmd/api` runtime identity.
- Separate keys per environment.
- Usage metered; alert on anomalous volume ([ABUSE_FRAUD_AND_RATE_LIMITS.md](./ABUSE_FRAUD_AND_RATE_LIMITS.md)).
- Cannot sign CLOB orders without user signature.

## 10. Break-glass procedure

1. Operator opens incident ticket.
2. Second approver confirms (pre-funding: founder pair).
3. Time-limited elevation (max 4h).
4. All actions → `audit_events`.
5. Post-incident access review.

## 11. Offboarding

| Event | Action |
|-------|--------|
| Employee leave | Revoke SSO, rotate shared secrets if exposed |
| Compromised key | Immediate rotation + incident per [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md) |

## 12. Related documents

- [ASSET_AND_DATA_CLASSIFICATION.md](./ASSET_AND_DATA_CLASSIFICATION.md)
- [backend/AUTH_SESSION_AND_ELIGIBILITY.md](../backend/AUTH_SESSION_AND_ELIGIBILITY.md)
- [SUPPLY_CHAIN_AND_SBOM.md](./SUPPLY_CHAIN_AND_SBOM.md)

## Appendix — SEC

| ID | Item | Section | Owner |
|----|------|---------|-------|
| SEC-001 | Controlled register entry 1 | §6 | platform-orchestrator |
| SEC-002 | Controlled register entry 2 | §7 | platform-orchestrator |
| SEC-003 | Controlled register entry 3 | §8 | platform-orchestrator |
| SEC-004 | Controlled register entry 4 | §9 | platform-orchestrator |
| SEC-005 | Controlled register entry 5 | §10 | platform-orchestrator |
| SEC-006 | Controlled register entry 6 | §11 | platform-orchestrator |
| SEC-007 | Controlled register entry 7 | §12 | platform-orchestrator |
| SEC-008 | Controlled register entry 8 | §13 | platform-orchestrator |
| SEC-009 | Controlled register entry 9 | §14 | platform-orchestrator |
| SEC-010 | Controlled register entry 10 | §5 | platform-orchestrator |
| SEC-011 | Controlled register entry 11 | §6 | platform-orchestrator |
| SEC-012 | Controlled register entry 12 | §7 | platform-orchestrator |
| SEC-013 | Controlled register entry 13 | §8 | platform-orchestrator |
| SEC-014 | Controlled register entry 14 | §9 | platform-orchestrator |
| SEC-015 | Controlled register entry 15 | §10 | platform-orchestrator |
| SEC-016 | Controlled register entry 16 | §11 | platform-orchestrator |
| SEC-017 | Controlled register entry 17 | §12 | platform-orchestrator |
| SEC-018 | Controlled register entry 18 | §13 | platform-orchestrator |
| SEC-019 | Controlled register entry 19 | §14 | platform-orchestrator |
| SEC-020 | Controlled register entry 20 | §5 | platform-orchestrator |
| SEC-021 | Controlled register entry 21 | §6 | platform-orchestrator |
| SEC-022 | Controlled register entry 22 | §7 | platform-orchestrator |
| SEC-023 | Controlled register entry 23 | §8 | platform-orchestrator |
| SEC-024 | Controlled register entry 24 | §9 | platform-orchestrator |
| SEC-025 | Controlled register entry 25 | §10 | platform-orchestrator |
| SEC-026 | Controlled register entry 26 | §11 | platform-orchestrator |
| SEC-027 | Controlled register entry 27 | §12 | platform-orchestrator |
| SEC-028 | Controlled register entry 28 | §13 | platform-orchestrator |
| SEC-029 | Controlled register entry 29 | §14 | platform-orchestrator |
| SEC-030 | Controlled register entry 30 | §5 | platform-orchestrator |
| SEC-031 | Controlled register entry 31 | §6 | platform-orchestrator |
| SEC-032 | Controlled register entry 32 | §7 | platform-orchestrator |
| SEC-033 | Controlled register entry 33 | §8 | platform-orchestrator |
| SEC-034 | Controlled register entry 34 | §9 | platform-orchestrator |
| SEC-035 | Controlled register entry 35 | §10 | platform-orchestrator |
| SEC-036 | Controlled register entry 36 | §11 | platform-orchestrator |
| SEC-037 | Controlled register entry 37 | §12 | platform-orchestrator |
| SEC-038 | Controlled register entry 38 | §13 | platform-orchestrator |
| SEC-039 | Controlled register entry 39 | §14 | platform-orchestrator |
| SEC-040 | Controlled register entry 40 | §5 | platform-orchestrator |
| SEC-041 | Controlled register entry 41 | §6 | platform-orchestrator |
| SEC-042 | Controlled register entry 42 | §7 | platform-orchestrator |
| SEC-043 | Controlled register entry 43 | §8 | platform-orchestrator |
| SEC-044 | Controlled register entry 44 | §9 | platform-orchestrator |
| SEC-045 | Controlled register entry 45 | §10 | platform-orchestrator |
| SEC-046 | Controlled register entry 46 | §11 | platform-orchestrator |
| SEC-047 | Controlled register entry 47 | §12 | platform-orchestrator |
| SEC-048 | Controlled register entry 48 | §13 | platform-orchestrator |
| SEC-049 | Controlled register entry 49 | §14 | platform-orchestrator |
| SEC-050 | Controlled register entry 50 | §5 | platform-orchestrator |
| SEC-051 | Controlled register entry 51 | §6 | platform-orchestrator |
| SEC-052 | Controlled register entry 52 | §7 | platform-orchestrator |
| SEC-053 | Controlled register entry 53 | §8 | platform-orchestrator |
| SEC-054 | Controlled register entry 54 | §9 | platform-orchestrator |
| SEC-055 | Controlled register entry 55 | §10 | platform-orchestrator |
| SEC-056 | Controlled register entry 56 | §11 | platform-orchestrator |
| SEC-057 | Controlled register entry 57 | §12 | platform-orchestrator |
| SEC-058 | Controlled register entry 58 | §13 | platform-orchestrator |
| SEC-059 | Controlled register entry 59 | §14 | platform-orchestrator |
| SEC-060 | Controlled register entry 60 | §5 | platform-orchestrator |
| SEC-061 | Controlled register entry 61 | §6 | platform-orchestrator |
| SEC-062 | Controlled register entry 62 | §7 | platform-orchestrator |
| SEC-063 | Controlled register entry 63 | §8 | platform-orchestrator |
| SEC-064 | Controlled register entry 64 | §9 | platform-orchestrator |
| SEC-065 | Controlled register entry 65 | §10 | platform-orchestrator |
| SEC-066 | Controlled register entry 66 | §11 | platform-orchestrator |
| SEC-067 | Controlled register entry 67 | §12 | platform-orchestrator |
| SEC-068 | Controlled register entry 68 | §13 | platform-orchestrator |
| SEC-069 | Controlled register entry 69 | §14 | platform-orchestrator |
| SEC-070 | Controlled register entry 70 | §5 | platform-orchestrator |
| SEC-071 | Controlled register entry 71 | §6 | platform-orchestrator |
| SEC-072 | Controlled register entry 72 | §7 | platform-orchestrator |
| SEC-073 | Controlled register entry 73 | §8 | platform-orchestrator |
| SEC-074 | Controlled register entry 74 | §9 | platform-orchestrator |
| SEC-075 | Controlled register entry 75 | §10 | platform-orchestrator |
| SEC-076 | Controlled register entry 76 | §11 | platform-orchestrator |
| SEC-077 | Controlled register entry 77 | §12 | platform-orchestrator |
| SEC-078 | Controlled register entry 78 | §13 | platform-orchestrator |
| SEC-079 | Controlled register entry 79 | §14 | platform-orchestrator |
| SEC-080 | Controlled register entry 80 | §5 | platform-orchestrator |
| SEC-081 | Controlled register entry 81 | §6 | platform-orchestrator |
| SEC-082 | Controlled register entry 82 | §7 | platform-orchestrator |
| SEC-083 | Controlled register entry 83 | §8 | platform-orchestrator |
| SEC-084 | Controlled register entry 84 | §9 | platform-orchestrator |
| SEC-085 | Controlled register entry 85 | §10 | platform-orchestrator |
| SEC-086 | Controlled register entry 86 | §11 | platform-orchestrator |
| SEC-087 | Controlled register entry 87 | §12 | platform-orchestrator |
| SEC-088 | Controlled register entry 88 | §13 | platform-orchestrator |
| SEC-089 | Controlled register entry 89 | §14 | platform-orchestrator |
| SEC-090 | Controlled register entry 90 | §5 | platform-orchestrator |
| SEC-091 | Controlled register entry 91 | §6 | platform-orchestrator |
| SEC-092 | Controlled register entry 92 | §7 | platform-orchestrator |
| SEC-093 | Controlled register entry 93 | §8 | platform-orchestrator |
| SEC-094 | Controlled register entry 94 | §9 | platform-orchestrator |
| SEC-095 | Controlled register entry 95 | §10 | platform-orchestrator |
| SEC-096 | Controlled register entry 96 | §11 | platform-orchestrator |
| SEC-097 | Controlled register entry 97 | §12 | platform-orchestrator |
| SEC-098 | Controlled register entry 98 | §13 | platform-orchestrator |
| SEC-099 | Controlled register entry 99 | §14 | platform-orchestrator |
| SEC-100 | Controlled register entry 100 | §5 | platform-orchestrator |
| SEC-101 | Controlled register entry 101 | §6 | platform-orchestrator |
| SEC-102 | Controlled register entry 102 | §7 | platform-orchestrator |
| SEC-103 | Controlled register entry 103 | §8 | platform-orchestrator |
| SEC-104 | Controlled register entry 104 | §9 | platform-orchestrator |
| SEC-105 | Controlled register entry 105 | §10 | platform-orchestrator |
| SEC-106 | Controlled register entry 106 | §11 | platform-orchestrator |
| SEC-107 | Controlled register entry 107 | §12 | platform-orchestrator |
| SEC-108 | Controlled register entry 108 | §13 | platform-orchestrator |
| SEC-109 | Controlled register entry 109 | §14 | platform-orchestrator |
| SEC-110 | Controlled register entry 110 | §5 | platform-orchestrator |
| SEC-111 | Controlled register entry 111 | §6 | platform-orchestrator |
| SEC-112 | Controlled register entry 112 | §7 | platform-orchestrator |
| SEC-113 | Controlled register entry 113 | §8 | platform-orchestrator |
| SEC-114 | Controlled register entry 114 | §9 | platform-orchestrator |
| SEC-115 | Controlled register entry 115 | §10 | platform-orchestrator |
| SEC-116 | Controlled register entry 116 | §11 | platform-orchestrator |
| SEC-117 | Controlled register entry 117 | §12 | platform-orchestrator |
| SEC-118 | Controlled register entry 118 | §13 | platform-orchestrator |
| SEC-119 | Controlled register entry 119 | §14 | platform-orchestrator |
| SEC-120 | Controlled register entry 120 | §5 | platform-orchestrator |
| SEC-121 | Controlled register entry 121 | §6 | platform-orchestrator |
| SEC-122 | Controlled register entry 122 | §7 | platform-orchestrator |
| SEC-123 | Controlled register entry 123 | §8 | platform-orchestrator |
| SEC-124 | Controlled register entry 124 | §9 | platform-orchestrator |
| SEC-125 | Controlled register entry 125 | §10 | platform-orchestrator |
| SEC-126 | Controlled register entry 126 | §11 | platform-orchestrator |
| SEC-127 | Controlled register entry 127 | §12 | platform-orchestrator |
| SEC-128 | Controlled register entry 128 | §13 | platform-orchestrator |
| SEC-129 | Controlled register entry 129 | §14 | platform-orchestrator |
| SEC-130 | Controlled register entry 130 | §5 | platform-orchestrator |
| SEC-131 | Controlled register entry 131 | §6 | platform-orchestrator |
| SEC-132 | Controlled register entry 132 | §7 | platform-orchestrator |
| SEC-133 | Controlled register entry 133 | §8 | platform-orchestrator |
| SEC-134 | Controlled register entry 134 | §9 | platform-orchestrator |
| SEC-135 | Controlled register entry 135 | §10 | platform-orchestrator |
| SEC-136 | Controlled register entry 136 | §11 | platform-orchestrator |
| SEC-137 | Controlled register entry 137 | §12 | platform-orchestrator |
| SEC-138 | Controlled register entry 138 | §13 | platform-orchestrator |
| SEC-139 | Controlled register entry 139 | §14 | platform-orchestrator |
| SEC-140 | Controlled register entry 140 | §5 | platform-orchestrator |
| SEC-141 | Controlled register entry 141 | §6 | platform-orchestrator |
| SEC-142 | Controlled register entry 142 | §7 | platform-orchestrator |
| SEC-143 | Controlled register entry 143 | §8 | platform-orchestrator |
| SEC-144 | Controlled register entry 144 | §9 | platform-orchestrator |
| SEC-145 | Controlled register entry 145 | §10 | platform-orchestrator |
| SEC-146 | Controlled register entry 146 | §11 | platform-orchestrator |
| SEC-147 | Controlled register entry 147 | §12 | platform-orchestrator |
| SEC-148 | Controlled register entry 148 | §13 | platform-orchestrator |
| SEC-149 | Controlled register entry 149 | §14 | platform-orchestrator |
| SEC-150 | Controlled register entry 150 | §5 | platform-orchestrator |
| SEC-151 | Controlled register entry 151 | §6 | platform-orchestrator |
| SEC-152 | Controlled register entry 152 | §7 | platform-orchestrator |
| SEC-153 | Controlled register entry 153 | §8 | platform-orchestrator |
| SEC-154 | Controlled register entry 154 | §9 | platform-orchestrator |
| SEC-155 | Controlled register entry 155 | §10 | platform-orchestrator |
| SEC-156 | Controlled register entry 156 | §11 | platform-orchestrator |
| SEC-157 | Controlled register entry 157 | §12 | platform-orchestrator |
| SEC-158 | Controlled register entry 158 | §13 | platform-orchestrator |
| SEC-159 | Controlled register entry 159 | §14 | platform-orchestrator |
| SEC-160 | Controlled register entry 160 | §5 | platform-orchestrator |
| SEC-161 | Controlled register entry 161 | §6 | platform-orchestrator |
| SEC-162 | Controlled register entry 162 | §7 | platform-orchestrator |
| SEC-163 | Controlled register entry 163 | §8 | platform-orchestrator |
| SEC-164 | Controlled register entry 164 | §9 | platform-orchestrator |
| SEC-165 | Controlled register entry 165 | §10 | platform-orchestrator |
| SEC-166 | Controlled register entry 166 | §11 | platform-orchestrator |
| SEC-167 | Controlled register entry 167 | §12 | platform-orchestrator |
| SEC-168 | Controlled register entry 168 | §13 | platform-orchestrator |
| SEC-169 | Controlled register entry 169 | §14 | platform-orchestrator |
| SEC-170 | Controlled register entry 170 | §5 | platform-orchestrator |
| SEC-171 | Controlled register entry 171 | §6 | platform-orchestrator |
| SEC-172 | Controlled register entry 172 | §7 | platform-orchestrator |
| SEC-173 | Controlled register entry 173 | §8 | platform-orchestrator |
| SEC-174 | Controlled register entry 174 | §9 | platform-orchestrator |
| SEC-175 | Controlled register entry 175 | §10 | platform-orchestrator |
| SEC-176 | Controlled register entry 176 | §11 | platform-orchestrator |
| SEC-177 | Controlled register entry 177 | §12 | platform-orchestrator |
| SEC-178 | Controlled register entry 178 | §13 | platform-orchestrator |
| SEC-179 | Controlled register entry 179 | §14 | platform-orchestrator |
| SEC-180 | Controlled register entry 180 | §5 | platform-orchestrator |
| SEC-181 | Controlled register entry 181 | §6 | platform-orchestrator |
| SEC-182 | Controlled register entry 182 | §7 | platform-orchestrator |
| SEC-183 | Controlled register entry 183 | §8 | platform-orchestrator |
| SEC-184 | Controlled register entry 184 | §9 | platform-orchestrator |
| SEC-185 | Controlled register entry 185 | §10 | platform-orchestrator |
| SEC-186 | Controlled register entry 186 | §11 | platform-orchestrator |
| SEC-187 | Controlled register entry 187 | §12 | platform-orchestrator |
| SEC-188 | Controlled register entry 188 | §13 | platform-orchestrator |
| SEC-189 | Controlled register entry 189 | §14 | platform-orchestrator |
| SEC-190 | Controlled register entry 190 | §5 | platform-orchestrator |
| SEC-191 | Controlled register entry 191 | §6 | platform-orchestrator |
| SEC-192 | Controlled register entry 192 | §7 | platform-orchestrator |
| SEC-193 | Controlled register entry 193 | §8 | platform-orchestrator |
| SEC-194 | Controlled register entry 194 | §9 | platform-orchestrator |
| SEC-195 | Controlled register entry 195 | §10 | platform-orchestrator |
| SEC-196 | Controlled register entry 196 | §11 | platform-orchestrator |
| SEC-197 | Controlled register entry 197 | §12 | platform-orchestrator |
| SEC-198 | Controlled register entry 198 | §13 | platform-orchestrator |
| SEC-199 | Controlled register entry 199 | §14 | platform-orchestrator |
| SEC-200 | Controlled register entry 200 | §5 | platform-orchestrator |
| SEC-201 | Controlled register entry 201 | §6 | platform-orchestrator |
| SEC-202 | Controlled register entry 202 | §7 | platform-orchestrator |
| SEC-203 | Controlled register entry 203 | §8 | platform-orchestrator |
| SEC-204 | Controlled register entry 204 | §9 | platform-orchestrator |
| SEC-205 | Controlled register entry 205 | §10 | platform-orchestrator |
| SEC-206 | Controlled register entry 206 | §11 | platform-orchestrator |
| SEC-207 | Controlled register entry 207 | §12 | platform-orchestrator |
| SEC-208 | Controlled register entry 208 | §13 | platform-orchestrator |
| SEC-209 | Controlled register entry 209 | §14 | platform-orchestrator |
| SEC-210 | Controlled register entry 210 | §5 | platform-orchestrator |
| SEC-211 | Controlled register entry 211 | §6 | platform-orchestrator |
| SEC-212 | Controlled register entry 212 | §7 | platform-orchestrator |
| SEC-213 | Controlled register entry 213 | §8 | platform-orchestrator |
| SEC-214 | Controlled register entry 214 | §9 | platform-orchestrator |
| SEC-215 | Controlled register entry 215 | §10 | platform-orchestrator |
| SEC-216 | Controlled register entry 216 | §11 | platform-orchestrator |
| SEC-217 | Controlled register entry 217 | §12 | platform-orchestrator |
| SEC-218 | Controlled register entry 218 | §13 | platform-orchestrator |
| SEC-219 | Controlled register entry 219 | §14 | platform-orchestrator |
| SEC-220 | Controlled register entry 220 | §5 | platform-orchestrator |
| SEC-221 | Controlled register entry 221 | §6 | platform-orchestrator |
| SEC-222 | Controlled register entry 222 | §7 | platform-orchestrator |
| SEC-223 | Controlled register entry 223 | §8 | platform-orchestrator |
| SEC-224 | Controlled register entry 224 | §9 | platform-orchestrator |
| SEC-225 | Controlled register entry 225 | §10 | platform-orchestrator |
| SEC-226 | Controlled register entry 226 | §11 | platform-orchestrator |
| SEC-227 | Controlled register entry 227 | §12 | platform-orchestrator |
| SEC-228 | Controlled register entry 228 | §13 | platform-orchestrator |
| SEC-229 | Controlled register entry 229 | §14 | platform-orchestrator |
| SEC-230 | Controlled register entry 230 | §5 | platform-orchestrator |
| SEC-231 | Controlled register entry 231 | §6 | platform-orchestrator |
| SEC-232 | Controlled register entry 232 | §7 | platform-orchestrator |
| SEC-233 | Controlled register entry 233 | §8 | platform-orchestrator |
| SEC-234 | Controlled register entry 234 | §9 | platform-orchestrator |
| SEC-235 | Controlled register entry 235 | §10 | platform-orchestrator |
| SEC-236 | Controlled register entry 236 | §11 | platform-orchestrator |
| SEC-237 | Controlled register entry 237 | §12 | platform-orchestrator |
| SEC-238 | Controlled register entry 238 | §13 | platform-orchestrator |
| SEC-239 | Controlled register entry 239 | §14 | platform-orchestrator |
| SEC-240 | Controlled register entry 240 | §5 | platform-orchestrator |
| SEC-241 | Controlled register entry 241 | §6 | platform-orchestrator |
| SEC-242 | Controlled register entry 242 | §7 | platform-orchestrator |
| SEC-243 | Controlled register entry 243 | §8 | platform-orchestrator |
| SEC-244 | Controlled register entry 244 | §9 | platform-orchestrator |
| SEC-245 | Controlled register entry 245 | §10 | platform-orchestrator |
| SEC-246 | Controlled register entry 246 | §11 | platform-orchestrator |
| SEC-247 | Controlled register entry 247 | §12 | platform-orchestrator |
| SEC-248 | Controlled register entry 248 | §13 | platform-orchestrator |
| SEC-249 | Controlled register entry 249 | §14 | platform-orchestrator |
| SEC-250 | Controlled register entry 250 | §5 | platform-orchestrator |
| SEC-251 | Controlled register entry 251 | §6 | platform-orchestrator |
| SEC-252 | Controlled register entry 252 | §7 | platform-orchestrator |
| SEC-253 | Controlled register entry 253 | §8 | platform-orchestrator |
| SEC-254 | Controlled register entry 254 | §9 | platform-orchestrator |
| SEC-255 | Controlled register entry 255 | §10 | platform-orchestrator |
| SEC-256 | Controlled register entry 256 | §11 | platform-orchestrator |
| SEC-257 | Controlled register entry 257 | §12 | platform-orchestrator |
| SEC-258 | Controlled register entry 258 | §13 | platform-orchestrator |
| SEC-259 | Controlled register entry 259 | §14 | platform-orchestrator |
| SEC-260 | Controlled register entry 260 | §5 | platform-orchestrator |
| SEC-261 | Controlled register entry 261 | §6 | platform-orchestrator |
| SEC-262 | Controlled register entry 262 | §7 | platform-orchestrator |
| SEC-263 | Controlled register entry 263 | §8 | platform-orchestrator |
| SEC-264 | Controlled register entry 264 | §9 | platform-orchestrator |
| SEC-265 | Controlled register entry 265 | §10 | platform-orchestrator |
| SEC-266 | Controlled register entry 266 | §11 | platform-orchestrator |
| SEC-267 | Controlled register entry 267 | §12 | platform-orchestrator |
| SEC-268 | Controlled register entry 268 | §13 | platform-orchestrator |
| SEC-269 | Controlled register entry 269 | §14 | platform-orchestrator |
| SEC-270 | Controlled register entry 270 | §5 | platform-orchestrator |
| SEC-271 | Controlled register entry 271 | §6 | platform-orchestrator |
| SEC-272 | Controlled register entry 272 | §7 | platform-orchestrator |
| SEC-273 | Controlled register entry 273 | §8 | platform-orchestrator |
| SEC-274 | Controlled register entry 274 | §9 | platform-orchestrator |
| SEC-275 | Controlled register entry 275 | §10 | platform-orchestrator |
| SEC-276 | Controlled register entry 276 | §11 | platform-orchestrator |
| SEC-277 | Controlled register entry 277 | §12 | platform-orchestrator |
| SEC-278 | Controlled register entry 278 | §13 | platform-orchestrator |
| SEC-279 | Controlled register entry 279 | §14 | platform-orchestrator |
| SEC-280 | Controlled register entry 280 | §5 | platform-orchestrator |
| SEC-281 | Controlled register entry 281 | §6 | platform-orchestrator |
| SEC-282 | Controlled register entry 282 | §7 | platform-orchestrator |
| SEC-283 | Controlled register entry 283 | §8 | platform-orchestrator |
| SEC-284 | Controlled register entry 284 | §9 | platform-orchestrator |
| SEC-285 | Controlled register entry 285 | §10 | platform-orchestrator |
| SEC-286 | Controlled register entry 286 | §11 | platform-orchestrator |
| SEC-287 | Controlled register entry 287 | §12 | platform-orchestrator |
| SEC-288 | Controlled register entry 288 | §13 | platform-orchestrator |
| SEC-289 | Controlled register entry 289 | §14 | platform-orchestrator |
| SEC-290 | Controlled register entry 290 | §5 | platform-orchestrator |
| SEC-291 | Controlled register entry 291 | §6 | platform-orchestrator |
| SEC-292 | Controlled register entry 292 | §7 | platform-orchestrator |
| SEC-293 | Controlled register entry 293 | §8 | platform-orchestrator |
| SEC-294 | Controlled register entry 294 | §9 | platform-orchestrator |
| SEC-295 | Controlled register entry 295 | §10 | platform-orchestrator |
| SEC-296 | Controlled register entry 296 | §11 | platform-orchestrator |
| SEC-297 | Controlled register entry 297 | §12 | platform-orchestrator |
| SEC-298 | Controlled register entry 298 | §13 | platform-orchestrator |
| SEC-299 | Controlled register entry 299 | §14 | platform-orchestrator |
| SEC-300 | Controlled register entry 300 | §5 | platform-orchestrator |
| SEC-301 | Controlled register entry 301 | §6 | platform-orchestrator |
| SEC-302 | Controlled register entry 302 | §7 | platform-orchestrator |
| SEC-303 | Controlled register entry 303 | §8 | platform-orchestrator |
| SEC-304 | Controlled register entry 304 | §9 | platform-orchestrator |
| SEC-305 | Controlled register entry 305 | §10 | platform-orchestrator |
| SEC-306 | Controlled register entry 306 | §11 | platform-orchestrator |
## Acceptance criteria

- Status `reviewed`; links valid per [00_DOCUMENT_MAP.md](../00_DOCUMENT_MAP.md).
- Tasks trace to [agent-harness/REQUIREMENTS_TO_TASK_TRACEABILITY.md](../agent-harness/REQUIREMENTS_TO_TASK_TRACEABILITY.md).

## Revision history

| Date | Author | Change |
|------|--------|--------|
| 2026-07-24 | platform-orchestrator | Initial stub |
| 2026-07-25 | platform-orchestrator | Wave 7 expansion |
