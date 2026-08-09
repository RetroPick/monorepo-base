# Open Source Reference Audit

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1

## Description

This Wave 0 OSS reference audit gates third-party repository reuse for Markets V1 per ADR-007: adoption modes (`official_dependency`, `selective_port`, `clean_room_reimplementation`, `behavioral_reference_only`, `reject`) for Polymarket official and community repos. Machine-readable registry: [open-source-provenance.yaml](open-source-provenance.yaml).

No-LICENSE repos forbid code/layout/string/asset copy; blind forks import key-custody or geoblock-bypass patterns. Prefer official MIT SDKs as tooling references; Go CLOB path is clean-room/behavioral vs TypeScript clients. RetroPick implementations land in monorepo modules — not as git submodules of reference apps.

Choose mode from the table → follow ADR-007 → pin SHA + NOTICE when selective_port → clean-room rewrite when no LICENSE → reject prohibited patterns. Update YAML provenance and SBOM paths when real dependencies enter.

## 0. Developer intent (5W+1H)

Short orientation for implementers and agents. Read this before adoption-mode and repository audit tables below.

The 5W+1H table below is a **navigation aid** only. Machine-readable registry: [open-source-provenance.yaml](open-source-provenance.yaml). ADR-007 is normative for clean-room vs dependency choices.

| Lens | Answer |
|------|--------|
| **Who** | Agents tempted to vendor GitHub “reference” apps; security/supply-chain reviewers; intelligence implementers choosing whale/alert heuristics; Android agents studying Compose UX references. |
| **What** | Wave 0 OSS reference audit: adoption modes (`official_dependency`, `selective_port`, `clean_room_reimplementation`, `behavioral_reference_only`, `reject`) for Polymarket official and community repos (Viewer, Alerts, whales, Oracle3, ts-sdk, clob-client-v2, etc.). States no third-party product source is vendored into `apps/`/`packages/` beyond placeholder types at audit date. |
| **When** | Before any copy/port/import from external repos; when adding intelligence algorithms inspired by community tools; at license re-check when pinning commit SHAs on first import. |
| **Where** | This audit + YAML provenance + [ADR-007](../architecture/adr/ADR-007-OSS-ADOPTION-AND-CLEAN-ROOM.md) + [security/SUPPLY_CHAIN_AND_SBOM.md](../security/SUPPLY_CHAIN_AND_SBOM.md). RetroPick implementations land in `internal/markets/intelligence/`, `apps/android/`, etc. — not as git submodules of no-LICENSE apps. |
| **Why** | No-LICENSE repos (PolymarketViewer, PolymarketAlerts) forbid code/layout/string/asset copy. Blind forks import key-custody or geoblock-bypass patterns. The audit makes reject/clean-room explicit before monorepo contamination. |
| **How** | Choose mode from the table → follow ADR-007 → pin SHA + NOTICE when selective_port → clean-room rewrite for no LICENSE → reject prohibited patterns. Prefer official MIT SDKs as tooling references; Go CLOB path is clean-room/behavioral vs TypeScript clients. |

### Worked example

**Happy path — whale thresholds**

1. `al1enjesus/polymarket-whales` is MIT → selective_port after security scan.
2. Reimplement WhaleScore-style pipeline in Go under intelligence module; keep attribution/NOTICE if snippets used.
3. Reject any geoblock-bypass commentary from references.

**Happy path — Android discovery UX**

1. PolymarketViewer has **No LICENSE** → clean-room only.
2. Recreate patterns inside modular Compose graph; no copied XML/Compose files or assets.

**Failure / Never**

- Vendoring Streamatico/Syavaman trees into `apps/`.
- Pixel-for-pixel Polymarket UI clone.
- Adopting reference code that custodies keys or bypasses geo restrictions.
- Treating Oracle3 as a V1 dependency (Post-V1 behavioral reference).

**Agent checklist**

- [ ] Repo listed with adoption mode?
- [ ] LICENSE verified at import time?
- [ ] Clean-room vs port decision explicit in PR?
- [ ] YAML provenance updated?
- [ ] SBOM path known for real dependencies?

**Reading tip:** Adoption modes (§6.1) are the gate; per-repo subsections are evidence — do not “just submodule it.”

## 1. Purpose

Gate third-party repository reuse for Markets V1 per ADR-007 and master prompt §2.3. Defines adoption mode, license posture, and explicit rejections before any code enters the monorepo.

Machine-readable registry: [open-source-provenance.yaml](open-source-provenance.yaml).

## 2. Scope

### In scope

- Polymarket official repos, community reference repos, and intelligence/analytics inspirations listed in master prompt §2.3.

### Out of scope

- npm/cargo crates resolved via normal package managers (separate SBOM process).
- PRISM contract repos.

## 3. Prerequisites

- [ADR-007-OSS-ADOPTION-AND-CLEAN-ROOM.md](../architecture/adr/ADR-007-OSS-ADOPTION-AND-CLEAN-ROOM.md)
- [security/SUPPLY_CHAIN_AND_SBOM.md](../security/SUPPLY_CHAIN_AND_SBOM.md)

## 4. Authoritative sources

| Repository | License (audit date) | Adoption mode |
|------------|---------------------|---------------|
| Polymarket/ts-sdk | MIT | official_dependency (tooling) |
| Polymarket/clob-client-v2 | MIT | behavioral_reference_only → Go clean-room |
| Streamatico/PolymarketViewer | **No LICENSE** | clean_room_reimplementation |
| Syavaman/PolymarketAlerts | **No LICENSE** | clean_room_reimplementation |
| al1enjesus/polymarket-whales | MIT | selective_port (after review) |
| YichengYang-Ethan/oracle3 | Apache-2.0 | behavioral_reference_only (Phase 8) |

Full list in YAML.

## 5. Current state

Wave 0 audit complete. **No third-party product source code** is vendored into `apps/` or `packages/` beyond placeholder `@retropick/polymarket` types. License verification used GitHub LICENSE file presence on 2026-07-25; commit SHAs will be pinned at first import.

## 6. Target design

### 6.1 Adoption modes (allowed)

1. `official_dependency` — Polymarket official SDK/ABI with verified license.
2. `selective_port` — MIT algorithm port with review (polymarket-whales).
3. `clean_room_reimplementation` — No LICENSE repos; study behavior, rewrite.
4. `behavioral_reference_only` — UX/heuristic inspiration; no code copy.
5. `reject` — Prohibited patterns (key custody, geoblock bypass).

### 6.2 Primary audited repositories

#### PolymarketViewer (Streamatico) — **No LICENSE**

| Field | Value |
|-------|-------|
| URL | https://github.com/Streamatico/PolymarketViewer |
| Value | Native Compose discovery, charts, watchlist, comments, profiles, Glance widgets |
| Decision | **Clean-room reimplementation** only |
| Rationale | Absence of LICENSE file prohibits copying code, layouts, strings, or assets |
| RetroPick action | Recreate patterns inside `apps/android/` modular graph per ANDROID_MARKETS.md |

#### PolymarketAlerts (Syavaman) — **No LICENSE**

| Field | Value |
|-------|-------|
| URL | https://github.com/Syavaman/PolymarketAlerts |
| Value | Large-trade alerts, wallet profiles, watchlists, Telegram/push, rule settings |
| Decision | **Clean-room reimplementation** in shared signal engine (ADR-008) |
| Rationale | No LICENSE; alert delivery must use RetroPick notification architecture |
| RetroPick action | Implement rule DSL in Go; no fork of Python/Node reference code |

#### polymarket-whales (al1enjesus) — **MIT**

| Field | Value |
|-------|-------|
| URL | https://github.com/al1enjesus/polymarket-whales |
| Value | Threshold detection, deduplication, Telegram/Discord, export |
| Decision | **Selective port** after security + license scan |
| Rationale | MIT permits algorithm reuse with attribution; reject any geoblock-bypass docs |
| RetroPick action | Reimplement WhaleScore pipeline in Go; preserve MIT NOTICE if snippets used |

#### Oracle3 (YichengYang-Ethan) — **Apache-2.0**

| Field | Value |
|-------|-------|
| URL | https://github.com/YichengYang-Ethan/oracle3 |
| Value | Cross-market constraints, discrepancy scanning, equivalence classes |
| Decision | **Behavioral reference for Post-V1** (Phase 8) |
| Rationale | Research-grade; not V1 dependency; Apache-2.0 if code ported later |
| RetroPick action | Document constraint taxonomy in intelligence/; no V1 import |

#### Official ts-sdk — **MIT**

| Field | Value |
|-------|-------|
| URL | https://github.com/Polymarket/ts-sdk |
| Value | Unified CLOB, Gamma, wallet helpers |
| Decision | **official_dependency** for conformance harnesses and `packages/polymarket` dev tooling |
| Rationale | Official; supersedes piecemeal clients for TS-side validation |
| RetroPick action | Pin version in devDependencies; generate golden fixtures |

#### clob-client-v2 — **MIT**

| Field | Value |
|-------|-------|
| URL | https://github.com/Polymarket/clob-client-v2 |
| Value | V2 order construction, L1/L2 auth reference |
| Decision | **behavioral_reference_only** for Go BFF adapter |
| Rationale | Production server is Go; clean-room port of behavior, not TS copy |
| RetroPick action | Golden vectors derived from upstream examples (redacted secrets) |

### 6.3 Explicit rejections

| Pattern | Found in | Action |
|---------|----------|--------|
| Server-side raw private keys | polymarket-cabinet | reject |
| Geoblock/VPN bypass | some whale repos | reject; security review |
| Autonomous copy trading | various | reject per ADR-009 |
| "Insider" wallet labels | whale-tracker repos | reject; use `unusual_activity` |
| V1 multi-venue (pmxt) | pmxt-dev/pmxt | defer Post-V1 |

## 7. Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| Copy PolymarketViewer Compose code | No LICENSE |
| Ignore OSS audit until Phase 5 | Legal/supply-chain risk |
| Import all MIT repos wholesale | Unreviewed dependencies and behaviors |

## 8. Decisions

- Missing LICENSE → clean-room (ADR-007).
- Go owns server intelligence; no Python sidecar for alerts.
- Official Polymarket repos may be dependencies; community repos are references unless MIT+reviewed.

## 9. Data and control flows

```mermaid
flowchart TB
  subgraph audit [OSS audit gate]
    Scan[License scan]
    Mode[Adoption mode]
    Reject[Rejection rules]
  end
  subgraph sources [Reference repos]
    Official[Polymarket official MIT]
    NoLic[No LICENSE repos]
    MIT[MIT community]
    Apache[Apache-2.0 Oracle3]
  end
  subgraph target [RetroPick tree]
    GoBFF[internal/markets]
    Android[apps/android Compose]
    Intel[signal engine]
    Pkg[packages/polymarket]
  end
  Official --> Scan
  NoLic --> Scan
  MIT --> Scan
  Apache --> Scan
  Scan --> Mode
  Mode --> Reject
  Reject --> GoBFF
  Reject --> Android
  Reject --> Intel
  Official --> Pkg
```

## 10. Failure and recovery

| Failure | Recovery |
|---------|----------|
| License added/changed upstream | Re-run audit; update YAML SHA |
| CVE in ported dependency | SBOM alert; patch or remove port |
| Accidental code copy from no-LICENSE repo | Remove in same PR; legal escalation |

## 11. Security

- Dependency pinning and `npm audit` / `govulncheck` in CI.
- No clipboard import of wallet handling code from cabinet-style repos.
- Provenance recorded in SBOM per package.

## 12. Observability

- CI fails if `open-source-provenance.yaml` adoption_mode missing for new imports.
- Quarterly re-audit scheduled in platform runbook.

## 13. Test strategy

- License file hash check script in CI.
- For selective_port: unit tests prove behavior match without copying verbatim blocks >20 lines.

## 14. Rollout and rollback

- Wave 0: audit docs only.
- First `selective_port`: requires security sign-off in BLOCKERS log.
- Rollback: remove vendored code; revert to clean-room.

## 15. Open questions

- Pin commit SHA for ts-sdk at PHASE-1 harness setup (ASSUMP-006).
- Whether PolymarketViewer adds LICENSE (would reopen selective_port for UI utilities only).

## 16. Acceptance criteria

- [x] PolymarketViewer documented as no LICENSE → clean-room
- [x] PolymarketAlerts documented as no LICENSE → clean-room
- [x] polymarket-whales MIT selective port path
- [x] Oracle3 Apache-2.0 Phase 8 reference
- [x] Official ts-sdk and clob-client-v2 documented
- [x] YAML provenance file complete
