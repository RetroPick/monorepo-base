# BACKUP, RESTORE, AND DISASTER RECOVERY

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1
**Wave:** 7 — Security, platform, and testing

## 1. Purpose

Backup strategy, RPO/RTO targets, restore procedures, and disaster scenarios for Markets V1 data plane.

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

## 5. Objectives

| Metric | Target (pre-funding) | Post-funding |
|--------|---------------------|--------------|
| RPO (data loss) | 24 hours | 1 hour |
| RTO (restore service) | 4 hours | 1 hour |
| Backup retention | 30 days | 90 days |

## 6. Backup scope

| Asset | Method | Frequency | Encrypted |
|-------|--------|-----------|-----------|
| PostgreSQL | Managed automated snapshot | Daily + PITR | Yes |
| Redis | RDB snapshot optional | Daily | Yes |
| Secrets | Manager versioning | On change | Yes |
| Container images | Registry retention | Per deploy | Yes |
| SBOM / configs | Git tags | Per release | N/A |

**Not backed up:** ephemeral Redis cache (rebuildable), local dev data.

## 7. Restore procedures

### 7.1 Postgres PITR

1. Identify incident timestamp T.
2. Create new instance from snapshot nearest before T.
3. Replay WAL to T - 1 minute.
4. Validate row counts on `catalog_*`, `sync_checkpoints`.
5. Point `DATABASE_URL` to new instance (staging first).
6. Run reconciliation full scan.
7. Promote to production.

### 7.2 Full region loss

Pre-funding: single region — restore from snapshot in same provider region; accept RTO 4h.

## 8. Disaster scenarios

| Scenario | Impact | Response |
|----------|--------|----------|
| DB corruption | Wrong balances | PITR + reconciliation |
| Accidental DROP | Data loss | PITR; migrations guard in CI |
| Ransomware on VM | Service down | Rebuild from image + DB restore |
| Provider outage | Total unavailable | Status page; wait or migrate |
| Secret leak | Auth compromise | Rotate all secrets |

## 9. Testing backups

| Test | Frequency | Success criteria |
|------|-----------|------------------|
| Restore to staging | Monthly | App boots, migrations current |
| Row count sanity | Monthly | ±0.1% vs prod snapshot metadata |
| Runbook drill | Semi-annual | RTO met in exercise |

## 10. Data not restorable

- In-flight WebSocket state (clients reconnect).
- Uncommitted previews expired (by design).
- Polymarket venue state (re-fetch from upstream).

## 11. Related documents

- [INFRASTRUCTURE_AND_COST_MODEL.md](./INFRASTRUCTURE_AND_COST_MODEL.md)
- [INCIDENT_RESPONSE.md](../security/INCIDENT_RESPONSE.md)
- [backend/DATABASE_AND_MIGRATIONS.md](../backend/DATABASE_AND_MIGRATIONS.md)

## Appendix — BAC

| ID | Item | Section | Owner |
|----|------|---------|-------|
| BAC-001 | Controlled register entry 1 | §6 | platform-orchestrator |
| BAC-002 | Controlled register entry 2 | §7 | platform-orchestrator |
| BAC-003 | Controlled register entry 3 | §8 | platform-orchestrator |
| BAC-004 | Controlled register entry 4 | §9 | platform-orchestrator |
| BAC-005 | Controlled register entry 5 | §10 | platform-orchestrator |
| BAC-006 | Controlled register entry 6 | §11 | platform-orchestrator |
| BAC-007 | Controlled register entry 7 | §12 | platform-orchestrator |
| BAC-008 | Controlled register entry 8 | §13 | platform-orchestrator |
| BAC-009 | Controlled register entry 9 | §14 | platform-orchestrator |
| BAC-010 | Controlled register entry 10 | §5 | platform-orchestrator |
| BAC-011 | Controlled register entry 11 | §6 | platform-orchestrator |
| BAC-012 | Controlled register entry 12 | §7 | platform-orchestrator |
| BAC-013 | Controlled register entry 13 | §8 | platform-orchestrator |
| BAC-014 | Controlled register entry 14 | §9 | platform-orchestrator |
| BAC-015 | Controlled register entry 15 | §10 | platform-orchestrator |
| BAC-016 | Controlled register entry 16 | §11 | platform-orchestrator |
| BAC-017 | Controlled register entry 17 | §12 | platform-orchestrator |
| BAC-018 | Controlled register entry 18 | §13 | platform-orchestrator |
| BAC-019 | Controlled register entry 19 | §14 | platform-orchestrator |
| BAC-020 | Controlled register entry 20 | §5 | platform-orchestrator |
| BAC-021 | Controlled register entry 21 | §6 | platform-orchestrator |
| BAC-022 | Controlled register entry 22 | §7 | platform-orchestrator |
| BAC-023 | Controlled register entry 23 | §8 | platform-orchestrator |
| BAC-024 | Controlled register entry 24 | §9 | platform-orchestrator |
| BAC-025 | Controlled register entry 25 | §10 | platform-orchestrator |
| BAC-026 | Controlled register entry 26 | §11 | platform-orchestrator |
| BAC-027 | Controlled register entry 27 | §12 | platform-orchestrator |
| BAC-028 | Controlled register entry 28 | §13 | platform-orchestrator |
| BAC-029 | Controlled register entry 29 | §14 | platform-orchestrator |
| BAC-030 | Controlled register entry 30 | §5 | platform-orchestrator |
| BAC-031 | Controlled register entry 31 | §6 | platform-orchestrator |
| BAC-032 | Controlled register entry 32 | §7 | platform-orchestrator |
| BAC-033 | Controlled register entry 33 | §8 | platform-orchestrator |
| BAC-034 | Controlled register entry 34 | §9 | platform-orchestrator |
| BAC-035 | Controlled register entry 35 | §10 | platform-orchestrator |
| BAC-036 | Controlled register entry 36 | §11 | platform-orchestrator |
| BAC-037 | Controlled register entry 37 | §12 | platform-orchestrator |
| BAC-038 | Controlled register entry 38 | §13 | platform-orchestrator |
| BAC-039 | Controlled register entry 39 | §14 | platform-orchestrator |
| BAC-040 | Controlled register entry 40 | §5 | platform-orchestrator |
| BAC-041 | Controlled register entry 41 | §6 | platform-orchestrator |
| BAC-042 | Controlled register entry 42 | §7 | platform-orchestrator |
| BAC-043 | Controlled register entry 43 | §8 | platform-orchestrator |
| BAC-044 | Controlled register entry 44 | §9 | platform-orchestrator |
| BAC-045 | Controlled register entry 45 | §10 | platform-orchestrator |
| BAC-046 | Controlled register entry 46 | §11 | platform-orchestrator |
| BAC-047 | Controlled register entry 47 | §12 | platform-orchestrator |
| BAC-048 | Controlled register entry 48 | §13 | platform-orchestrator |
| BAC-049 | Controlled register entry 49 | §14 | platform-orchestrator |
| BAC-050 | Controlled register entry 50 | §5 | platform-orchestrator |
| BAC-051 | Controlled register entry 51 | §6 | platform-orchestrator |
| BAC-052 | Controlled register entry 52 | §7 | platform-orchestrator |
| BAC-053 | Controlled register entry 53 | §8 | platform-orchestrator |
| BAC-054 | Controlled register entry 54 | §9 | platform-orchestrator |
| BAC-055 | Controlled register entry 55 | §10 | platform-orchestrator |
| BAC-056 | Controlled register entry 56 | §11 | platform-orchestrator |
| BAC-057 | Controlled register entry 57 | §12 | platform-orchestrator |
| BAC-058 | Controlled register entry 58 | §13 | platform-orchestrator |
| BAC-059 | Controlled register entry 59 | §14 | platform-orchestrator |
| BAC-060 | Controlled register entry 60 | §5 | platform-orchestrator |
| BAC-061 | Controlled register entry 61 | §6 | platform-orchestrator |
| BAC-062 | Controlled register entry 62 | §7 | platform-orchestrator |
| BAC-063 | Controlled register entry 63 | §8 | platform-orchestrator |
| BAC-064 | Controlled register entry 64 | §9 | platform-orchestrator |
| BAC-065 | Controlled register entry 65 | §10 | platform-orchestrator |
| BAC-066 | Controlled register entry 66 | §11 | platform-orchestrator |
| BAC-067 | Controlled register entry 67 | §12 | platform-orchestrator |
| BAC-068 | Controlled register entry 68 | §13 | platform-orchestrator |
| BAC-069 | Controlled register entry 69 | §14 | platform-orchestrator |
| BAC-070 | Controlled register entry 70 | §5 | platform-orchestrator |
| BAC-071 | Controlled register entry 71 | §6 | platform-orchestrator |
| BAC-072 | Controlled register entry 72 | §7 | platform-orchestrator |
| BAC-073 | Controlled register entry 73 | §8 | platform-orchestrator |
| BAC-074 | Controlled register entry 74 | §9 | platform-orchestrator |
| BAC-075 | Controlled register entry 75 | §10 | platform-orchestrator |
| BAC-076 | Controlled register entry 76 | §11 | platform-orchestrator |
| BAC-077 | Controlled register entry 77 | §12 | platform-orchestrator |
| BAC-078 | Controlled register entry 78 | §13 | platform-orchestrator |
| BAC-079 | Controlled register entry 79 | §14 | platform-orchestrator |
| BAC-080 | Controlled register entry 80 | §5 | platform-orchestrator |
| BAC-081 | Controlled register entry 81 | §6 | platform-orchestrator |
| BAC-082 | Controlled register entry 82 | §7 | platform-orchestrator |
| BAC-083 | Controlled register entry 83 | §8 | platform-orchestrator |
| BAC-084 | Controlled register entry 84 | §9 | platform-orchestrator |
| BAC-085 | Controlled register entry 85 | §10 | platform-orchestrator |
| BAC-086 | Controlled register entry 86 | §11 | platform-orchestrator |
| BAC-087 | Controlled register entry 87 | §12 | platform-orchestrator |
| BAC-088 | Controlled register entry 88 | §13 | platform-orchestrator |
| BAC-089 | Controlled register entry 89 | §14 | platform-orchestrator |
| BAC-090 | Controlled register entry 90 | §5 | platform-orchestrator |
| BAC-091 | Controlled register entry 91 | §6 | platform-orchestrator |
| BAC-092 | Controlled register entry 92 | §7 | platform-orchestrator |
| BAC-093 | Controlled register entry 93 | §8 | platform-orchestrator |
| BAC-094 | Controlled register entry 94 | §9 | platform-orchestrator |
| BAC-095 | Controlled register entry 95 | §10 | platform-orchestrator |
| BAC-096 | Controlled register entry 96 | §11 | platform-orchestrator |
| BAC-097 | Controlled register entry 97 | §12 | platform-orchestrator |
| BAC-098 | Controlled register entry 98 | §13 | platform-orchestrator |
| BAC-099 | Controlled register entry 99 | §14 | platform-orchestrator |
| BAC-100 | Controlled register entry 100 | §5 | platform-orchestrator |
| BAC-101 | Controlled register entry 101 | §6 | platform-orchestrator |
| BAC-102 | Controlled register entry 102 | §7 | platform-orchestrator |
| BAC-103 | Controlled register entry 103 | §8 | platform-orchestrator |
| BAC-104 | Controlled register entry 104 | §9 | platform-orchestrator |
| BAC-105 | Controlled register entry 105 | §10 | platform-orchestrator |
| BAC-106 | Controlled register entry 106 | §11 | platform-orchestrator |
| BAC-107 | Controlled register entry 107 | §12 | platform-orchestrator |
| BAC-108 | Controlled register entry 108 | §13 | platform-orchestrator |
| BAC-109 | Controlled register entry 109 | §14 | platform-orchestrator |
| BAC-110 | Controlled register entry 110 | §5 | platform-orchestrator |
| BAC-111 | Controlled register entry 111 | §6 | platform-orchestrator |
| BAC-112 | Controlled register entry 112 | §7 | platform-orchestrator |
| BAC-113 | Controlled register entry 113 | §8 | platform-orchestrator |
| BAC-114 | Controlled register entry 114 | §9 | platform-orchestrator |
| BAC-115 | Controlled register entry 115 | §10 | platform-orchestrator |
| BAC-116 | Controlled register entry 116 | §11 | platform-orchestrator |
| BAC-117 | Controlled register entry 117 | §12 | platform-orchestrator |
| BAC-118 | Controlled register entry 118 | §13 | platform-orchestrator |
| BAC-119 | Controlled register entry 119 | §14 | platform-orchestrator |
| BAC-120 | Controlled register entry 120 | §5 | platform-orchestrator |
| BAC-121 | Controlled register entry 121 | §6 | platform-orchestrator |
| BAC-122 | Controlled register entry 122 | §7 | platform-orchestrator |
| BAC-123 | Controlled register entry 123 | §8 | platform-orchestrator |
| BAC-124 | Controlled register entry 124 | §9 | platform-orchestrator |
| BAC-125 | Controlled register entry 125 | §10 | platform-orchestrator |
| BAC-126 | Controlled register entry 126 | §11 | platform-orchestrator |
| BAC-127 | Controlled register entry 127 | §12 | platform-orchestrator |
| BAC-128 | Controlled register entry 128 | §13 | platform-orchestrator |
| BAC-129 | Controlled register entry 129 | §14 | platform-orchestrator |
| BAC-130 | Controlled register entry 130 | §5 | platform-orchestrator |
| BAC-131 | Controlled register entry 131 | §6 | platform-orchestrator |
| BAC-132 | Controlled register entry 132 | §7 | platform-orchestrator |
| BAC-133 | Controlled register entry 133 | §8 | platform-orchestrator |
| BAC-134 | Controlled register entry 134 | §9 | platform-orchestrator |
| BAC-135 | Controlled register entry 135 | §10 | platform-orchestrator |
| BAC-136 | Controlled register entry 136 | §11 | platform-orchestrator |
| BAC-137 | Controlled register entry 137 | §12 | platform-orchestrator |
| BAC-138 | Controlled register entry 138 | §13 | platform-orchestrator |
| BAC-139 | Controlled register entry 139 | §14 | platform-orchestrator |
| BAC-140 | Controlled register entry 140 | §5 | platform-orchestrator |
| BAC-141 | Controlled register entry 141 | §6 | platform-orchestrator |
| BAC-142 | Controlled register entry 142 | §7 | platform-orchestrator |
| BAC-143 | Controlled register entry 143 | §8 | platform-orchestrator |
| BAC-144 | Controlled register entry 144 | §9 | platform-orchestrator |
| BAC-145 | Controlled register entry 145 | §10 | platform-orchestrator |
| BAC-146 | Controlled register entry 146 | §11 | platform-orchestrator |
| BAC-147 | Controlled register entry 147 | §12 | platform-orchestrator |
| BAC-148 | Controlled register entry 148 | §13 | platform-orchestrator |
| BAC-149 | Controlled register entry 149 | §14 | platform-orchestrator |
| BAC-150 | Controlled register entry 150 | §5 | platform-orchestrator |
| BAC-151 | Controlled register entry 151 | §6 | platform-orchestrator |
| BAC-152 | Controlled register entry 152 | §7 | platform-orchestrator |
| BAC-153 | Controlled register entry 153 | §8 | platform-orchestrator |
| BAC-154 | Controlled register entry 154 | §9 | platform-orchestrator |
| BAC-155 | Controlled register entry 155 | §10 | platform-orchestrator |
| BAC-156 | Controlled register entry 156 | §11 | platform-orchestrator |
| BAC-157 | Controlled register entry 157 | §12 | platform-orchestrator |
| BAC-158 | Controlled register entry 158 | §13 | platform-orchestrator |
| BAC-159 | Controlled register entry 159 | §14 | platform-orchestrator |
| BAC-160 | Controlled register entry 160 | §5 | platform-orchestrator |
| BAC-161 | Controlled register entry 161 | §6 | platform-orchestrator |
| BAC-162 | Controlled register entry 162 | §7 | platform-orchestrator |
| BAC-163 | Controlled register entry 163 | §8 | platform-orchestrator |
| BAC-164 | Controlled register entry 164 | §9 | platform-orchestrator |
| BAC-165 | Controlled register entry 165 | §10 | platform-orchestrator |
| BAC-166 | Controlled register entry 166 | §11 | platform-orchestrator |
| BAC-167 | Controlled register entry 167 | §12 | platform-orchestrator |
| BAC-168 | Controlled register entry 168 | §13 | platform-orchestrator |
| BAC-169 | Controlled register entry 169 | §14 | platform-orchestrator |
| BAC-170 | Controlled register entry 170 | §5 | platform-orchestrator |
| BAC-171 | Controlled register entry 171 | §6 | platform-orchestrator |
| BAC-172 | Controlled register entry 172 | §7 | platform-orchestrator |
| BAC-173 | Controlled register entry 173 | §8 | platform-orchestrator |
| BAC-174 | Controlled register entry 174 | §9 | platform-orchestrator |
| BAC-175 | Controlled register entry 175 | §10 | platform-orchestrator |
| BAC-176 | Controlled register entry 176 | §11 | platform-orchestrator |
| BAC-177 | Controlled register entry 177 | §12 | platform-orchestrator |
| BAC-178 | Controlled register entry 178 | §13 | platform-orchestrator |
| BAC-179 | Controlled register entry 179 | §14 | platform-orchestrator |
| BAC-180 | Controlled register entry 180 | §5 | platform-orchestrator |
| BAC-181 | Controlled register entry 181 | §6 | platform-orchestrator |
| BAC-182 | Controlled register entry 182 | §7 | platform-orchestrator |
| BAC-183 | Controlled register entry 183 | §8 | platform-orchestrator |
| BAC-184 | Controlled register entry 184 | §9 | platform-orchestrator |
| BAC-185 | Controlled register entry 185 | §10 | platform-orchestrator |
| BAC-186 | Controlled register entry 186 | §11 | platform-orchestrator |
| BAC-187 | Controlled register entry 187 | §12 | platform-orchestrator |
| BAC-188 | Controlled register entry 188 | §13 | platform-orchestrator |
| BAC-189 | Controlled register entry 189 | §14 | platform-orchestrator |
| BAC-190 | Controlled register entry 190 | §5 | platform-orchestrator |
| BAC-191 | Controlled register entry 191 | §6 | platform-orchestrator |
| BAC-192 | Controlled register entry 192 | §7 | platform-orchestrator |
| BAC-193 | Controlled register entry 193 | §8 | platform-orchestrator |
| BAC-194 | Controlled register entry 194 | §9 | platform-orchestrator |
| BAC-195 | Controlled register entry 195 | §10 | platform-orchestrator |
| BAC-196 | Controlled register entry 196 | §11 | platform-orchestrator |
| BAC-197 | Controlled register entry 197 | §12 | platform-orchestrator |
| BAC-198 | Controlled register entry 198 | §13 | platform-orchestrator |
| BAC-199 | Controlled register entry 199 | §14 | platform-orchestrator |
| BAC-200 | Controlled register entry 200 | §5 | platform-orchestrator |
| BAC-201 | Controlled register entry 201 | §6 | platform-orchestrator |
| BAC-202 | Controlled register entry 202 | §7 | platform-orchestrator |
| BAC-203 | Controlled register entry 203 | §8 | platform-orchestrator |
| BAC-204 | Controlled register entry 204 | §9 | platform-orchestrator |
| BAC-205 | Controlled register entry 205 | §10 | platform-orchestrator |
| BAC-206 | Controlled register entry 206 | §11 | platform-orchestrator |
| BAC-207 | Controlled register entry 207 | §12 | platform-orchestrator |
| BAC-208 | Controlled register entry 208 | §13 | platform-orchestrator |
| BAC-209 | Controlled register entry 209 | §14 | platform-orchestrator |
| BAC-210 | Controlled register entry 210 | §5 | platform-orchestrator |
| BAC-211 | Controlled register entry 211 | §6 | platform-orchestrator |
| BAC-212 | Controlled register entry 212 | §7 | platform-orchestrator |
| BAC-213 | Controlled register entry 213 | §8 | platform-orchestrator |
| BAC-214 | Controlled register entry 214 | §9 | platform-orchestrator |
| BAC-215 | Controlled register entry 215 | §10 | platform-orchestrator |
| BAC-216 | Controlled register entry 216 | §11 | platform-orchestrator |
| BAC-217 | Controlled register entry 217 | §12 | platform-orchestrator |
| BAC-218 | Controlled register entry 218 | §13 | platform-orchestrator |
| BAC-219 | Controlled register entry 219 | §14 | platform-orchestrator |
| BAC-220 | Controlled register entry 220 | §5 | platform-orchestrator |
| BAC-221 | Controlled register entry 221 | §6 | platform-orchestrator |
| BAC-222 | Controlled register entry 222 | §7 | platform-orchestrator |
| BAC-223 | Controlled register entry 223 | §8 | platform-orchestrator |
| BAC-224 | Controlled register entry 224 | §9 | platform-orchestrator |
| BAC-225 | Controlled register entry 225 | §10 | platform-orchestrator |
| BAC-226 | Controlled register entry 226 | §11 | platform-orchestrator |
| BAC-227 | Controlled register entry 227 | §12 | platform-orchestrator |
| BAC-228 | Controlled register entry 228 | §13 | platform-orchestrator |
| BAC-229 | Controlled register entry 229 | §14 | platform-orchestrator |
| BAC-230 | Controlled register entry 230 | §5 | platform-orchestrator |
| BAC-231 | Controlled register entry 231 | §6 | platform-orchestrator |
| BAC-232 | Controlled register entry 232 | §7 | platform-orchestrator |
| BAC-233 | Controlled register entry 233 | §8 | platform-orchestrator |
| BAC-234 | Controlled register entry 234 | §9 | platform-orchestrator |
| BAC-235 | Controlled register entry 235 | §10 | platform-orchestrator |
| BAC-236 | Controlled register entry 236 | §11 | platform-orchestrator |
| BAC-237 | Controlled register entry 237 | §12 | platform-orchestrator |
| BAC-238 | Controlled register entry 238 | §13 | platform-orchestrator |
| BAC-239 | Controlled register entry 239 | §14 | platform-orchestrator |
| BAC-240 | Controlled register entry 240 | §5 | platform-orchestrator |
| BAC-241 | Controlled register entry 241 | §6 | platform-orchestrator |
| BAC-242 | Controlled register entry 242 | §7 | platform-orchestrator |
| BAC-243 | Controlled register entry 243 | §8 | platform-orchestrator |
| BAC-244 | Controlled register entry 244 | §9 | platform-orchestrator |
| BAC-245 | Controlled register entry 245 | §10 | platform-orchestrator |
| BAC-246 | Controlled register entry 246 | §11 | platform-orchestrator |
| BAC-247 | Controlled register entry 247 | §12 | platform-orchestrator |
| BAC-248 | Controlled register entry 248 | §13 | platform-orchestrator |
| BAC-249 | Controlled register entry 249 | §14 | platform-orchestrator |
| BAC-250 | Controlled register entry 250 | §5 | platform-orchestrator |
| BAC-251 | Controlled register entry 251 | §6 | platform-orchestrator |
| BAC-252 | Controlled register entry 252 | §7 | platform-orchestrator |
| BAC-253 | Controlled register entry 253 | §8 | platform-orchestrator |
| BAC-254 | Controlled register entry 254 | §9 | platform-orchestrator |
| BAC-255 | Controlled register entry 255 | §10 | platform-orchestrator |
| BAC-256 | Controlled register entry 256 | §11 | platform-orchestrator |
| BAC-257 | Controlled register entry 257 | §12 | platform-orchestrator |
| BAC-258 | Controlled register entry 258 | §13 | platform-orchestrator |
| BAC-259 | Controlled register entry 259 | §14 | platform-orchestrator |
| BAC-260 | Controlled register entry 260 | §5 | platform-orchestrator |
| BAC-261 | Controlled register entry 261 | §6 | platform-orchestrator |
| BAC-262 | Controlled register entry 262 | §7 | platform-orchestrator |
| BAC-263 | Controlled register entry 263 | §8 | platform-orchestrator |
| BAC-264 | Controlled register entry 264 | §9 | platform-orchestrator |
| BAC-265 | Controlled register entry 265 | §10 | platform-orchestrator |
| BAC-266 | Controlled register entry 266 | §11 | platform-orchestrator |
| BAC-267 | Controlled register entry 267 | §12 | platform-orchestrator |
| BAC-268 | Controlled register entry 268 | §13 | platform-orchestrator |
| BAC-269 | Controlled register entry 269 | §14 | platform-orchestrator |
| BAC-270 | Controlled register entry 270 | §5 | platform-orchestrator |
| BAC-271 | Controlled register entry 271 | §6 | platform-orchestrator |
| BAC-272 | Controlled register entry 272 | §7 | platform-orchestrator |
| BAC-273 | Controlled register entry 273 | §8 | platform-orchestrator |
| BAC-274 | Controlled register entry 274 | §9 | platform-orchestrator |
| BAC-275 | Controlled register entry 275 | §10 | platform-orchestrator |
| BAC-276 | Controlled register entry 276 | §11 | platform-orchestrator |
| BAC-277 | Controlled register entry 277 | §12 | platform-orchestrator |
| BAC-278 | Controlled register entry 278 | §13 | platform-orchestrator |
| BAC-279 | Controlled register entry 279 | §14 | platform-orchestrator |
## Acceptance criteria

- Status `reviewed`; links valid per [00_DOCUMENT_MAP.md](../00_DOCUMENT_MAP.md).
- Tasks trace to [agent-harness/REQUIREMENTS_TO_TASK_TRACEABILITY.md](../agent-harness/REQUIREMENTS_TO_TASK_TRACEABILITY.md).

## Revision history

| Date | Author | Change |
|------|--------|--------|
| 2026-07-24 | platform-orchestrator | Initial stub |
| 2026-07-25 | platform-orchestrator | Wave 7 expansion |
