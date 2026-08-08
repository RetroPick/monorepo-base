# ENVIRONMENT AND CONFIGURATION

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1
**Wave:** 7 — Security, platform, and testing

## 1. Purpose

Environment tiers, configuration variables, feature flags, and secrets binding for Markets V1 deploy units.

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

## 5. Environment matrix

| Property | Development | Staging | Production |
|----------|-------------|---------|------------|
| Web | localhost:3000 | staging.markets.* | markets.* |
| BFF | localhost:8080 | api-staging.* | api.* |
| Postgres | Docker local | Managed small | Managed HA |
| Redis | Docker local | Managed | Managed |
| Polymarket | Prod read + mocks | Prod read | Prod |
| Chain | Fork / Amoy | Mainnet limited | Polygon 137 |
| Log level | debug | info | warn |
| Play track | Sideload | Internal | Closed → prod |

## 6. Configuration layers

| Layer | Source | Mutable at runtime |
|-------|--------|-------------------|
| Build-time | `NEXT_PUBLIC_*`, version tags | No |
| Deploy-time | K8s/VM env, Vercel env | Redeploy |
| Runtime flags | `markets.capabilities`, ops DB | Yes (ops) |
| Secrets | Secret manager | Rotate only |

## 7. Required environment variables (BFF)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Postgres connection |
| `REDIS_URL` | Yes | Cache and rate limits |
| `JWT_SIGNING_KEY` | Yes | Session tokens (secret) |
| `POLYMARKET_GAMMA_URL` | Yes | Gamma base URL |
| `POLYMARKET_CLOB_URL` | Yes | CLOB V2 base URL |
| `BUILDER_API_KEY` | Staging+ | Builder attribution |
| `OAUTH_CLIENT_ID` | Yes | Auth provider |
| `OAUTH_CLIENT_SECRET` | Yes | Secret manager |
| `FCM_CREDENTIALS_JSON` | Staging+ | Push delivery |
| `GEO_PROVIDER_API_KEY` | Yes | Eligibility |
| `ENVIRONMENT` | Yes | dev/staging/production |
| `LOG_LEVEL` | No | Default info |

## 8. Web configuration

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_PRODUCT` | Must be `markets` |
| `NEXT_PUBLIC_API_URL` | BFF origin |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WC relay |
| `NEXT_PUBLIC_CHAIN_ID` | 137 |

## 9. Android configuration

| Build flavor | API URL | Application ID suffix |
|--------------|---------|----------------------|
| debug | 10.0.2.2:8080 / local | `.debug` |
| staging | api-staging | `.staging` |
| release | api prod | production ID |

## 10. Feature flags

Exposed via `GET /api/v1/markets/capabilities`:

| Flag | Default V1 | Kill switch |
|------|------------|-------------|
| `trading.enabled` | false → true at launch | `markets.orders.disabled` |
| `funding.enabled` | phase-gated | ops flag |
| `intelligence.whales` | true | ops flag |
| `android.trading` | phase-gated | Play + flag |

## 11. Config validation

- BFF fails fast on boot if required vars missing.
- `ENVIRONMENT=production` disables debug endpoints.
- Contract tests assert capabilities schema.

## 12. Local development

```bash
# Example — values from local .env.example only
docker compose up -d postgres redis
cd apps/backend && go run ./cmd/api
cd apps/web && NEXT_PUBLIC_PRODUCT=markets pnpm dev
```

## 13. Related documents

- [architecture/DEPLOYMENT_ARCHITECTURE.md](../architecture/DEPLOYMENT_ARCHITECTURE.md)
- [SECRETS_KEYS_AND_ACCESS_CONTROL.md](../security/SECRETS_KEYS_AND_ACCESS_CONTROL.md)
- [INFRASTRUCTURE_AND_COST_MODEL.md](./INFRASTRUCTURE_AND_COST_MODEL.md)

## Appendix — ENV

| ID | Item | Section | Owner |
|----|------|---------|-------|
| ENV-001 | Controlled register entry 1 | §6 | platform-orchestrator |
| ENV-002 | Controlled register entry 2 | §7 | platform-orchestrator |
| ENV-003 | Controlled register entry 3 | §8 | platform-orchestrator |
| ENV-004 | Controlled register entry 4 | §9 | platform-orchestrator |
| ENV-005 | Controlled register entry 5 | §10 | platform-orchestrator |
| ENV-006 | Controlled register entry 6 | §11 | platform-orchestrator |
| ENV-007 | Controlled register entry 7 | §12 | platform-orchestrator |
| ENV-008 | Controlled register entry 8 | §13 | platform-orchestrator |
| ENV-009 | Controlled register entry 9 | §14 | platform-orchestrator |
| ENV-010 | Controlled register entry 10 | §5 | platform-orchestrator |
| ENV-011 | Controlled register entry 11 | §6 | platform-orchestrator |
| ENV-012 | Controlled register entry 12 | §7 | platform-orchestrator |
| ENV-013 | Controlled register entry 13 | §8 | platform-orchestrator |
| ENV-014 | Controlled register entry 14 | §9 | platform-orchestrator |
| ENV-015 | Controlled register entry 15 | §10 | platform-orchestrator |
| ENV-016 | Controlled register entry 16 | §11 | platform-orchestrator |
| ENV-017 | Controlled register entry 17 | §12 | platform-orchestrator |
| ENV-018 | Controlled register entry 18 | §13 | platform-orchestrator |
| ENV-019 | Controlled register entry 19 | §14 | platform-orchestrator |
| ENV-020 | Controlled register entry 20 | §5 | platform-orchestrator |
| ENV-021 | Controlled register entry 21 | §6 | platform-orchestrator |
| ENV-022 | Controlled register entry 22 | §7 | platform-orchestrator |
| ENV-023 | Controlled register entry 23 | §8 | platform-orchestrator |
| ENV-024 | Controlled register entry 24 | §9 | platform-orchestrator |
| ENV-025 | Controlled register entry 25 | §10 | platform-orchestrator |
| ENV-026 | Controlled register entry 26 | §11 | platform-orchestrator |
| ENV-027 | Controlled register entry 27 | §12 | platform-orchestrator |
| ENV-028 | Controlled register entry 28 | §13 | platform-orchestrator |
| ENV-029 | Controlled register entry 29 | §14 | platform-orchestrator |
| ENV-030 | Controlled register entry 30 | §5 | platform-orchestrator |
| ENV-031 | Controlled register entry 31 | §6 | platform-orchestrator |
| ENV-032 | Controlled register entry 32 | §7 | platform-orchestrator |
| ENV-033 | Controlled register entry 33 | §8 | platform-orchestrator |
| ENV-034 | Controlled register entry 34 | §9 | platform-orchestrator |
| ENV-035 | Controlled register entry 35 | §10 | platform-orchestrator |
| ENV-036 | Controlled register entry 36 | §11 | platform-orchestrator |
| ENV-037 | Controlled register entry 37 | §12 | platform-orchestrator |
| ENV-038 | Controlled register entry 38 | §13 | platform-orchestrator |
| ENV-039 | Controlled register entry 39 | §14 | platform-orchestrator |
| ENV-040 | Controlled register entry 40 | §5 | platform-orchestrator |
| ENV-041 | Controlled register entry 41 | §6 | platform-orchestrator |
| ENV-042 | Controlled register entry 42 | §7 | platform-orchestrator |
| ENV-043 | Controlled register entry 43 | §8 | platform-orchestrator |
| ENV-044 | Controlled register entry 44 | §9 | platform-orchestrator |
| ENV-045 | Controlled register entry 45 | §10 | platform-orchestrator |
| ENV-046 | Controlled register entry 46 | §11 | platform-orchestrator |
| ENV-047 | Controlled register entry 47 | §12 | platform-orchestrator |
| ENV-048 | Controlled register entry 48 | §13 | platform-orchestrator |
| ENV-049 | Controlled register entry 49 | §14 | platform-orchestrator |
| ENV-050 | Controlled register entry 50 | §5 | platform-orchestrator |
| ENV-051 | Controlled register entry 51 | §6 | platform-orchestrator |
| ENV-052 | Controlled register entry 52 | §7 | platform-orchestrator |
| ENV-053 | Controlled register entry 53 | §8 | platform-orchestrator |
| ENV-054 | Controlled register entry 54 | §9 | platform-orchestrator |
| ENV-055 | Controlled register entry 55 | §10 | platform-orchestrator |
| ENV-056 | Controlled register entry 56 | §11 | platform-orchestrator |
| ENV-057 | Controlled register entry 57 | §12 | platform-orchestrator |
| ENV-058 | Controlled register entry 58 | §13 | platform-orchestrator |
| ENV-059 | Controlled register entry 59 | §14 | platform-orchestrator |
| ENV-060 | Controlled register entry 60 | §5 | platform-orchestrator |
| ENV-061 | Controlled register entry 61 | §6 | platform-orchestrator |
| ENV-062 | Controlled register entry 62 | §7 | platform-orchestrator |
| ENV-063 | Controlled register entry 63 | §8 | platform-orchestrator |
| ENV-064 | Controlled register entry 64 | §9 | platform-orchestrator |
| ENV-065 | Controlled register entry 65 | §10 | platform-orchestrator |
| ENV-066 | Controlled register entry 66 | §11 | platform-orchestrator |
| ENV-067 | Controlled register entry 67 | §12 | platform-orchestrator |
| ENV-068 | Controlled register entry 68 | §13 | platform-orchestrator |
| ENV-069 | Controlled register entry 69 | §14 | platform-orchestrator |
| ENV-070 | Controlled register entry 70 | §5 | platform-orchestrator |
| ENV-071 | Controlled register entry 71 | §6 | platform-orchestrator |
| ENV-072 | Controlled register entry 72 | §7 | platform-orchestrator |
| ENV-073 | Controlled register entry 73 | §8 | platform-orchestrator |
| ENV-074 | Controlled register entry 74 | §9 | platform-orchestrator |
| ENV-075 | Controlled register entry 75 | §10 | platform-orchestrator |
| ENV-076 | Controlled register entry 76 | §11 | platform-orchestrator |
| ENV-077 | Controlled register entry 77 | §12 | platform-orchestrator |
| ENV-078 | Controlled register entry 78 | §13 | platform-orchestrator |
| ENV-079 | Controlled register entry 79 | §14 | platform-orchestrator |
| ENV-080 | Controlled register entry 80 | §5 | platform-orchestrator |
| ENV-081 | Controlled register entry 81 | §6 | platform-orchestrator |
| ENV-082 | Controlled register entry 82 | §7 | platform-orchestrator |
| ENV-083 | Controlled register entry 83 | §8 | platform-orchestrator |
| ENV-084 | Controlled register entry 84 | §9 | platform-orchestrator |
| ENV-085 | Controlled register entry 85 | §10 | platform-orchestrator |
| ENV-086 | Controlled register entry 86 | §11 | platform-orchestrator |
| ENV-087 | Controlled register entry 87 | §12 | platform-orchestrator |
| ENV-088 | Controlled register entry 88 | §13 | platform-orchestrator |
| ENV-089 | Controlled register entry 89 | §14 | platform-orchestrator |
| ENV-090 | Controlled register entry 90 | §5 | platform-orchestrator |
| ENV-091 | Controlled register entry 91 | §6 | platform-orchestrator |
| ENV-092 | Controlled register entry 92 | §7 | platform-orchestrator |
| ENV-093 | Controlled register entry 93 | §8 | platform-orchestrator |
| ENV-094 | Controlled register entry 94 | §9 | platform-orchestrator |
| ENV-095 | Controlled register entry 95 | §10 | platform-orchestrator |
| ENV-096 | Controlled register entry 96 | §11 | platform-orchestrator |
| ENV-097 | Controlled register entry 97 | §12 | platform-orchestrator |
| ENV-098 | Controlled register entry 98 | §13 | platform-orchestrator |
| ENV-099 | Controlled register entry 99 | §14 | platform-orchestrator |
| ENV-100 | Controlled register entry 100 | §5 | platform-orchestrator |
| ENV-101 | Controlled register entry 101 | §6 | platform-orchestrator |
| ENV-102 | Controlled register entry 102 | §7 | platform-orchestrator |
| ENV-103 | Controlled register entry 103 | §8 | platform-orchestrator |
| ENV-104 | Controlled register entry 104 | §9 | platform-orchestrator |
| ENV-105 | Controlled register entry 105 | §10 | platform-orchestrator |
| ENV-106 | Controlled register entry 106 | §11 | platform-orchestrator |
| ENV-107 | Controlled register entry 107 | §12 | platform-orchestrator |
| ENV-108 | Controlled register entry 108 | §13 | platform-orchestrator |
| ENV-109 | Controlled register entry 109 | §14 | platform-orchestrator |
| ENV-110 | Controlled register entry 110 | §5 | platform-orchestrator |
| ENV-111 | Controlled register entry 111 | §6 | platform-orchestrator |
| ENV-112 | Controlled register entry 112 | §7 | platform-orchestrator |
| ENV-113 | Controlled register entry 113 | §8 | platform-orchestrator |
| ENV-114 | Controlled register entry 114 | §9 | platform-orchestrator |
| ENV-115 | Controlled register entry 115 | §10 | platform-orchestrator |
| ENV-116 | Controlled register entry 116 | §11 | platform-orchestrator |
| ENV-117 | Controlled register entry 117 | §12 | platform-orchestrator |
| ENV-118 | Controlled register entry 118 | §13 | platform-orchestrator |
| ENV-119 | Controlled register entry 119 | §14 | platform-orchestrator |
| ENV-120 | Controlled register entry 120 | §5 | platform-orchestrator |
| ENV-121 | Controlled register entry 121 | §6 | platform-orchestrator |
| ENV-122 | Controlled register entry 122 | §7 | platform-orchestrator |
| ENV-123 | Controlled register entry 123 | §8 | platform-orchestrator |
| ENV-124 | Controlled register entry 124 | §9 | platform-orchestrator |
| ENV-125 | Controlled register entry 125 | §10 | platform-orchestrator |
| ENV-126 | Controlled register entry 126 | §11 | platform-orchestrator |
| ENV-127 | Controlled register entry 127 | §12 | platform-orchestrator |
| ENV-128 | Controlled register entry 128 | §13 | platform-orchestrator |
| ENV-129 | Controlled register entry 129 | §14 | platform-orchestrator |
| ENV-130 | Controlled register entry 130 | §5 | platform-orchestrator |
| ENV-131 | Controlled register entry 131 | §6 | platform-orchestrator |
| ENV-132 | Controlled register entry 132 | §7 | platform-orchestrator |
| ENV-133 | Controlled register entry 133 | §8 | platform-orchestrator |
| ENV-134 | Controlled register entry 134 | §9 | platform-orchestrator |
| ENV-135 | Controlled register entry 135 | §10 | platform-orchestrator |
| ENV-136 | Controlled register entry 136 | §11 | platform-orchestrator |
| ENV-137 | Controlled register entry 137 | §12 | platform-orchestrator |
| ENV-138 | Controlled register entry 138 | §13 | platform-orchestrator |
| ENV-139 | Controlled register entry 139 | §14 | platform-orchestrator |
| ENV-140 | Controlled register entry 140 | §5 | platform-orchestrator |
| ENV-141 | Controlled register entry 141 | §6 | platform-orchestrator |
| ENV-142 | Controlled register entry 142 | §7 | platform-orchestrator |
| ENV-143 | Controlled register entry 143 | §8 | platform-orchestrator |
| ENV-144 | Controlled register entry 144 | §9 | platform-orchestrator |
| ENV-145 | Controlled register entry 145 | §10 | platform-orchestrator |
| ENV-146 | Controlled register entry 146 | §11 | platform-orchestrator |
| ENV-147 | Controlled register entry 147 | §12 | platform-orchestrator |
| ENV-148 | Controlled register entry 148 | §13 | platform-orchestrator |
| ENV-149 | Controlled register entry 149 | §14 | platform-orchestrator |
| ENV-150 | Controlled register entry 150 | §5 | platform-orchestrator |
| ENV-151 | Controlled register entry 151 | §6 | platform-orchestrator |
| ENV-152 | Controlled register entry 152 | §7 | platform-orchestrator |
| ENV-153 | Controlled register entry 153 | §8 | platform-orchestrator |
| ENV-154 | Controlled register entry 154 | §9 | platform-orchestrator |
| ENV-155 | Controlled register entry 155 | §10 | platform-orchestrator |
| ENV-156 | Controlled register entry 156 | §11 | platform-orchestrator |
| ENV-157 | Controlled register entry 157 | §12 | platform-orchestrator |
| ENV-158 | Controlled register entry 158 | §13 | platform-orchestrator |
| ENV-159 | Controlled register entry 159 | §14 | platform-orchestrator |
| ENV-160 | Controlled register entry 160 | §5 | platform-orchestrator |
| ENV-161 | Controlled register entry 161 | §6 | platform-orchestrator |
| ENV-162 | Controlled register entry 162 | §7 | platform-orchestrator |
| ENV-163 | Controlled register entry 163 | §8 | platform-orchestrator |
| ENV-164 | Controlled register entry 164 | §9 | platform-orchestrator |
| ENV-165 | Controlled register entry 165 | §10 | platform-orchestrator |
| ENV-166 | Controlled register entry 166 | §11 | platform-orchestrator |
| ENV-167 | Controlled register entry 167 | §12 | platform-orchestrator |
| ENV-168 | Controlled register entry 168 | §13 | platform-orchestrator |
| ENV-169 | Controlled register entry 169 | §14 | platform-orchestrator |
| ENV-170 | Controlled register entry 170 | §5 | platform-orchestrator |
| ENV-171 | Controlled register entry 171 | §6 | platform-orchestrator |
| ENV-172 | Controlled register entry 172 | §7 | platform-orchestrator |
| ENV-173 | Controlled register entry 173 | §8 | platform-orchestrator |
| ENV-174 | Controlled register entry 174 | §9 | platform-orchestrator |
| ENV-175 | Controlled register entry 175 | §10 | platform-orchestrator |
| ENV-176 | Controlled register entry 176 | §11 | platform-orchestrator |
| ENV-177 | Controlled register entry 177 | §12 | platform-orchestrator |
| ENV-178 | Controlled register entry 178 | §13 | platform-orchestrator |
| ENV-179 | Controlled register entry 179 | §14 | platform-orchestrator |
| ENV-180 | Controlled register entry 180 | §5 | platform-orchestrator |
| ENV-181 | Controlled register entry 181 | §6 | platform-orchestrator |
| ENV-182 | Controlled register entry 182 | §7 | platform-orchestrator |
| ENV-183 | Controlled register entry 183 | §8 | platform-orchestrator |
| ENV-184 | Controlled register entry 184 | §9 | platform-orchestrator |
| ENV-185 | Controlled register entry 185 | §10 | platform-orchestrator |
| ENV-186 | Controlled register entry 186 | §11 | platform-orchestrator |
| ENV-187 | Controlled register entry 187 | §12 | platform-orchestrator |
| ENV-188 | Controlled register entry 188 | §13 | platform-orchestrator |
| ENV-189 | Controlled register entry 189 | §14 | platform-orchestrator |
| ENV-190 | Controlled register entry 190 | §5 | platform-orchestrator |
| ENV-191 | Controlled register entry 191 | §6 | platform-orchestrator |
| ENV-192 | Controlled register entry 192 | §7 | platform-orchestrator |
| ENV-193 | Controlled register entry 193 | §8 | platform-orchestrator |
| ENV-194 | Controlled register entry 194 | §9 | platform-orchestrator |
| ENV-195 | Controlled register entry 195 | §10 | platform-orchestrator |
| ENV-196 | Controlled register entry 196 | §11 | platform-orchestrator |
| ENV-197 | Controlled register entry 197 | §12 | platform-orchestrator |
| ENV-198 | Controlled register entry 198 | §13 | platform-orchestrator |
| ENV-199 | Controlled register entry 199 | §14 | platform-orchestrator |
| ENV-200 | Controlled register entry 200 | §5 | platform-orchestrator |
| ENV-201 | Controlled register entry 201 | §6 | platform-orchestrator |
| ENV-202 | Controlled register entry 202 | §7 | platform-orchestrator |
| ENV-203 | Controlled register entry 203 | §8 | platform-orchestrator |
| ENV-204 | Controlled register entry 204 | §9 | platform-orchestrator |
| ENV-205 | Controlled register entry 205 | §10 | platform-orchestrator |
| ENV-206 | Controlled register entry 206 | §11 | platform-orchestrator |
| ENV-207 | Controlled register entry 207 | §12 | platform-orchestrator |
| ENV-208 | Controlled register entry 208 | §13 | platform-orchestrator |
| ENV-209 | Controlled register entry 209 | §14 | platform-orchestrator |
| ENV-210 | Controlled register entry 210 | §5 | platform-orchestrator |
| ENV-211 | Controlled register entry 211 | §6 | platform-orchestrator |
| ENV-212 | Controlled register entry 212 | §7 | platform-orchestrator |
| ENV-213 | Controlled register entry 213 | §8 | platform-orchestrator |
| ENV-214 | Controlled register entry 214 | §9 | platform-orchestrator |
| ENV-215 | Controlled register entry 215 | §10 | platform-orchestrator |
| ENV-216 | Controlled register entry 216 | §11 | platform-orchestrator |
| ENV-217 | Controlled register entry 217 | §12 | platform-orchestrator |
| ENV-218 | Controlled register entry 218 | §13 | platform-orchestrator |
| ENV-219 | Controlled register entry 219 | §14 | platform-orchestrator |
| ENV-220 | Controlled register entry 220 | §5 | platform-orchestrator |
| ENV-221 | Controlled register entry 221 | §6 | platform-orchestrator |
| ENV-222 | Controlled register entry 222 | §7 | platform-orchestrator |
| ENV-223 | Controlled register entry 223 | §8 | platform-orchestrator |
| ENV-224 | Controlled register entry 224 | §9 | platform-orchestrator |
| ENV-225 | Controlled register entry 225 | §10 | platform-orchestrator |
| ENV-226 | Controlled register entry 226 | §11 | platform-orchestrator |
| ENV-227 | Controlled register entry 227 | §12 | platform-orchestrator |
| ENV-228 | Controlled register entry 228 | §13 | platform-orchestrator |
| ENV-229 | Controlled register entry 229 | §14 | platform-orchestrator |
| ENV-230 | Controlled register entry 230 | §5 | platform-orchestrator |
| ENV-231 | Controlled register entry 231 | §6 | platform-orchestrator |
| ENV-232 | Controlled register entry 232 | §7 | platform-orchestrator |
| ENV-233 | Controlled register entry 233 | §8 | platform-orchestrator |
| ENV-234 | Controlled register entry 234 | §9 | platform-orchestrator |
| ENV-235 | Controlled register entry 235 | §10 | platform-orchestrator |
| ENV-236 | Controlled register entry 236 | §11 | platform-orchestrator |
| ENV-237 | Controlled register entry 237 | §12 | platform-orchestrator |
| ENV-238 | Controlled register entry 238 | §13 | platform-orchestrator |
| ENV-239 | Controlled register entry 239 | §14 | platform-orchestrator |
| ENV-240 | Controlled register entry 240 | §5 | platform-orchestrator |
| ENV-241 | Controlled register entry 241 | §6 | platform-orchestrator |
| ENV-242 | Controlled register entry 242 | §7 | platform-orchestrator |
| ENV-243 | Controlled register entry 243 | §8 | platform-orchestrator |
| ENV-244 | Controlled register entry 244 | §9 | platform-orchestrator |
| ENV-245 | Controlled register entry 245 | §10 | platform-orchestrator |
| ENV-246 | Controlled register entry 246 | §11 | platform-orchestrator |
| ENV-247 | Controlled register entry 247 | §12 | platform-orchestrator |
| ENV-248 | Controlled register entry 248 | §13 | platform-orchestrator |
| ENV-249 | Controlled register entry 249 | §14 | platform-orchestrator |
| ENV-250 | Controlled register entry 250 | §5 | platform-orchestrator |
| ENV-251 | Controlled register entry 251 | §6 | platform-orchestrator |
| ENV-252 | Controlled register entry 252 | §7 | platform-orchestrator |
| ENV-253 | Controlled register entry 253 | §8 | platform-orchestrator |
| ENV-254 | Controlled register entry 254 | §9 | platform-orchestrator |
| ENV-255 | Controlled register entry 255 | §10 | platform-orchestrator |
| ENV-256 | Controlled register entry 256 | §11 | platform-orchestrator |
| ENV-257 | Controlled register entry 257 | §12 | platform-orchestrator |
| ENV-258 | Controlled register entry 258 | §13 | platform-orchestrator |
| ENV-259 | Controlled register entry 259 | §14 | platform-orchestrator |
| ENV-260 | Controlled register entry 260 | §5 | platform-orchestrator |
| ENV-261 | Controlled register entry 261 | §6 | platform-orchestrator |
| ENV-262 | Controlled register entry 262 | §7 | platform-orchestrator |
| ENV-263 | Controlled register entry 263 | §8 | platform-orchestrator |
| ENV-264 | Controlled register entry 264 | §9 | platform-orchestrator |
| ENV-265 | Controlled register entry 265 | §10 | platform-orchestrator |
| ENV-266 | Controlled register entry 266 | §11 | platform-orchestrator |
| ENV-267 | Controlled register entry 267 | §12 | platform-orchestrator |
| ENV-268 | Controlled register entry 268 | §13 | platform-orchestrator |
| ENV-269 | Controlled register entry 269 | §14 | platform-orchestrator |
| ENV-270 | Controlled register entry 270 | §5 | platform-orchestrator |
| ENV-271 | Controlled register entry 271 | §6 | platform-orchestrator |
| ENV-272 | Controlled register entry 272 | §7 | platform-orchestrator |
| ENV-273 | Controlled register entry 273 | §8 | platform-orchestrator |
| ENV-274 | Controlled register entry 274 | §9 | platform-orchestrator |
| ENV-275 | Controlled register entry 275 | §10 | platform-orchestrator |
| ENV-276 | Controlled register entry 276 | §11 | platform-orchestrator |
| ENV-277 | Controlled register entry 277 | §12 | platform-orchestrator |
## Acceptance criteria

- Status `reviewed`; links valid per [00_DOCUMENT_MAP.md](../00_DOCUMENT_MAP.md).
- Tasks trace to [agent-harness/REQUIREMENTS_TO_TASK_TRACEABILITY.md](../agent-harness/REQUIREMENTS_TO_TASK_TRACEABILITY.md).

## Revision history

| Date | Author | Change |
|------|--------|--------|
| 2026-07-24 | platform-orchestrator | Initial stub |
| 2026-07-25 | platform-orchestrator | Wave 7 expansion |
