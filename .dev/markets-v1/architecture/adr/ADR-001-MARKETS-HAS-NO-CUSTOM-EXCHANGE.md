# ADR-001: Markets Has No Custom Exchange

**Status:** accepted
**Date:** 2026-07-24
**Last reviewed:** 2026-07-25
**Deciders:** platform-orchestrator, markets-engineering, legal
**Wave:** 1

## Context

RetroPick historically operated a proprietary **epoch v1 MarketEngine** with on-chain outcome tokens (`contracts/legacy-pool-v1/`). That system is **frozen** per monorepo phase R4 and archived. The company is launching **RetroPick Markets V1** as a distinct product line.

Several architectural options existed for Markets V1:

1. **Polymarket-native integration** — RetroPick provides UX, intelligence, and a BFF; Polymarket is the venue and settlement authority.
2. **Hybrid** — RetroPick issues wrapper tokens while routing orders to Polymarket.
3. **Custom exchange** — Build a new RetroPick CLOB, matching engine, and settlement layer (similar to epoch v1 or PRISM).

Option 3 would require:
- New smart contracts for outcome issuance and settlement
- Regulatory analysis for operating an exchange or broker-dealer interface
- Multi-year engineering for matching, liquidity, and oracle resolution
- Duplication of Polymarket's existing liquidity and market catalog

Option 2 introduces wrapping complexity, additional custody questions, and user confusion about which issuer holds risk.

The product spec ([01_EXECUTIVE_PRODUCT_SPEC.md](../../01_EXECUTIVE_PRODUCT_SPEC.md)) positions Markets as a **Polymarket trading and intelligence experience**, not a new venue. PRISM remains the path for RetroPick-issued outcomes ([docs/ARCHITECTURE.md](../../../../docs/ARCHITECTURE.md)).

### Forces

- **Time to market:** V1 target is months, not years.
- **Liquidity:** Polymarket has established markets; a new exchange starts at zero.
- **Regulatory surface:** Operating an exchange increases compliance burden.
- **Engineering focus:** Team capacity should go to UX, intelligence, and mobile—not matching engines.
- **Legacy lesson:** Epoch v1 maintenance consumed resources; repeating that for Markets is undesirable.

## Decision

**RetroPick Markets V1 will not operate a custom exchange, matching engine, or outcome-token issuance layer.**

Specifically:

1. Polymarket (Gamma + CLOB V2 + on-chain CTF contracts) is the **sole venue authority** for Markets.
2. No new Markets smart contracts in `contracts/` — integration only.
3. No RetroPick-issued outcome tokens for Markets product line.
4. PRISM (`contracts/prism/`) is a **separate product** and must not be conflated with Markets settlement.
5. Legacy epoch APIs (`/api/v1/legacy/markets/*`) remain frozen; no extension for new Markets features.

## Consequences

### Positive

- **Faster delivery:** Engineering focuses on BFF, clients, and intelligence.
- **Liquidity access:** Users trade in existing Polymarket markets on day one.
- **Clear trust model:** Polymarket is settlement authority; RetroPick is experience layer ([SYSTEM_CONTEXT_AND_TRUST_BOUNDARIES.md](../SYSTEM_CONTEXT_AND_TRUST_BOUNDARIES.md)).
- **Reduced regulatory scope:** RetroPick is not the exchange operator for Markets (legal review still required for interface and geography).
- **Simpler failure domains:** No custom matching engine to fail ([FAILURE_DOMAINS_AND_DEGRADED_MODES.md](../FAILURE_DOMAINS_AND_DEGRADED_MODES.md)).

### Negative

- **Upstream dependency:** Polymarket API changes, outages, and policy directly affect Markets ([ADR-002](ADR-002-POLYMARKET-ANTI-CORRUPTION-LAYER.md)).
- **Fee structure:** Subject to Polymarket builder/relayer fee economics.
- **Feature ceiling:** Some venue features (e.g., custom market creation) may be unavailable or delayed.
- **Brand differentiation:** Harder to differentiate on settlement; differentiation shifts to UX and intelligence.

### Neutral

- `packages/polymarket/` contains **adapter types**, not exchange logic.
- On-chain interactions are limited to user-signed Polymarket flows (proxy wallet, CTF, USDC).

## Alternatives Considered

### Alternative A: Full custom RetroPick exchange

Build matching engine, order book, and settlement contracts.

| Criterion | Assessment |
|-----------|------------|
| Time | 18–36 months minimum |
| Liquidity | Cold start |
| Risk | High technical and regulatory |
| **Verdict** | **Rejected** |

### Alternative B: Wrapper tokens on RetroPick contracts

Issue RetroPick ERC-1155 positions backed by Polymarket exposure.

| Criterion | Assessment |
|-----------|------------|
| Custody | Requires pooled or programmatic custody model |
| UX | Confusing dual-issuer mental model |
| Engineering | Bridge contracts, reconciliation |
| **Verdict** | **Rejected** for V1 |

### Alternative C: Extend legacy MarketEngine

Continue epoch v1 for new markets.

| Criterion | Assessment |
|-----------|------------|
| Status | Explicitly frozen R4 |
| Product fit | Different settlement model than Polymarket |
| **Verdict** | **Rejected** |

### Alternative D: Polymarket-native (chosen)

Integrate via BFF; no custom exchange.

| Criterion | Assessment |
|-----------|------------|
| Time | Aligns with V1 phases |
| Liquidity | Immediate |
| Focus | UX + intelligence |
| **Verdict** | **Accepted** |

## Implementation Notes

### Repository constraints

| Path | Allowed for Markets |
|------|---------------------|
| `contracts/markets/` | **Must not be created** |
| `contracts/prism/` | PRISM only — no Markets import |
| `contracts/legacy-pool-v1/` | Frozen reference |
| `apps/backend/internal/markets/` | BFF integration only |
| `packages/polymarket/` | Types and adapters — no matching logic |

### API surface

All market identifiers in OpenAPI (`schemas/openapi/markets-v1.yaml`) reference **Polymarket-native IDs** (condition IDs, token IDs). No RetroPick epoch market IDs in Markets routes.

### CI enforcement

- Grep check: no `MarketEngine` imports in `internal/markets/`
- Bundle check: no epoch ABIs in `NEXT_PUBLIC_PRODUCT=markets` web build

### Phase alignment

| Phase | ADR-001 checkpoint |
|-------|-------------------|
| Phase 1 | Catalog from Gamma only |
| Phase 3 | Orders via CLOB V2 only |
| Phase 7 | Launch without custom contracts |

## Compliance

Any change to this ADR requires:
1. Entry in [agent-harness/DECISION_AND_ASSUMPTION_LOG.md](../../agent-harness/DECISION_AND_ASSUMPTION_LOG.md)
2. Legal review if moving toward exchange operation
3. Update to [04_REQUIREMENTS_AND_TRACEABILITY.md](../../04_REQUIREMENTS_AND_TRACEABILITY.md)

## Links

- [SYSTEM_CONTEXT_AND_TRUST_BOUNDARIES.md](../SYSTEM_CONTEXT_AND_TRUST_BOUNDARIES.md)
- [TARGET_MONOREPO_ARCHITECTURE.md](../TARGET_MONOREPO_ARCHITECTURE.md)
- [docs/ARCHITECTURE.md](../../../../docs/ARCHITECTURE.md) — R0 product lines
- [polymarket/CAPABILITY_AND_DEPENDENCY_MATRIX.md](../../polymarket/CAPABILITY_AND_DEPENDENCY_MATRIX.md)
- [ADR-002: Polymarket Anti-Corruption Layer](ADR-002-POLYMARKET-ANTI-CORRUPTION-LAYER.md)

## Review Checklist

- [x] Consistent with master prompt §23 invariants
- [x] Referenced from phase specs and traceability matrix
- [x] No contradiction with OpenAPI or legacy routes
- [x] No `contracts/markets/` directory in repo
