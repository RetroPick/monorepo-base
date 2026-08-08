# Non-Functional Requirements — RetroPick Markets V1

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1

---

## Description

This document defines measurable non-functional requirements for Markets V1: catalog/book freshness, preview/submit latency, BFF uptime, RTO, security gates (secrets, TLS, SBOM, pen-test), cost (MKT-NFR-030), WCAG/TalkBack, Android cold-start/crash/ANR, and data integrity. Every NFR needs a numeric or boolean target plus phase/task/metric path.

Principles force runbook response on breach and keep intelligence failure domains isolated from trading (ADR-008). Soft “make it fast” language is not enough — do not weaken targets to match broken behavior, and do not invent unofficial dashboard metric names without updating this doc.

Deep observability lives in [platform/OBSERVABILITY_SLOS_AND_ALERTS.md](platform/OBSERVABILITY_SLOS_AND_ALERTS.md); test strategy under [testing/](testing/). Re-read before PHASE-6 hardening and PHASE-7 launch evidence packs.

## 0. Developer intent (5W+1H)

Short orientation for implementers and agents. Read this before performance, availability, and cost NFR tables below.

The 5W+1H table below is a **navigation aid** only. It does not replace numeric targets or phase/task columns; if anything conflicts, the NFR tables win. Do not weaken targets to match broken behavior.

| Lens | Answer |
|------|--------|
| **Who** | Backend/web/Android implementers accepting latency/uptime budgets; SRE defining SLOs and runbooks; QA designing load/contract tests; intelligence agents ensuring signal lag failures do not block trading (ADR-008). |
| **What** | Measurable non-functional requirements: catalog/book freshness, preview/submit latency, BFF uptime, RTO, security gates (secrets, TLS, SBOM, pen-test), cost (MKT-NFR-030), WCAG/TalkBack, Android cold-start/crash/ANR, data integrity. Every NFR needs numeric/boolean target plus phase/task/metric path. |
| **When** | When sizing caches, choosing poll intervals, writing load tests, or negotiating “good enough” launch bars. Re-read before PHASE-6 hardening and PHASE-7 launch evidence packs. |
| **Where** | This file for NFR IDs. Observability detail: [platform/OBSERVABILITY_SLOS_AND_ALERTS.md](platform/OBSERVABILITY_SLOS_AND_ALERTS.md). Test strategy: [testing/](testing/). Metrics names in tables (e.g. `orderbook_snapshot_age_seconds`) are the contract — do not invent parallel unofficial names in dashboards without updating this doc. |
| **Why** | Soft “make it fast” language lets agents ship without SLOs, or silently drop safety when upstream is slow. Principles here force runbook response on breach and keep intelligence failure domains isolated from trading. |
| **How** | Implement against the Target column; emit the Measurement metric; attach phase-gate evidence. On upstream outage, prefer documented read-only degradation (MKT-NFR-011) over inventing optimistic fills. Keep baseline infra under MKT-NFR-030 until explicitly revised. |

### Worked example

**Happy path — order book age**

1. MKT-NFR-002: p95 book snapshot age < 5s.
2. PHASE-1 task wires ingest + `orderbook_snapshot_age_seconds`; contract tests assert staleness flags in API.
3. UI shows stale state instead of pretending live.

**Happy path — intelligence lag**

1. Signal compute exceeds budget: degrade intelligence cards; trading preview/submit paths remain available (ADR-008).
2. Fix workers/indexer lag — do not delete the NFR row.

**Failure / Never**

- Shipping without metric instrumentation for launch-critical NFRs.
- Silently disabling geoblock/TLS to “hit latency.”
- Claiming 99.5% uptime without PHASE-6 observability.
- Raising cost baseline in code comments without updating MKT-NFR-030 and cost model docs.

**Agent checklist**

- [ ] NFR ID and target known?
- [ ] Metric name matches table?
- [ ] Phase/task alignment?
- [ ] Breach → runbook path exists?
- [ ] Safety controls still fail closed?

**Reading tip:** Principles (§2) apply to every table; performance numbers are useless without the Measurement column wired in code.

## 1. Purpose

Performance, availability, security, cost, accessibility, operability, and mobile NFRs with measurable targets and verification phases.

## 2. NFR principles

1. Every NFR has a numeric target or boolean gate.
2. Every NFR maps to a phase, task, test, and metric.
3. SLO breaches trigger runbooks — not silent degradation of safety controls.
4. Intelligence failures must not block trading (ADR-008).

## 3. Performance

| ID | Requirement | Target | Measurement | Phase | Task |
|---|---|---|---|---|---|
| MKT-NFR-001 | Event catalog freshness | p95 < 60s | `markets_catalog_freshness_seconds` | PHASE-1 | MKT-P1-009 |
| MKT-NFR-002 | Order book snapshot age | p95 < 5s | `orderbook_snapshot_age_seconds` | PHASE-1 | MKT-P1-006 |
| MKT-NFR-003 | Order preview latency | p95 < 750ms | `order_preview_duration_seconds` | PHASE-3 | MKT-P3-001 |
| MKT-NFR-004 | Order submit round-trip | p95 < 2s excl. wallet | `order_submit_duration_seconds` | PHASE-3 | MKT-P3-002 |
| MKT-NFR-005 | Web market detail TTFB | p95 < 300ms cached | RUM + server | PHASE-1 | MKT-P1-004 |
| MKT-NFR-006 | Signal computation latency | p95 < 30s | `signal_compute_lag_seconds` | PHASE-4 | MKT-P4-003 |
| MKT-NFR-007 | Position reconcile lag | p95 < 60s | `position_reconcile_lag_seconds` | PHASE-4 | MKT-P4-001 |

## 4. Availability and reliability

| ID | Requirement | Target | Phase | Task |
|---|---|---|---|---|
| MKT-NFR-010 | Markets BFF uptime | 99.5% monthly | PHASE-6 | MKT-P6-004 |
| MKT-NFR-011 | Read-only degradation on upstream outage | < 60s detect | PHASE-1 | MKT-P1-002 |
| MKT-NFR-012 | RTO for backend rollback | < 15 min | PHASE-6 | MKT-P6-003 |
| MKT-NFR-013 | Order submit unknown state resolution | < 120s | PHASE-3 | MKT-P3-005 |

## 5. Security NFRs

| ID | Requirement | Target | Phase |
|---|---|---|---|
| MKT-NFR-020 | Secrets outside Git | 100% | PHASE-0 |
| MKT-NFR-021 | TLS for all client API calls | 100% | PHASE-1 |
| MKT-NFR-022 | SBOM on release artifacts | 100% | PHASE-6 |
| MKT-NFR-023 | Pen test critical findings | 0 open at launch | PHASE-6 |

## 6. Cost and efficiency

| ID | Requirement | Target | Phase |
|---|---|---|---|
| MKT-NFR-030 | Baseline infra spend | < USD 100/mo | PHASE-1 |
| MKT-NFR-031 | LLM narration cost cap | TBD per MAU | PHASE-8 |
| MKT-NFR-032 | Notification cost per MAU | Batched + opt-in | PHASE-5 |

## 7. Accessibility

| ID | Requirement | Target | Phase |
|---|---|---|---|
| MKT-NFR-040 | WCAG 2.1 AA on critical paths | Pass audit | PHASE-3 |
| MKT-NFR-041 | Android TalkBack on trade flow | Pass | PHASE-5 |
| MKT-NFR-042 | Color contrast and motion prefs | Pass | PHASE-3,5 |

Critical paths: market detail, order ticket, portfolio, wallet connect.

## 8. Mobile (Android)

| ID | Requirement | Target | Phase |
|---|---|---|---|
| MKT-NFR-050 | Cold start | p75 < 2s | PHASE-5 |
| MKT-NFR-051 | Crash-free users | > 99% | PHASE-5 |
| MKT-NFR-052 | ANR rate | < 0.1% | PHASE-5 |
| MKT-AND-001 | Jetpack Compose only | Enforced by lint | PHASE-5 |

## 9. Data integrity

| ID | Requirement | Target | Phase |
|---|---|---|---|
| MKT-NFR-060 | Fixed-point money in APIs | No float fields | PHASE-1 |
| MKT-NFR-061 | Idempotent catalog ingest | At-least-once safe | PHASE-1 |
| MKT-NFR-070 | Backup RPO | < 24h | PHASE-6 |
| MKT-NFR-071 | Backup RTO | < 4h | PHASE-6 |

## 10. Web platform

| ID | Requirement | Target | Phase |
|---|---|---|---|
| MKT-WEB-001 | OpenAPI-generated TypeScript types | Enforced in CI | PHASE-1 |
| MKT-WEB-002 | Core Web Vitals LCP | < 2.5s p75 | PHASE-3 |

## 11. Upstream (Polymarket)

| ID | Requirement | Target | Phase |
|---|---|---|---|
| MKT-POLY-001 | CLOB V2 only | No V1 assumptions | PHASE-3 |
| MKT-POLY-002 | Builder fee fetch before preview | 100% | PHASE-3 |
| MKT-POLY-003 | Contract address registry verified at startup | 100% | PHASE-2 |

## 12. Degraded modes

| Condition | User-visible state | Safety |
|---|---|---|
| Gamma/CLOB outage | Read-only catalog + banner | No new orders if book stale |
| Eligibility unknown | `eligible: false` | Fail closed |
| Relayer down | User-submit path or block write ops | No silent failure |
| Signal engine down | Trading unaffected | Alerts paused |
| WS gap | Stale book badge | Disable marketable |

See [architecture/FAILURE_DOMAINS_AND_DEGRADED_MODES.md](architecture/FAILURE_DOMAINS_AND_DEGRADED_MODES.md).

## 13. Observability requirements

Every SLI must have: metric name, dashboard panel, alert threshold, owner, runbook link.

Catalog: [platform/OBSERVABILITY_SLOS_AND_ALERTS.md](platform/OBSERVABILITY_SLOS_AND_ALERTS.md)

## 14. Test verification

| NFR category | Test type | Document |
|---|---|---|
| Performance | Load test | testing/LOAD_CHAOS_AND_RESILIENCE.md |
| Availability | Chaos | PHASE-6 |
| Security | Pen test | security/SECURITY_TEST_AND_REVIEW_PLAN.md |
| Accessibility | Manual + automated | web/DESIGN_SYSTEM_AND_ACCESSIBILITY.md |
| Mobile | Benchmark + Play vitals | android/ACCESSIBILITY_PERFORMANCE_AND_DEVICES.md |

## 15. Phase verification gates

| Phase | NFR gate |
|---|---|
| PHASE-1 | MKT-NFR-001,002,030,060 |
| PHASE-3 | MKT-NFR-003,004,040 |
| PHASE-5 | MKT-NFR-050,051,052 |
| PHASE-6 | MKT-NFR-010,070,071,022,023 |
| PHASE-7 | All launch-critical NFRs green |

## 16. Traceability

Full REQ IDs: [04_REQUIREMENTS_AND_TRACEABILITY.md](04_REQUIREMENTS_AND_TRACEABILITY.md)

## 17. Open items

- Exact pUSD collateral verification at deploy (MKT-POLY-003).
- LLM cost cap numeric target pending PHASE-8 scope approval.

## Appendix N.0 — SLO review cadence

Review all NFR targets monthly pre-launch, weekly post-launch first 30 days.

## Appendix N.1 — SLO review cadence

Review all NFR targets monthly pre-launch, weekly post-launch first 30 days.

## Appendix N.2 — SLO review cadence

Review all NFR targets monthly pre-launch, weekly post-launch first 30 days.

## Appendix N.3 — SLO review cadence

Review all NFR targets monthly pre-launch, weekly post-launch first 30 days.

## Appendix N.4 — SLO review cadence

Review all NFR targets monthly pre-launch, weekly post-launch first 30 days.

## Appendix N.5 — SLO review cadence

Review all NFR targets monthly pre-launch, weekly post-launch first 30 days.

## Appendix N.6 — SLO review cadence

Review all NFR targets monthly pre-launch, weekly post-launch first 30 days.

## Appendix N.7 — SLO review cadence

Review all NFR targets monthly pre-launch, weekly post-launch first 30 days.

## Appendix N.8 — SLO review cadence

Review all NFR targets monthly pre-launch, weekly post-launch first 30 days.

## Appendix N.9 — SLO review cadence

Review all NFR targets monthly pre-launch, weekly post-launch first 30 days.

## Appendix N.10 — SLO review cadence

Review all NFR targets monthly pre-launch, weekly post-launch first 30 days.

## Appendix N.11 — SLO review cadence

Review all NFR targets monthly pre-launch, weekly post-launch first 30 days.

## Appendix N.12 — SLO review cadence

Review all NFR targets monthly pre-launch, weekly post-launch first 30 days.

## Appendix N.13 — SLO review cadence

Review all NFR targets monthly pre-launch, weekly post-launch first 30 days.

## Appendix N.14 — SLO review cadence

Review all NFR targets monthly pre-launch, weekly post-launch first 30 days.

## Appendix N.15 — SLO review cadence

Review all NFR targets monthly pre-launch, weekly post-launch first 30 days.

## Appendix N.16 — SLO review cadence

Review all NFR targets monthly pre-launch, weekly post-launch first 30 days.

## Appendix N.17 — SLO review cadence

Review all NFR targets monthly pre-launch, weekly post-launch first 30 days.

## Appendix N.18 — SLO review cadence

Review all NFR targets monthly pre-launch, weekly post-launch first 30 days.

## Appendix N.19 — SLO review cadence

Review all NFR targets monthly pre-launch, weekly post-launch first 30 days.

## Appendix N.20 — SLO review cadence

Review all NFR targets monthly pre-launch, weekly post-launch first 30 days.

## Appendix N.21 — SLO review cadence

Review all NFR targets monthly pre-launch, weekly post-launch first 30 days.

## Appendix N.22 — SLO review cadence

Review all NFR targets monthly pre-launch, weekly post-launch first 30 days.

## Appendix N.23 — SLO review cadence

Review all NFR targets monthly pre-launch, weekly post-launch first 30 days.

## Appendix N.24 — SLO review cadence

Review all NFR targets monthly pre-launch, weekly post-launch first 30 days.

## Appendix N.25 — SLO review cadence

Review all NFR targets monthly pre-launch, weekly post-launch first 30 days.

## Appendix N.26 — SLO review cadence

Review all NFR targets monthly pre-launch, weekly post-launch first 30 days.

## Appendix N.27 — SLO review cadence

Review all NFR targets monthly pre-launch, weekly post-launch first 30 days.

## Appendix N.28 — SLO review cadence

Review all NFR targets monthly pre-launch, weekly post-launch first 30 days.

## Appendix N.29 — SLO review cadence

Review all NFR targets monthly pre-launch, weekly post-launch first 30 days.

## Appendix N.30 — SLO review cadence

Review all NFR targets monthly pre-launch, weekly post-launch first 30 days.

## Appendix N.31 — SLO review cadence

Review all NFR targets monthly pre-launch, weekly post-launch first 30 days.

## Appendix N.32 — SLO review cadence

Review all NFR targets monthly pre-launch, weekly post-launch first 30 days.

## Appendix N.33 — SLO review cadence

Review all NFR targets monthly pre-launch, weekly post-launch first 30 days.
