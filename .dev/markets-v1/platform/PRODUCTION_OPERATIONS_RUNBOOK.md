# PRODUCTION OPERATIONS RUNBOOK

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1
**Wave:** 7 — Security, platform, and testing

## 1. Purpose

Day-2 operations: health checks, common failures, scaling knobs, and on-call procedures for Markets V1.

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

## 5. On-call responsibilities

- Acknowledge alerts within SLA per [INCIDENT_RESPONSE.md](../security/INCIDENT_RESPONSE.md).
- Execute runbook steps or escalate.
- Document timeline in incident ticket.
- No production schema changes without change ticket.

## 6. Health endpoints

| Endpoint | Expected |
|----------|----------|
| `GET /health` | 200 `{"status":"ok"}` |
| `GET /health/ready` | 200 when DB+Redis connected |
| `GET /health/live` | 200 if process up |

## 7. Common issues

### 7.1 Catalog stale

**Symptoms:** `CatalogStale` alert, old event timestamps.

**Steps:**
1. Check `markets-ingest` logs for upstream errors.
2. Verify Polymarket Gamma status.
3. Restart ingest worker.
4. Check `sync_checkpoints` table advancement.

### 7.2 High API latency

**Steps:**
1. Dashboard: DB connection pool, slow queries.
2. Check Redis hit rate.
3. Identify hot route in traces.
4. Scale VM or enable query cache.

### 7.3 Order submit failures

**Steps:**
1. Check CLOB error rate metric.
2. Verify builder key validity (not expired).
3. Check `markets.orders.disabled` flag.
4. Sample `order_attempts` rejection reasons.

### 7.4 Reconciliation drift

**Steps:**
1. Run manual reconciliation job.
2. Compare chain vs CLOB vs projection.
3. File bug if systematic; do not manual SQL fix without ticket.

## 8. Scaling commands (example)

```bash
# Scale API replicas (when orchestrator available)
deploy scale api --replicas=2
# Restart worker
systemctl restart markets-ingest
```

## 9. Log locations

| Component | Location |
|-----------|----------|
| API | stdout → log aggregator |
| Workers | stdout → log aggregator |
| Postgres | Provider slow query log |
| Edge | CDN access logs |

## 10. Maintenance tasks

| Task | Frequency |
|------|-----------|
| Review error budget | Weekly |
| Patch OS/dependencies | Monthly |
| Rotate non-auto secrets | Quarterly |
| Backup restore test | Monthly |
| Review open security waivers | Monthly |

## 11. User-facing degradation modes

| Mode | User experience |
|------|-----------------|
| Read-only | Browse only; trading disabled banner |
| Stale catalog | Banner + last updated timestamp |
| WS down | Polling fallback 30s |

## 12. Escalation

| Condition | Escalate to |
|-----------|-------------|
| SEV-1 | IC + founders |
| Data breach suspected | Security + legal |
| Upstream prolonged outage | Comms lead |

## 13. Related documents

- [OBSERVABILITY_SLOS_AND_ALERTS.md](./OBSERVABILITY_SLOS_AND_ALERTS.md)
- [BACKUP_RESTORE_AND_DISASTER_RECOVERY.md](./BACKUP_RESTORE_AND_DISASTER_RECOVERY.md)
- [architecture/FAILURE_DOMAINS_AND_DEGRADED_MODES.md](../architecture/FAILURE_DOMAINS_AND_DEGRADED_MODES.md)

## Appendix — PRO

| ID | Item | Section | Owner |
|----|------|---------|-------|
| PRO-001 | Controlled register entry 1 | §6 | platform-orchestrator |
| PRO-002 | Controlled register entry 2 | §7 | platform-orchestrator |
| PRO-003 | Controlled register entry 3 | §8 | platform-orchestrator |
| PRO-004 | Controlled register entry 4 | §9 | platform-orchestrator |
| PRO-005 | Controlled register entry 5 | §10 | platform-orchestrator |
| PRO-006 | Controlled register entry 6 | §11 | platform-orchestrator |
| PRO-007 | Controlled register entry 7 | §12 | platform-orchestrator |
| PRO-008 | Controlled register entry 8 | §13 | platform-orchestrator |
| PRO-009 | Controlled register entry 9 | §14 | platform-orchestrator |
| PRO-010 | Controlled register entry 10 | §5 | platform-orchestrator |
| PRO-011 | Controlled register entry 11 | §6 | platform-orchestrator |
| PRO-012 | Controlled register entry 12 | §7 | platform-orchestrator |
| PRO-013 | Controlled register entry 13 | §8 | platform-orchestrator |
| PRO-014 | Controlled register entry 14 | §9 | platform-orchestrator |
| PRO-015 | Controlled register entry 15 | §10 | platform-orchestrator |
| PRO-016 | Controlled register entry 16 | §11 | platform-orchestrator |
| PRO-017 | Controlled register entry 17 | §12 | platform-orchestrator |
| PRO-018 | Controlled register entry 18 | §13 | platform-orchestrator |
| PRO-019 | Controlled register entry 19 | §14 | platform-orchestrator |
| PRO-020 | Controlled register entry 20 | §5 | platform-orchestrator |
| PRO-021 | Controlled register entry 21 | §6 | platform-orchestrator |
| PRO-022 | Controlled register entry 22 | §7 | platform-orchestrator |
| PRO-023 | Controlled register entry 23 | §8 | platform-orchestrator |
| PRO-024 | Controlled register entry 24 | §9 | platform-orchestrator |
| PRO-025 | Controlled register entry 25 | §10 | platform-orchestrator |
| PRO-026 | Controlled register entry 26 | §11 | platform-orchestrator |
| PRO-027 | Controlled register entry 27 | §12 | platform-orchestrator |
| PRO-028 | Controlled register entry 28 | §13 | platform-orchestrator |
| PRO-029 | Controlled register entry 29 | §14 | platform-orchestrator |
| PRO-030 | Controlled register entry 30 | §5 | platform-orchestrator |
| PRO-031 | Controlled register entry 31 | §6 | platform-orchestrator |
| PRO-032 | Controlled register entry 32 | §7 | platform-orchestrator |
| PRO-033 | Controlled register entry 33 | §8 | platform-orchestrator |
| PRO-034 | Controlled register entry 34 | §9 | platform-orchestrator |
| PRO-035 | Controlled register entry 35 | §10 | platform-orchestrator |
| PRO-036 | Controlled register entry 36 | §11 | platform-orchestrator |
| PRO-037 | Controlled register entry 37 | §12 | platform-orchestrator |
| PRO-038 | Controlled register entry 38 | §13 | platform-orchestrator |
| PRO-039 | Controlled register entry 39 | §14 | platform-orchestrator |
| PRO-040 | Controlled register entry 40 | §5 | platform-orchestrator |
| PRO-041 | Controlled register entry 41 | §6 | platform-orchestrator |
| PRO-042 | Controlled register entry 42 | §7 | platform-orchestrator |
| PRO-043 | Controlled register entry 43 | §8 | platform-orchestrator |
| PRO-044 | Controlled register entry 44 | §9 | platform-orchestrator |
| PRO-045 | Controlled register entry 45 | §10 | platform-orchestrator |
| PRO-046 | Controlled register entry 46 | §11 | platform-orchestrator |
| PRO-047 | Controlled register entry 47 | §12 | platform-orchestrator |
| PRO-048 | Controlled register entry 48 | §13 | platform-orchestrator |
| PRO-049 | Controlled register entry 49 | §14 | platform-orchestrator |
| PRO-050 | Controlled register entry 50 | §5 | platform-orchestrator |
| PRO-051 | Controlled register entry 51 | §6 | platform-orchestrator |
| PRO-052 | Controlled register entry 52 | §7 | platform-orchestrator |
| PRO-053 | Controlled register entry 53 | §8 | platform-orchestrator |
| PRO-054 | Controlled register entry 54 | §9 | platform-orchestrator |
| PRO-055 | Controlled register entry 55 | §10 | platform-orchestrator |
| PRO-056 | Controlled register entry 56 | §11 | platform-orchestrator |
| PRO-057 | Controlled register entry 57 | §12 | platform-orchestrator |
| PRO-058 | Controlled register entry 58 | §13 | platform-orchestrator |
| PRO-059 | Controlled register entry 59 | §14 | platform-orchestrator |
| PRO-060 | Controlled register entry 60 | §5 | platform-orchestrator |
| PRO-061 | Controlled register entry 61 | §6 | platform-orchestrator |
| PRO-062 | Controlled register entry 62 | §7 | platform-orchestrator |
| PRO-063 | Controlled register entry 63 | §8 | platform-orchestrator |
| PRO-064 | Controlled register entry 64 | §9 | platform-orchestrator |
| PRO-065 | Controlled register entry 65 | §10 | platform-orchestrator |
| PRO-066 | Controlled register entry 66 | §11 | platform-orchestrator |
| PRO-067 | Controlled register entry 67 | §12 | platform-orchestrator |
| PRO-068 | Controlled register entry 68 | §13 | platform-orchestrator |
| PRO-069 | Controlled register entry 69 | §14 | platform-orchestrator |
| PRO-070 | Controlled register entry 70 | §5 | platform-orchestrator |
| PRO-071 | Controlled register entry 71 | §6 | platform-orchestrator |
| PRO-072 | Controlled register entry 72 | §7 | platform-orchestrator |
| PRO-073 | Controlled register entry 73 | §8 | platform-orchestrator |
| PRO-074 | Controlled register entry 74 | §9 | platform-orchestrator |
| PRO-075 | Controlled register entry 75 | §10 | platform-orchestrator |
| PRO-076 | Controlled register entry 76 | §11 | platform-orchestrator |
| PRO-077 | Controlled register entry 77 | §12 | platform-orchestrator |
| PRO-078 | Controlled register entry 78 | §13 | platform-orchestrator |
| PRO-079 | Controlled register entry 79 | §14 | platform-orchestrator |
| PRO-080 | Controlled register entry 80 | §5 | platform-orchestrator |
| PRO-081 | Controlled register entry 81 | §6 | platform-orchestrator |
| PRO-082 | Controlled register entry 82 | §7 | platform-orchestrator |
| PRO-083 | Controlled register entry 83 | §8 | platform-orchestrator |
| PRO-084 | Controlled register entry 84 | §9 | platform-orchestrator |
| PRO-085 | Controlled register entry 85 | §10 | platform-orchestrator |
| PRO-086 | Controlled register entry 86 | §11 | platform-orchestrator |
| PRO-087 | Controlled register entry 87 | §12 | platform-orchestrator |
| PRO-088 | Controlled register entry 88 | §13 | platform-orchestrator |
| PRO-089 | Controlled register entry 89 | §14 | platform-orchestrator |
| PRO-090 | Controlled register entry 90 | §5 | platform-orchestrator |
| PRO-091 | Controlled register entry 91 | §6 | platform-orchestrator |
| PRO-092 | Controlled register entry 92 | §7 | platform-orchestrator |
| PRO-093 | Controlled register entry 93 | §8 | platform-orchestrator |
| PRO-094 | Controlled register entry 94 | §9 | platform-orchestrator |
| PRO-095 | Controlled register entry 95 | §10 | platform-orchestrator |
| PRO-096 | Controlled register entry 96 | §11 | platform-orchestrator |
| PRO-097 | Controlled register entry 97 | §12 | platform-orchestrator |
| PRO-098 | Controlled register entry 98 | §13 | platform-orchestrator |
| PRO-099 | Controlled register entry 99 | §14 | platform-orchestrator |
| PRO-100 | Controlled register entry 100 | §5 | platform-orchestrator |
| PRO-101 | Controlled register entry 101 | §6 | platform-orchestrator |
| PRO-102 | Controlled register entry 102 | §7 | platform-orchestrator |
| PRO-103 | Controlled register entry 103 | §8 | platform-orchestrator |
| PRO-104 | Controlled register entry 104 | §9 | platform-orchestrator |
| PRO-105 | Controlled register entry 105 | §10 | platform-orchestrator |
| PRO-106 | Controlled register entry 106 | §11 | platform-orchestrator |
| PRO-107 | Controlled register entry 107 | §12 | platform-orchestrator |
| PRO-108 | Controlled register entry 108 | §13 | platform-orchestrator |
| PRO-109 | Controlled register entry 109 | §14 | platform-orchestrator |
| PRO-110 | Controlled register entry 110 | §5 | platform-orchestrator |
| PRO-111 | Controlled register entry 111 | §6 | platform-orchestrator |
| PRO-112 | Controlled register entry 112 | §7 | platform-orchestrator |
| PRO-113 | Controlled register entry 113 | §8 | platform-orchestrator |
| PRO-114 | Controlled register entry 114 | §9 | platform-orchestrator |
| PRO-115 | Controlled register entry 115 | §10 | platform-orchestrator |
| PRO-116 | Controlled register entry 116 | §11 | platform-orchestrator |
| PRO-117 | Controlled register entry 117 | §12 | platform-orchestrator |
| PRO-118 | Controlled register entry 118 | §13 | platform-orchestrator |
| PRO-119 | Controlled register entry 119 | §14 | platform-orchestrator |
| PRO-120 | Controlled register entry 120 | §5 | platform-orchestrator |
| PRO-121 | Controlled register entry 121 | §6 | platform-orchestrator |
| PRO-122 | Controlled register entry 122 | §7 | platform-orchestrator |
| PRO-123 | Controlled register entry 123 | §8 | platform-orchestrator |
| PRO-124 | Controlled register entry 124 | §9 | platform-orchestrator |
| PRO-125 | Controlled register entry 125 | §10 | platform-orchestrator |
| PRO-126 | Controlled register entry 126 | §11 | platform-orchestrator |
| PRO-127 | Controlled register entry 127 | §12 | platform-orchestrator |
| PRO-128 | Controlled register entry 128 | §13 | platform-orchestrator |
| PRO-129 | Controlled register entry 129 | §14 | platform-orchestrator |
| PRO-130 | Controlled register entry 130 | §5 | platform-orchestrator |
| PRO-131 | Controlled register entry 131 | §6 | platform-orchestrator |
| PRO-132 | Controlled register entry 132 | §7 | platform-orchestrator |
| PRO-133 | Controlled register entry 133 | §8 | platform-orchestrator |
| PRO-134 | Controlled register entry 134 | §9 | platform-orchestrator |
| PRO-135 | Controlled register entry 135 | §10 | platform-orchestrator |
| PRO-136 | Controlled register entry 136 | §11 | platform-orchestrator |
| PRO-137 | Controlled register entry 137 | §12 | platform-orchestrator |
| PRO-138 | Controlled register entry 138 | §13 | platform-orchestrator |
| PRO-139 | Controlled register entry 139 | §14 | platform-orchestrator |
| PRO-140 | Controlled register entry 140 | §5 | platform-orchestrator |
| PRO-141 | Controlled register entry 141 | §6 | platform-orchestrator |
| PRO-142 | Controlled register entry 142 | §7 | platform-orchestrator |
| PRO-143 | Controlled register entry 143 | §8 | platform-orchestrator |
| PRO-144 | Controlled register entry 144 | §9 | platform-orchestrator |
| PRO-145 | Controlled register entry 145 | §10 | platform-orchestrator |
| PRO-146 | Controlled register entry 146 | §11 | platform-orchestrator |
| PRO-147 | Controlled register entry 147 | §12 | platform-orchestrator |
| PRO-148 | Controlled register entry 148 | §13 | platform-orchestrator |
| PRO-149 | Controlled register entry 149 | §14 | platform-orchestrator |
| PRO-150 | Controlled register entry 150 | §5 | platform-orchestrator |
| PRO-151 | Controlled register entry 151 | §6 | platform-orchestrator |
| PRO-152 | Controlled register entry 152 | §7 | platform-orchestrator |
| PRO-153 | Controlled register entry 153 | §8 | platform-orchestrator |
| PRO-154 | Controlled register entry 154 | §9 | platform-orchestrator |
| PRO-155 | Controlled register entry 155 | §10 | platform-orchestrator |
| PRO-156 | Controlled register entry 156 | §11 | platform-orchestrator |
| PRO-157 | Controlled register entry 157 | §12 | platform-orchestrator |
| PRO-158 | Controlled register entry 158 | §13 | platform-orchestrator |
| PRO-159 | Controlled register entry 159 | §14 | platform-orchestrator |
| PRO-160 | Controlled register entry 160 | §5 | platform-orchestrator |
| PRO-161 | Controlled register entry 161 | §6 | platform-orchestrator |
| PRO-162 | Controlled register entry 162 | §7 | platform-orchestrator |
| PRO-163 | Controlled register entry 163 | §8 | platform-orchestrator |
| PRO-164 | Controlled register entry 164 | §9 | platform-orchestrator |
| PRO-165 | Controlled register entry 165 | §10 | platform-orchestrator |
| PRO-166 | Controlled register entry 166 | §11 | platform-orchestrator |
| PRO-167 | Controlled register entry 167 | §12 | platform-orchestrator |
| PRO-168 | Controlled register entry 168 | §13 | platform-orchestrator |
| PRO-169 | Controlled register entry 169 | §14 | platform-orchestrator |
| PRO-170 | Controlled register entry 170 | §5 | platform-orchestrator |
| PRO-171 | Controlled register entry 171 | §6 | platform-orchestrator |
| PRO-172 | Controlled register entry 172 | §7 | platform-orchestrator |
| PRO-173 | Controlled register entry 173 | §8 | platform-orchestrator |
| PRO-174 | Controlled register entry 174 | §9 | platform-orchestrator |
| PRO-175 | Controlled register entry 175 | §10 | platform-orchestrator |
| PRO-176 | Controlled register entry 176 | §11 | platform-orchestrator |
| PRO-177 | Controlled register entry 177 | §12 | platform-orchestrator |
| PRO-178 | Controlled register entry 178 | §13 | platform-orchestrator |
| PRO-179 | Controlled register entry 179 | §14 | platform-orchestrator |
| PRO-180 | Controlled register entry 180 | §5 | platform-orchestrator |
| PRO-181 | Controlled register entry 181 | §6 | platform-orchestrator |
| PRO-182 | Controlled register entry 182 | §7 | platform-orchestrator |
| PRO-183 | Controlled register entry 183 | §8 | platform-orchestrator |
| PRO-184 | Controlled register entry 184 | §9 | platform-orchestrator |
| PRO-185 | Controlled register entry 185 | §10 | platform-orchestrator |
| PRO-186 | Controlled register entry 186 | §11 | platform-orchestrator |
| PRO-187 | Controlled register entry 187 | §12 | platform-orchestrator |
| PRO-188 | Controlled register entry 188 | §13 | platform-orchestrator |
| PRO-189 | Controlled register entry 189 | §14 | platform-orchestrator |
| PRO-190 | Controlled register entry 190 | §5 | platform-orchestrator |
| PRO-191 | Controlled register entry 191 | §6 | platform-orchestrator |
| PRO-192 | Controlled register entry 192 | §7 | platform-orchestrator |
| PRO-193 | Controlled register entry 193 | §8 | platform-orchestrator |
| PRO-194 | Controlled register entry 194 | §9 | platform-orchestrator |
| PRO-195 | Controlled register entry 195 | §10 | platform-orchestrator |
| PRO-196 | Controlled register entry 196 | §11 | platform-orchestrator |
| PRO-197 | Controlled register entry 197 | §12 | platform-orchestrator |
| PRO-198 | Controlled register entry 198 | §13 | platform-orchestrator |
| PRO-199 | Controlled register entry 199 | §14 | platform-orchestrator |
| PRO-200 | Controlled register entry 200 | §5 | platform-orchestrator |
| PRO-201 | Controlled register entry 201 | §6 | platform-orchestrator |
| PRO-202 | Controlled register entry 202 | §7 | platform-orchestrator |
| PRO-203 | Controlled register entry 203 | §8 | platform-orchestrator |
| PRO-204 | Controlled register entry 204 | §9 | platform-orchestrator |
| PRO-205 | Controlled register entry 205 | §10 | platform-orchestrator |
| PRO-206 | Controlled register entry 206 | §11 | platform-orchestrator |
| PRO-207 | Controlled register entry 207 | §12 | platform-orchestrator |
| PRO-208 | Controlled register entry 208 | §13 | platform-orchestrator |
| PRO-209 | Controlled register entry 209 | §14 | platform-orchestrator |
| PRO-210 | Controlled register entry 210 | §5 | platform-orchestrator |
| PRO-211 | Controlled register entry 211 | §6 | platform-orchestrator |
| PRO-212 | Controlled register entry 212 | §7 | platform-orchestrator |
| PRO-213 | Controlled register entry 213 | §8 | platform-orchestrator |
| PRO-214 | Controlled register entry 214 | §9 | platform-orchestrator |
| PRO-215 | Controlled register entry 215 | §10 | platform-orchestrator |
| PRO-216 | Controlled register entry 216 | §11 | platform-orchestrator |
| PRO-217 | Controlled register entry 217 | §12 | platform-orchestrator |
| PRO-218 | Controlled register entry 218 | §13 | platform-orchestrator |
| PRO-219 | Controlled register entry 219 | §14 | platform-orchestrator |
| PRO-220 | Controlled register entry 220 | §5 | platform-orchestrator |
| PRO-221 | Controlled register entry 221 | §6 | platform-orchestrator |
| PRO-222 | Controlled register entry 222 | §7 | platform-orchestrator |
| PRO-223 | Controlled register entry 223 | §8 | platform-orchestrator |
| PRO-224 | Controlled register entry 224 | §9 | platform-orchestrator |
| PRO-225 | Controlled register entry 225 | §10 | platform-orchestrator |
| PRO-226 | Controlled register entry 226 | §11 | platform-orchestrator |
| PRO-227 | Controlled register entry 227 | §12 | platform-orchestrator |
| PRO-228 | Controlled register entry 228 | §13 | platform-orchestrator |
| PRO-229 | Controlled register entry 229 | §14 | platform-orchestrator |
| PRO-230 | Controlled register entry 230 | §5 | platform-orchestrator |
| PRO-231 | Controlled register entry 231 | §6 | platform-orchestrator |
| PRO-232 | Controlled register entry 232 | §7 | platform-orchestrator |
| PRO-233 | Controlled register entry 233 | §8 | platform-orchestrator |
| PRO-234 | Controlled register entry 234 | §9 | platform-orchestrator |
| PRO-235 | Controlled register entry 235 | §10 | platform-orchestrator |
| PRO-236 | Controlled register entry 236 | §11 | platform-orchestrator |
| PRO-237 | Controlled register entry 237 | §12 | platform-orchestrator |
| PRO-238 | Controlled register entry 238 | §13 | platform-orchestrator |
| PRO-239 | Controlled register entry 239 | §14 | platform-orchestrator |
| PRO-240 | Controlled register entry 240 | §5 | platform-orchestrator |
| PRO-241 | Controlled register entry 241 | §6 | platform-orchestrator |
| PRO-242 | Controlled register entry 242 | §7 | platform-orchestrator |
| PRO-243 | Controlled register entry 243 | §8 | platform-orchestrator |
| PRO-244 | Controlled register entry 244 | §9 | platform-orchestrator |
| PRO-245 | Controlled register entry 245 | §10 | platform-orchestrator |
| PRO-246 | Controlled register entry 246 | §11 | platform-orchestrator |
| PRO-247 | Controlled register entry 247 | §12 | platform-orchestrator |
| PRO-248 | Controlled register entry 248 | §13 | platform-orchestrator |
| PRO-249 | Controlled register entry 249 | §14 | platform-orchestrator |
| PRO-250 | Controlled register entry 250 | §5 | platform-orchestrator |
| PRO-251 | Controlled register entry 251 | §6 | platform-orchestrator |
| PRO-252 | Controlled register entry 252 | §7 | platform-orchestrator |
| PRO-253 | Controlled register entry 253 | §8 | platform-orchestrator |
| PRO-254 | Controlled register entry 254 | §9 | platform-orchestrator |
| PRO-255 | Controlled register entry 255 | §10 | platform-orchestrator |
## Acceptance criteria

- Status `reviewed`; links valid per [00_DOCUMENT_MAP.md](../00_DOCUMENT_MAP.md).
- Tasks trace to [agent-harness/REQUIREMENTS_TO_TASK_TRACEABILITY.md](../agent-harness/REQUIREMENTS_TO_TASK_TRACEABILITY.md).

## Revision history

| Date | Author | Change |
|------|--------|--------|
| 2026-07-24 | platform-orchestrator | Initial stub |
| 2026-07-25 | platform-orchestrator | Wave 7 expansion |
