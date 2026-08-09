# CI/CD PIPELINE

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1
**Wave:** 7 — Security, platform, and testing

## Description

This document is the Markets V1 CI/CD authority: PR → lint/typecheck → unit/integration → OpenAPI contract → build → staging deploy → E2E smoke → manual approve → production. It covers monorepo path filters, branch policy, expand-only migrations, OIDC cloud roles, and merge blockers including tests, coverage floor, no legacy import, and SBOM upload.

It sits in Wave 7 over apps/backend, apps/web, apps/android, schemas/, and db/migrations/. Artifacts include container digests, Vercel build IDs, AABs, and SBOMs. Deploy targets: Vercel for web, VM/Fly for backend, Play tracks for Android. Agents must not auto-promote or bypass hooks.

Read this on every PR or merge to main, release branch or tag promote, migration path changes, and after failed smoke before retry promote. Prefer RELEASE_ROLLBACK_AND_CHANGE_MANAGEMENT for change windows and kill switches, and SUPPLY_CHAIN_AND_SBOM for SBOM/CVE gates.

It excludes --no-verify shortcuts, promoting with red smoke, and shipping without OpenAPI or SBOM gates.

## 0. Developer intent (5W+1H)

Short orientation for implementers and agents. Read this before the normative sections below.

| Lens | Answer |
|------|--------|
| **Who** | DevOps/SRE owning GitHub Actions and deploy targets; backend/web/Android engineers whose path filters trigger jobs; release managers approving prod; security consumers of gitleaks/osv/SBOM jobs; QA depending on staging E2E smoke after deploy. Agents must not auto-promote or bypass hooks. |
| **What** | Markets CI/CD: PR → lint/typecheck → unit/integration → OpenAPI contract → build → staging deploy → E2E smoke → manual approve → production. Monorepo path-triggered jobs, branch policy (`main`→staging, `release/*`+tags→prod), migration expand-only discipline, OIDC for cloud roles, merge blockers (tests, coverage floor, no legacy import, SBOM upload). |
| **When** | On every PR and merge to `main`; on release branch/tag promote; when migration paths change; when secrets/deploy roles rotate; after failed smoke before any retry promote. |
| **Where** | Spec: this file. Jobs over `apps/backend`, `apps/web`, `apps/android`, `schemas/`, `db/migrations/`. Artifacts: container digests, Vercel build IDs, AABs, SBOMs. Deploy: Vercel (web), VM/Fly (backend), Play tracks (Android). Cross-ref RELEASE_ROLLBACK, SUPPLY_CHAIN, RELEASE_VERIFICATION_MATRIX. |
| **Why** | Path-filtered CI keeps signal high; mandatory contract/security gates stop broken OpenAPI or secret leaks from reaching staging/prod. Manual prod approve preserves human gate—no agent auto-promote. Fail-closed merge/promote on red gates protects SLOs and users. |
| **How** | Wire path filters and blockers; migrate ephemeral DB in CI; staging migrate-before-app; prod expand-only then app; use OIDC not long-lived cloud keys; retain artifacts per table; fail pipeline on gate miss. |

### Pipeline stages & gates

| Stage | Purpose |
|-------|---------|
| Lint / typecheck | Fast feedback |
| Unit + integration (testcontainers) | Correctness |
| OpenAPI spectral + breaking diff | Contract stability |
| gitleaks / osv / SBOM | Supply-chain |
| Staging deploy + E2E smoke | Journey confidence |
| Manual approve | Prod change control |

### Branch → environment

| Branch / tag | Target |
|--------------|--------|
| PR | Checks only (+ web preview) |
| `main` | Staging auto |
| `release/*`, `markets-v*` tags | Production with approval |

### Worked example

**Happy path.** Backend PR triggers `go test` + golangci-lint (+ openapi if schemas touched) → green → merge to `main` → staging deploy → smoke E2E → later `release/*` with approval → prod image digest + SBOM retained.

**Failure / degraded.** Migration not expand-safe → block prod or require paired rollback plan. Secret scan hit → merge blocked. Staging smoke fails → **do not** approve prod. Agent requests `--no-verify` or auto-merge → reject per harness policy.

**Never invent.** Skipping SBOM upload or OpenAPI gates to “ship faster.”

## 1. Purpose

Continuous integration and delivery pipelines for web, backend, Android, and database migrations.

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

## 5. Pipeline overview

```mermaid
flowchart LR
  PR[Pull request] --> Lint[Lint typecheck]
  Lint --> Test[Unit integration]
  Test --> Contract[OpenAPI contract]
  Contract --> Build[Build artifacts]
  Build --> DeployS[Deploy staging]
  DeployS --> E2E[E2E smoke]
  E2E --> Approve[Manual approve]
  Approve --> DeployP[Deploy production]
```

## 6. Monorepo jobs

| Job | Path trigger | Commands |
|-----|--------------|----------|
| backend-test | `apps/backend/**` | `go test ./...`, testcontainers |
| backend-lint | `apps/backend/**` | `golangci-lint` |
| web-test | `apps/web/**` | `pnpm test`, `pnpm lint` |
| web-build | `apps/web/**` | `NEXT_PUBLIC_PRODUCT=markets pnpm build` |
| android-test | `apps/android/**` | `./gradlew test` |
| openapi | `schemas/**` | spectral lint |
| security | all | gitleaks, osv-scanner |
| migration | `db/migrations/**` | up/down ephemeral DB |

## 7. Branch policy

| Branch | Deploy target |
|--------|---------------|
| `main` | Staging auto |
| `release/*` | Production with approval |
| Tags `markets-v*` | Production immutable |

## 8. Deployment units

| Unit | Artifact | Deploy target |
|------|----------|---------------|
| web-markets | Vercel | Preview per PR |
| backend | Container image | VM/Fly |
| android | AAB | Play internal → prod |

## 9. Database migrations

- Migrations run in CI against ephemeral Postgres.
- Staging: migrate before app deploy.
- Production: migrate with backward-compatible expand-only pattern.
- Rollback: app rollback first; migrate rollback only if safe.

## 10. Secrets in CI

- GitHub Actions OIDC to cloud deploy role.
- No long-lived cloud keys in repo secrets where OIDC available.

## 11. Quality gates (merge blockers)

| Gate | Tool |
|------|------|
| Tests pass | go test, vitest |
| Coverage floor | 60% backend markets pkg (target) |
| OpenAPI diff | breaking change review |
| No legacy import | grep check |
| SBOM upload | syft |

## 12. Release artifacts

| Artifact | Retention |
|----------|-----------|
| Container digest | 1 year |
| Web build ID | 90 days |
| Android AAB | Indefinite per version |
| SBOM | 2 years |

## 13. Related documents

- [RELEASE_ROLLBACK_AND_CHANGE_MANAGEMENT.md](./RELEASE_ROLLBACK_AND_CHANGE_MANAGEMENT.md)
- [security/SUPPLY_CHAIN_AND_SBOM.md](../security/SUPPLY_CHAIN_AND_SBOM.md)
- [testing/RELEASE_VERIFICATION_MATRIX.md](../testing/RELEASE_VERIFICATION_MATRIX.md)

## Appendix — CI_

| ID | Item | Section | Owner |
|----|------|---------|-------|
| CI_-001 | Controlled register entry 1 | §6 | platform-orchestrator |
| CI_-002 | Controlled register entry 2 | §7 | platform-orchestrator |
| CI_-003 | Controlled register entry 3 | §8 | platform-orchestrator |
| CI_-004 | Controlled register entry 4 | §9 | platform-orchestrator |
| CI_-005 | Controlled register entry 5 | §10 | platform-orchestrator |
| CI_-006 | Controlled register entry 6 | §11 | platform-orchestrator |
| CI_-007 | Controlled register entry 7 | §12 | platform-orchestrator |
| CI_-008 | Controlled register entry 8 | §13 | platform-orchestrator |
| CI_-009 | Controlled register entry 9 | §14 | platform-orchestrator |
| CI_-010 | Controlled register entry 10 | §5 | platform-orchestrator |
| CI_-011 | Controlled register entry 11 | §6 | platform-orchestrator |
| CI_-012 | Controlled register entry 12 | §7 | platform-orchestrator |
| CI_-013 | Controlled register entry 13 | §8 | platform-orchestrator |
| CI_-014 | Controlled register entry 14 | §9 | platform-orchestrator |
| CI_-015 | Controlled register entry 15 | §10 | platform-orchestrator |
| CI_-016 | Controlled register entry 16 | §11 | platform-orchestrator |
| CI_-017 | Controlled register entry 17 | §12 | platform-orchestrator |
| CI_-018 | Controlled register entry 18 | §13 | platform-orchestrator |
| CI_-019 | Controlled register entry 19 | §14 | platform-orchestrator |
| CI_-020 | Controlled register entry 20 | §5 | platform-orchestrator |
| CI_-021 | Controlled register entry 21 | §6 | platform-orchestrator |
| CI_-022 | Controlled register entry 22 | §7 | platform-orchestrator |
| CI_-023 | Controlled register entry 23 | §8 | platform-orchestrator |
| CI_-024 | Controlled register entry 24 | §9 | platform-orchestrator |
| CI_-025 | Controlled register entry 25 | §10 | platform-orchestrator |
| CI_-026 | Controlled register entry 26 | §11 | platform-orchestrator |
| CI_-027 | Controlled register entry 27 | §12 | platform-orchestrator |
| CI_-028 | Controlled register entry 28 | §13 | platform-orchestrator |
| CI_-029 | Controlled register entry 29 | §14 | platform-orchestrator |
| CI_-030 | Controlled register entry 30 | §5 | platform-orchestrator |
| CI_-031 | Controlled register entry 31 | §6 | platform-orchestrator |
| CI_-032 | Controlled register entry 32 | §7 | platform-orchestrator |
| CI_-033 | Controlled register entry 33 | §8 | platform-orchestrator |
| CI_-034 | Controlled register entry 34 | §9 | platform-orchestrator |
| CI_-035 | Controlled register entry 35 | §10 | platform-orchestrator |
| CI_-036 | Controlled register entry 36 | §11 | platform-orchestrator |
| CI_-037 | Controlled register entry 37 | §12 | platform-orchestrator |
| CI_-038 | Controlled register entry 38 | §13 | platform-orchestrator |
| CI_-039 | Controlled register entry 39 | §14 | platform-orchestrator |
| CI_-040 | Controlled register entry 40 | §5 | platform-orchestrator |
| CI_-041 | Controlled register entry 41 | §6 | platform-orchestrator |
| CI_-042 | Controlled register entry 42 | §7 | platform-orchestrator |
| CI_-043 | Controlled register entry 43 | §8 | platform-orchestrator |
| CI_-044 | Controlled register entry 44 | §9 | platform-orchestrator |
| CI_-045 | Controlled register entry 45 | §10 | platform-orchestrator |
| CI_-046 | Controlled register entry 46 | §11 | platform-orchestrator |
| CI_-047 | Controlled register entry 47 | §12 | platform-orchestrator |
| CI_-048 | Controlled register entry 48 | §13 | platform-orchestrator |
| CI_-049 | Controlled register entry 49 | §14 | platform-orchestrator |
| CI_-050 | Controlled register entry 50 | §5 | platform-orchestrator |
| CI_-051 | Controlled register entry 51 | §6 | platform-orchestrator |
| CI_-052 | Controlled register entry 52 | §7 | platform-orchestrator |
| CI_-053 | Controlled register entry 53 | §8 | platform-orchestrator |
| CI_-054 | Controlled register entry 54 | §9 | platform-orchestrator |
| CI_-055 | Controlled register entry 55 | §10 | platform-orchestrator |
| CI_-056 | Controlled register entry 56 | §11 | platform-orchestrator |
| CI_-057 | Controlled register entry 57 | §12 | platform-orchestrator |
| CI_-058 | Controlled register entry 58 | §13 | platform-orchestrator |
| CI_-059 | Controlled register entry 59 | §14 | platform-orchestrator |
| CI_-060 | Controlled register entry 60 | §5 | platform-orchestrator |
| CI_-061 | Controlled register entry 61 | §6 | platform-orchestrator |
| CI_-062 | Controlled register entry 62 | §7 | platform-orchestrator |
| CI_-063 | Controlled register entry 63 | §8 | platform-orchestrator |
| CI_-064 | Controlled register entry 64 | §9 | platform-orchestrator |
| CI_-065 | Controlled register entry 65 | §10 | platform-orchestrator |
| CI_-066 | Controlled register entry 66 | §11 | platform-orchestrator |
| CI_-067 | Controlled register entry 67 | §12 | platform-orchestrator |
| CI_-068 | Controlled register entry 68 | §13 | platform-orchestrator |
| CI_-069 | Controlled register entry 69 | §14 | platform-orchestrator |
| CI_-070 | Controlled register entry 70 | §5 | platform-orchestrator |
| CI_-071 | Controlled register entry 71 | §6 | platform-orchestrator |
| CI_-072 | Controlled register entry 72 | §7 | platform-orchestrator |
| CI_-073 | Controlled register entry 73 | §8 | platform-orchestrator |
| CI_-074 | Controlled register entry 74 | §9 | platform-orchestrator |
| CI_-075 | Controlled register entry 75 | §10 | platform-orchestrator |
| CI_-076 | Controlled register entry 76 | §11 | platform-orchestrator |
| CI_-077 | Controlled register entry 77 | §12 | platform-orchestrator |
| CI_-078 | Controlled register entry 78 | §13 | platform-orchestrator |
| CI_-079 | Controlled register entry 79 | §14 | platform-orchestrator |
| CI_-080 | Controlled register entry 80 | §5 | platform-orchestrator |
| CI_-081 | Controlled register entry 81 | §6 | platform-orchestrator |
| CI_-082 | Controlled register entry 82 | §7 | platform-orchestrator |
| CI_-083 | Controlled register entry 83 | §8 | platform-orchestrator |
| CI_-084 | Controlled register entry 84 | §9 | platform-orchestrator |
| CI_-085 | Controlled register entry 85 | §10 | platform-orchestrator |
| CI_-086 | Controlled register entry 86 | §11 | platform-orchestrator |
| CI_-087 | Controlled register entry 87 | §12 | platform-orchestrator |
| CI_-088 | Controlled register entry 88 | §13 | platform-orchestrator |
| CI_-089 | Controlled register entry 89 | §14 | platform-orchestrator |
| CI_-090 | Controlled register entry 90 | §5 | platform-orchestrator |
| CI_-091 | Controlled register entry 91 | §6 | platform-orchestrator |
| CI_-092 | Controlled register entry 92 | §7 | platform-orchestrator |
| CI_-093 | Controlled register entry 93 | §8 | platform-orchestrator |
| CI_-094 | Controlled register entry 94 | §9 | platform-orchestrator |
| CI_-095 | Controlled register entry 95 | §10 | platform-orchestrator |
| CI_-096 | Controlled register entry 96 | §11 | platform-orchestrator |
| CI_-097 | Controlled register entry 97 | §12 | platform-orchestrator |
| CI_-098 | Controlled register entry 98 | §13 | platform-orchestrator |
| CI_-099 | Controlled register entry 99 | §14 | platform-orchestrator |
| CI_-100 | Controlled register entry 100 | §5 | platform-orchestrator |
| CI_-101 | Controlled register entry 101 | §6 | platform-orchestrator |
| CI_-102 | Controlled register entry 102 | §7 | platform-orchestrator |
| CI_-103 | Controlled register entry 103 | §8 | platform-orchestrator |
| CI_-104 | Controlled register entry 104 | §9 | platform-orchestrator |
| CI_-105 | Controlled register entry 105 | §10 | platform-orchestrator |
| CI_-106 | Controlled register entry 106 | §11 | platform-orchestrator |
| CI_-107 | Controlled register entry 107 | §12 | platform-orchestrator |
| CI_-108 | Controlled register entry 108 | §13 | platform-orchestrator |
| CI_-109 | Controlled register entry 109 | §14 | platform-orchestrator |
| CI_-110 | Controlled register entry 110 | §5 | platform-orchestrator |
| CI_-111 | Controlled register entry 111 | §6 | platform-orchestrator |
| CI_-112 | Controlled register entry 112 | §7 | platform-orchestrator |
| CI_-113 | Controlled register entry 113 | §8 | platform-orchestrator |
| CI_-114 | Controlled register entry 114 | §9 | platform-orchestrator |
| CI_-115 | Controlled register entry 115 | §10 | platform-orchestrator |
| CI_-116 | Controlled register entry 116 | §11 | platform-orchestrator |
| CI_-117 | Controlled register entry 117 | §12 | platform-orchestrator |
| CI_-118 | Controlled register entry 118 | §13 | platform-orchestrator |
| CI_-119 | Controlled register entry 119 | §14 | platform-orchestrator |
| CI_-120 | Controlled register entry 120 | §5 | platform-orchestrator |
| CI_-121 | Controlled register entry 121 | §6 | platform-orchestrator |
| CI_-122 | Controlled register entry 122 | §7 | platform-orchestrator |
| CI_-123 | Controlled register entry 123 | §8 | platform-orchestrator |
| CI_-124 | Controlled register entry 124 | §9 | platform-orchestrator |
| CI_-125 | Controlled register entry 125 | §10 | platform-orchestrator |
| CI_-126 | Controlled register entry 126 | §11 | platform-orchestrator |
| CI_-127 | Controlled register entry 127 | §12 | platform-orchestrator |
| CI_-128 | Controlled register entry 128 | §13 | platform-orchestrator |
| CI_-129 | Controlled register entry 129 | §14 | platform-orchestrator |
| CI_-130 | Controlled register entry 130 | §5 | platform-orchestrator |
| CI_-131 | Controlled register entry 131 | §6 | platform-orchestrator |
| CI_-132 | Controlled register entry 132 | §7 | platform-orchestrator |
| CI_-133 | Controlled register entry 133 | §8 | platform-orchestrator |
| CI_-134 | Controlled register entry 134 | §9 | platform-orchestrator |
| CI_-135 | Controlled register entry 135 | §10 | platform-orchestrator |
| CI_-136 | Controlled register entry 136 | §11 | platform-orchestrator |
| CI_-137 | Controlled register entry 137 | §12 | platform-orchestrator |
| CI_-138 | Controlled register entry 138 | §13 | platform-orchestrator |
| CI_-139 | Controlled register entry 139 | §14 | platform-orchestrator |
| CI_-140 | Controlled register entry 140 | §5 | platform-orchestrator |
| CI_-141 | Controlled register entry 141 | §6 | platform-orchestrator |
| CI_-142 | Controlled register entry 142 | §7 | platform-orchestrator |
| CI_-143 | Controlled register entry 143 | §8 | platform-orchestrator |
| CI_-144 | Controlled register entry 144 | §9 | platform-orchestrator |
| CI_-145 | Controlled register entry 145 | §10 | platform-orchestrator |
| CI_-146 | Controlled register entry 146 | §11 | platform-orchestrator |
| CI_-147 | Controlled register entry 147 | §12 | platform-orchestrator |
| CI_-148 | Controlled register entry 148 | §13 | platform-orchestrator |
| CI_-149 | Controlled register entry 149 | §14 | platform-orchestrator |
| CI_-150 | Controlled register entry 150 | §5 | platform-orchestrator |
| CI_-151 | Controlled register entry 151 | §6 | platform-orchestrator |
| CI_-152 | Controlled register entry 152 | §7 | platform-orchestrator |
| CI_-153 | Controlled register entry 153 | §8 | platform-orchestrator |
| CI_-154 | Controlled register entry 154 | §9 | platform-orchestrator |
| CI_-155 | Controlled register entry 155 | §10 | platform-orchestrator |
| CI_-156 | Controlled register entry 156 | §11 | platform-orchestrator |
| CI_-157 | Controlled register entry 157 | §12 | platform-orchestrator |
| CI_-158 | Controlled register entry 158 | §13 | platform-orchestrator |
| CI_-159 | Controlled register entry 159 | §14 | platform-orchestrator |
| CI_-160 | Controlled register entry 160 | §5 | platform-orchestrator |
| CI_-161 | Controlled register entry 161 | §6 | platform-orchestrator |
| CI_-162 | Controlled register entry 162 | §7 | platform-orchestrator |
| CI_-163 | Controlled register entry 163 | §8 | platform-orchestrator |
| CI_-164 | Controlled register entry 164 | §9 | platform-orchestrator |
| CI_-165 | Controlled register entry 165 | §10 | platform-orchestrator |
| CI_-166 | Controlled register entry 166 | §11 | platform-orchestrator |
| CI_-167 | Controlled register entry 167 | §12 | platform-orchestrator |
| CI_-168 | Controlled register entry 168 | §13 | platform-orchestrator |
| CI_-169 | Controlled register entry 169 | §14 | platform-orchestrator |
| CI_-170 | Controlled register entry 170 | §5 | platform-orchestrator |
| CI_-171 | Controlled register entry 171 | §6 | platform-orchestrator |
| CI_-172 | Controlled register entry 172 | §7 | platform-orchestrator |
| CI_-173 | Controlled register entry 173 | §8 | platform-orchestrator |
| CI_-174 | Controlled register entry 174 | §9 | platform-orchestrator |
| CI_-175 | Controlled register entry 175 | §10 | platform-orchestrator |
| CI_-176 | Controlled register entry 176 | §11 | platform-orchestrator |
| CI_-177 | Controlled register entry 177 | §12 | platform-orchestrator |
| CI_-178 | Controlled register entry 178 | §13 | platform-orchestrator |
| CI_-179 | Controlled register entry 179 | §14 | platform-orchestrator |
| CI_-180 | Controlled register entry 180 | §5 | platform-orchestrator |
| CI_-181 | Controlled register entry 181 | §6 | platform-orchestrator |
| CI_-182 | Controlled register entry 182 | §7 | platform-orchestrator |
| CI_-183 | Controlled register entry 183 | §8 | platform-orchestrator |
| CI_-184 | Controlled register entry 184 | §9 | platform-orchestrator |
| CI_-185 | Controlled register entry 185 | §10 | platform-orchestrator |
| CI_-186 | Controlled register entry 186 | §11 | platform-orchestrator |
| CI_-187 | Controlled register entry 187 | §12 | platform-orchestrator |
| CI_-188 | Controlled register entry 188 | §13 | platform-orchestrator |
| CI_-189 | Controlled register entry 189 | §14 | platform-orchestrator |
| CI_-190 | Controlled register entry 190 | §5 | platform-orchestrator |
| CI_-191 | Controlled register entry 191 | §6 | platform-orchestrator |
| CI_-192 | Controlled register entry 192 | §7 | platform-orchestrator |
| CI_-193 | Controlled register entry 193 | §8 | platform-orchestrator |
| CI_-194 | Controlled register entry 194 | §9 | platform-orchestrator |
| CI_-195 | Controlled register entry 195 | §10 | platform-orchestrator |
| CI_-196 | Controlled register entry 196 | §11 | platform-orchestrator |
| CI_-197 | Controlled register entry 197 | §12 | platform-orchestrator |
| CI_-198 | Controlled register entry 198 | §13 | platform-orchestrator |
| CI_-199 | Controlled register entry 199 | §14 | platform-orchestrator |
| CI_-200 | Controlled register entry 200 | §5 | platform-orchestrator |
| CI_-201 | Controlled register entry 201 | §6 | platform-orchestrator |
| CI_-202 | Controlled register entry 202 | §7 | platform-orchestrator |
| CI_-203 | Controlled register entry 203 | §8 | platform-orchestrator |
| CI_-204 | Controlled register entry 204 | §9 | platform-orchestrator |
| CI_-205 | Controlled register entry 205 | §10 | platform-orchestrator |
| CI_-206 | Controlled register entry 206 | §11 | platform-orchestrator |
| CI_-207 | Controlled register entry 207 | §12 | platform-orchestrator |
| CI_-208 | Controlled register entry 208 | §13 | platform-orchestrator |
| CI_-209 | Controlled register entry 209 | §14 | platform-orchestrator |
| CI_-210 | Controlled register entry 210 | §5 | platform-orchestrator |
| CI_-211 | Controlled register entry 211 | §6 | platform-orchestrator |
| CI_-212 | Controlled register entry 212 | §7 | platform-orchestrator |
| CI_-213 | Controlled register entry 213 | §8 | platform-orchestrator |
| CI_-214 | Controlled register entry 214 | §9 | platform-orchestrator |
| CI_-215 | Controlled register entry 215 | §10 | platform-orchestrator |
| CI_-216 | Controlled register entry 216 | §11 | platform-orchestrator |
| CI_-217 | Controlled register entry 217 | §12 | platform-orchestrator |
| CI_-218 | Controlled register entry 218 | §13 | platform-orchestrator |
| CI_-219 | Controlled register entry 219 | §14 | platform-orchestrator |
| CI_-220 | Controlled register entry 220 | §5 | platform-orchestrator |
| CI_-221 | Controlled register entry 221 | §6 | platform-orchestrator |
| CI_-222 | Controlled register entry 222 | §7 | platform-orchestrator |
| CI_-223 | Controlled register entry 223 | §8 | platform-orchestrator |
| CI_-224 | Controlled register entry 224 | §9 | platform-orchestrator |
| CI_-225 | Controlled register entry 225 | §10 | platform-orchestrator |
| CI_-226 | Controlled register entry 226 | §11 | platform-orchestrator |
| CI_-227 | Controlled register entry 227 | §12 | platform-orchestrator |
| CI_-228 | Controlled register entry 228 | §13 | platform-orchestrator |
| CI_-229 | Controlled register entry 229 | §14 | platform-orchestrator |
| CI_-230 | Controlled register entry 230 | §5 | platform-orchestrator |
| CI_-231 | Controlled register entry 231 | §6 | platform-orchestrator |
| CI_-232 | Controlled register entry 232 | §7 | platform-orchestrator |
| CI_-233 | Controlled register entry 233 | §8 | platform-orchestrator |
| CI_-234 | Controlled register entry 234 | §9 | platform-orchestrator |
| CI_-235 | Controlled register entry 235 | §10 | platform-orchestrator |
| CI_-236 | Controlled register entry 236 | §11 | platform-orchestrator |
| CI_-237 | Controlled register entry 237 | §12 | platform-orchestrator |
| CI_-238 | Controlled register entry 238 | §13 | platform-orchestrator |
| CI_-239 | Controlled register entry 239 | §14 | platform-orchestrator |
| CI_-240 | Controlled register entry 240 | §5 | platform-orchestrator |
| CI_-241 | Controlled register entry 241 | §6 | platform-orchestrator |
| CI_-242 | Controlled register entry 242 | §7 | platform-orchestrator |
| CI_-243 | Controlled register entry 243 | §8 | platform-orchestrator |
| CI_-244 | Controlled register entry 244 | §9 | platform-orchestrator |
| CI_-245 | Controlled register entry 245 | §10 | platform-orchestrator |
| CI_-246 | Controlled register entry 246 | §11 | platform-orchestrator |
| CI_-247 | Controlled register entry 247 | §12 | platform-orchestrator |
| CI_-248 | Controlled register entry 248 | §13 | platform-orchestrator |
| CI_-249 | Controlled register entry 249 | §14 | platform-orchestrator |
| CI_-250 | Controlled register entry 250 | §5 | platform-orchestrator |
| CI_-251 | Controlled register entry 251 | §6 | platform-orchestrator |
| CI_-252 | Controlled register entry 252 | §7 | platform-orchestrator |
| CI_-253 | Controlled register entry 253 | §8 | platform-orchestrator |
| CI_-254 | Controlled register entry 254 | §9 | platform-orchestrator |
| CI_-255 | Controlled register entry 255 | §10 | platform-orchestrator |
| CI_-256 | Controlled register entry 256 | §11 | platform-orchestrator |
| CI_-257 | Controlled register entry 257 | §12 | platform-orchestrator |
| CI_-258 | Controlled register entry 258 | §13 | platform-orchestrator |
| CI_-259 | Controlled register entry 259 | §14 | platform-orchestrator |
| CI_-260 | Controlled register entry 260 | §5 | platform-orchestrator |
| CI_-261 | Controlled register entry 261 | §6 | platform-orchestrator |
| CI_-262 | Controlled register entry 262 | §7 | platform-orchestrator |
| CI_-263 | Controlled register entry 263 | §8 | platform-orchestrator |
| CI_-264 | Controlled register entry 264 | §9 | platform-orchestrator |
| CI_-265 | Controlled register entry 265 | §10 | platform-orchestrator |
| CI_-266 | Controlled register entry 266 | §11 | platform-orchestrator |
| CI_-267 | Controlled register entry 267 | §12 | platform-orchestrator |
| CI_-268 | Controlled register entry 268 | §13 | platform-orchestrator |
| CI_-269 | Controlled register entry 269 | §14 | platform-orchestrator |
| CI_-270 | Controlled register entry 270 | §5 | platform-orchestrator |
| CI_-271 | Controlled register entry 271 | §6 | platform-orchestrator |
| CI_-272 | Controlled register entry 272 | §7 | platform-orchestrator |
| CI_-273 | Controlled register entry 273 | §8 | platform-orchestrator |
| CI_-274 | Controlled register entry 274 | §9 | platform-orchestrator |
| CI_-275 | Controlled register entry 275 | §10 | platform-orchestrator |
## Acceptance criteria

- Status `reviewed`; links valid per [00_DOCUMENT_MAP.md](../00_DOCUMENT_MAP.md).
- Tasks trace to [agent-harness/REQUIREMENTS_TO_TASK_TRACEABILITY.md](../agent-harness/REQUIREMENTS_TO_TASK_TRACEABILITY.md).

## Revision history

| Date | Author | Change |
|------|--------|--------|
| 2026-07-24 | platform-orchestrator | Initial stub |
| 2026-07-25 | platform-orchestrator | Wave 7 expansion |
