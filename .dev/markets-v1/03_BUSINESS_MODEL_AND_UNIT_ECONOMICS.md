# Business Model and Unit Economics — RetroPick Markets V1

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1

---

## Description

This PRD frames Markets V1 monetization and unit economics: primary revenue is Polymarket Builder Program fees on routed notional with **pre-signature disclosure**; secondary Pro/API ideas stay PHASE-8 hypotheses. Cost drivers include relayer gas, Gamma/CLOB, RPC, and push; MVP infra targets **< USD 100/month** (MKT-NFR-030).

It locks allowed revenue and excluded streams (hidden spread, fees on failed submits, interest on user collateral) so agents do not “optimize” by obscuring venue economics. Fee rates are external — fetch live Builder terms; never hardcode production percentages from memory.

Use before fee UI, relayer budgets, subscription surfaces, or infra spend claims. Cost detail lives in [platform/INFRASTRUCTURE_AND_COST_MODEL.md](platform/INFRASTRUCTURE_AND_COST_MODEL.md); order UX must show the same fee fields defined in polymarket/order and web wallet specs.

## 0. Developer intent (5W+1H)

Short orientation for implementers and agents. Read this before revenue, cost, and KPI sections below.

The 5W+1H table below is a **navigation aid** only. It does not replace fee formulas, cost tables, or MKT-NFR-030; if anything conflicts, the body wins. Fee rates are external — never hardcode production percentages from memory.

| Lens | Answer |
|------|--------|
| **Who** | Platform/product leads validating monetization posture; backend agents wiring Builder attribution disclosure; SRE/cost owners keeping MVP infra under baseline; reviewers rejecting undisclosed spread or custody-interest models. |
| **What** | Business model and unit-economics frame for Markets V1: primary revenue = Polymarket Builder Program fees on routed notional with pre-signature disclosure; secondary Pro/API hypotheses gated to PHASE-8; cost drivers (relayer gas, Gamma/CLOB, RPC, push); MVP infra target **< USD 100/month** (MKT-NFR-030). |
| **When** | Before implementing fee UI, relayer budgets, subscription surfaces, or infra spend claims. Re-read when Polymarket publishes fee-schedule changes or when PHASE-2/3 attribution work starts. |
| **Where** | This PRD + https://docs.polymarket.com/programs/builders/fees (fetch at deploy). Cost detail: [platform/INFRASTRUCTURE_AND_COST_MODEL.md](platform/INFRASTRUCTURE_AND_COST_MODEL.md). Order UX must show fee fields defined in polymarket/order and web wallet UX specs — not invented ticker labels. |
| **Why** | Monetization mistakes (hidden spread, charging failed submits, interest on user collateral) break trust and policy. This doc locks allowed revenue and excluded streams so agents do not “optimize” by obscuring venue economics. |
| **How** | Fetch and disclose current Builder terms before every signature; compute `filled_notional × effective_builder_fee_rate` only with live terms; budget relayer gas with kill switches; keep secrets/credentials out of Git. Do not ship Pro subscription as a V1 launch blocker. |

### Worked example

**Happy path — order preview fee line (PHASE-3)**

1. BFF loads current Builder fee terms (versioned).
2. Preview response includes effective rate + estimated fee amount in collateral units.
3. Web/Android show the same numbers the user will sign; mismatch fails closed.

**Happy path — MVP cost gate**

1. PHASE-1 deploy stays on single-region VPS + Postgres within MKT-NFR-030.
2. Shared ingest/cache reduces Gamma/CLOB poll cost; no premature multi-region.

**Failure / Never**

- Hardcoding fee bps from a blog post.
- Undisclosed spread between preview and venue.
- Revenue on cancelled/failed order attempts.
- Interest income on user balances (RetroPick does not custody trading balances).
- Treating PHASE-8 Pro pricing hypotheses as committed SKUs.

**Agent checklist**

- [ ] Fee source fetched, not invented?
- [ ] Disclosure before sign?
- [ ] Cost driver mapped to phase?
- [ ] Excluded revenue avoided?
- [ ] Infra baseline still honest?

**Reading tip:** Primary stream (§3.1) and Excluded revenue (§3.3) are the gates; secondary subscription is intentionally TBD until usage validation.

## 1. Purpose

Document revenue hypotheses, cost drivers, unit economics, and KPI framework for Markets V1 pre-funding MVP (baseline infra < USD 100/month).

## 2. Positioning statement

RetroPick Markets is a Polymarket-native client that wins on **clarity, execution transparency, mobile quality, and trustworthy operations** — not on hidden spreads or implied liquidity superiority.

## 3. Revenue streams

### 3.1 Primary — Polymarket Builder Program

| Attribute | Detail |
|---|---|
| Mechanism | Configurable builder fee on routed notional |
| Disclosure | Effective fee shown before every signature |
| Authority | Polymarket published maximums and change-notice rules |
| Verification | Fetch current terms at deploy; never hardcode |
| Phase | PHASE-2 design; PHASE-3 production attribution |

Formula (per order):

```
Builder Fee Revenue = filled_notional × effective_builder_fee_rate
```

### 3.2 Secondary — Professional subscription (PHASE-8)

| Tier | Features | Pricing hypothesis |
|---|---|---|
| Pro | Advanced analytics, exports, webhooks | TBD after usage validation |
| API | Rate-limited professional API access | Usage-based |

Gated behind separate legal/commercial review. Not required for V1 launch.

### 3.3 Excluded revenue

- Undisclosed spread on orders.
- Revenue from failed/cancelled order attempts.
- Interest on user collateral (RetroPick does not custody balances).

## 4. Cost structure

### 4.1 Variable costs

| Driver | Description | Phase introduced | Mitigation |
|---|---|---|---|
| Relayer gas | Builder/relayer subsidized txs | PHASE-2 | Per-user budgets, kill switch |
| Gamma/CLOB API | Upstream polling and WS | PHASE-1 | Shared ingest, cache, backoff |
| Polygon RPC | Balance and indexer reads | PHASE-2 | Batch reads, provider failover |
| Push notifications | FCM delivery | PHASE-5 | Opt-in, batching |
| LLM narration | Evidence narration only | PHASE-8 | Rate limits, cache |
| Support/fraud | Manual review escalations | PHASE-7 | Self-serve UX, automation |

### 4.2 Fixed costs (MVP baseline)

| Item | Monthly estimate | Notes |
|---|---|---|
| VPS + Postgres | USD 40–80 | Single region |
| Object storage / backups | USD 5–15 | PHASE-6 |
| Monitoring (basic) | USD 0–20 | OSS stack acceptable |
| Play Console | USD ~25 amortized | Annual fee |
| **Total baseline** | **< USD 100** | MKT-NFR-030 |

See [platform/INFRASTRUCTURE_AND_COST_MODEL.md](platform/INFRASTRUCTURE_AND_COST_MODEL.md).

## 5. Unit economics

### 5.1 Contribution margin

```
CM = Builder_Fee_Revenue + Subscription_Revenue
   - Relayer_Gas - Venue_API_Cost - Variable_Infra - Support_Fraud_Cost
```

### 5.2 Per-trader economics

| Metric | Definition | Target (V1) |
|---|---|---|
| ARPT | Avg revenue per funded trader / month | Positive after gas |
| Gas subsidy / trader | Relayer cost / active trader | < fee revenue |
| Infra / trader | Variable infra / MAU | Decreasing with scale |
| LTV | Cumulative CM over retention window | TBD post-launch |

### 5.3 Per-order economics

| Metric | Definition |
|---|---|
| Effective fee | Realized builder fee / filled notional |
| Realized slippage | Fill price vs preview midpoint |
| Time to fill | Submit → first fill |
| Failure cost | Infra + support cost of failed journey |

## 6. Funnel and conversion KPIs

| Stage | Metric | Instrumentation |
|---|---|---|
| Awareness | Eligible visitors | Analytics (privacy-compliant) |
| Connect | Wallet connect rate | PHASE-2 events |
| Fund | First deposit conversion | PHASE-2 state machine |
| Trade | First order within 7d | PHASE-3 events |
| Retain | D7/D30 funded trader retention | Warehouse / metrics |
| Expand | Markets per active trader | Portfolio analytics |

## 7. Operational KPIs

| KPI | Target | Phase | REQ ID |
|---|---|---|---|
| Catalog freshness p95 | < 60s | PHASE-1 | MKT-NFR-001 |
| Order book age p95 | < 5s | PHASE-1 | MKT-NFR-002 |
| Preview latency p95 | < 750ms | PHASE-3 | MKT-NFR-003 |
| Reconciliation error rate | < 0.1% | PHASE-4 | MKT-FR-040 |
| API uptime | 99.5% | PHASE-6 | MKT-NFR-010 |
| Android crash-free | > 99% | PHASE-5 | MKT-NFR-051 |

## 8. Concentration and risk metrics

| Risk | Metric | Action threshold |
|---|---|---|
| Market concentration | % notional top 10 markets | Diversify discovery UX |
| Category concentration | % volume single category | Monitor regulatory exposure |
| Jurisdiction blocks | % sessions geoblocked | Product messaging review |
| Upstream dependency | Gamma/CLOB error rate | Circuit breaker, read-only mode |
| Gas budget overrun | Daily relayer spend | Kill switch |

## 9. Pricing and disclosure requirements

Before every signature, disclose:

1. Venue (Polymarket) and chain (Polygon).
2. Effective builder fee rate and estimated fee amount.
3. Estimated gas / subsidy treatment.
4. Maximum loss and maximum payout.
5. Partial fill possibility for marketable orders.

Non-compliance blocks order preview response (MKT-SEC-004).

## 10. Financial governance

| Decision | Approver | Evidence required |
|---|---|---|
| Builder fee enrollment | Human + legal | Polymarket Builder profile |
| Gas subsidy budget | Ops + finance | Projected MAU and order rate |
| Subscription pricing | Product + finance | PHASE-8 validation data |
| Infra scale-up | Ops | SLO breach or cost alert |

## 11. Scenario analysis

### 11.1 Bootstrap (100 MAU, 20 funded, 5 orders/day each)

| Line | Monthly estimate |
|---|---|
| Builder revenue | Depends on notional × fee; model at deploy |
| Gas subsidy | Low with per-user caps |
| Infra | < USD 100 |
| Net | Likely negative until volume; acceptable for MVP |

### 11.2 Growth (1,000 MAU, 200 funded)

| Line | Notes |
|---|---|
| Infra | May require second region / read replica |
| API costs | Monitor Gamma/CLOB rate limits |
| Support | Plan FAQ + in-app help before scaling |

## 12. Competitive economics

Markets does not compete on fee undercutting alone. Differentiation:

- Rule comprehension reduces costly user errors.
- Execution quality transparency builds retention.
- Mobile parity increases session frequency.
- Intelligence (descriptive, uncertain) aids discovery without insider claims.

## 13. Phase alignment

| Phase | Business milestone |
|---|---|
| PHASE-0 | Scope and revenue model locked |
| PHASE-1 | Catalog drives discovery funnel |
| PHASE-2 | Wallet + fund conversion measurable |
| PHASE-3 | First routed notional and builder fees |
| PHASE-4 | Retention via portfolio and redeem UX |
| PHASE-5 | Mobile session frequency |
| PHASE-6 | Unit cost visibility via observability |
| PHASE-7 | Revenue instrumentation live |
| PHASE-8 | Subscription experiments |

## 14. Traceability

| Business requirement | REQ ID |
|---|---|
| Transparent fee disclosure | MKT-FR-032 |
| No undisclosed spread | MKT-SEC-005 |
| Builder attribution | MKT-POLY-002 |
| Cost baseline | MKT-NFR-030 |

## 15. Authoritative sources

| Source | URL | Retrieved |
|---|---|---|
| Builder fees | https://docs.polymarket.com/programs/builders/fees | 2026-07-25 |
| MARKETS baseline | .dev/MARKETS.md | 2026-07-25 |

## 16. Open assumptions

- Builder fee rates remain economically viable after gas subsidy.
- MVP infra stays under USD 100/month until >500 DAU.
- Subscription revenue deferred to PHASE-8 validation.

See [research/OPEN_QUESTIONS_AND_EXPIRING_ASSUMPTIONS.md](research/OPEN_QUESTIONS_AND_EXPIRING_ASSUMPTIONS.md).

## Appendix B.0 — KPI definitions

All KPIs require metric name, owner, dashboard, and review cadence before PHASE-7.

## Appendix B.1 — KPI definitions

All KPIs require metric name, owner, dashboard, and review cadence before PHASE-7.

## Appendix B.2 — KPI definitions

All KPIs require metric name, owner, dashboard, and review cadence before PHASE-7.

## Appendix B.3 — KPI definitions

All KPIs require metric name, owner, dashboard, and review cadence before PHASE-7.

## Appendix B.4 — KPI definitions

All KPIs require metric name, owner, dashboard, and review cadence before PHASE-7.

## Appendix B.5 — KPI definitions

All KPIs require metric name, owner, dashboard, and review cadence before PHASE-7.

## Appendix B.6 — KPI definitions

All KPIs require metric name, owner, dashboard, and review cadence before PHASE-7.

## Appendix B.7 — KPI definitions

All KPIs require metric name, owner, dashboard, and review cadence before PHASE-7.

## Appendix B.8 — KPI definitions

All KPIs require metric name, owner, dashboard, and review cadence before PHASE-7.

## Appendix B.9 — KPI definitions

All KPIs require metric name, owner, dashboard, and review cadence before PHASE-7.

## Appendix B.10 — KPI definitions

All KPIs require metric name, owner, dashboard, and review cadence before PHASE-7.

## Appendix B.11 — KPI definitions

All KPIs require metric name, owner, dashboard, and review cadence before PHASE-7.

## Appendix B.12 — KPI definitions

All KPIs require metric name, owner, dashboard, and review cadence before PHASE-7.

## Appendix B.13 — KPI definitions

All KPIs require metric name, owner, dashboard, and review cadence before PHASE-7.

## Appendix B.14 — KPI definitions

All KPIs require metric name, owner, dashboard, and review cadence before PHASE-7.
