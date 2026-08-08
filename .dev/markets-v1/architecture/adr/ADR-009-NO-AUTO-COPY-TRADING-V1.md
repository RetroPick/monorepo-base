# ADR-009: No Auto Copy Trading in V1

**Status:** accepted
**Date:** 2026-07-24
**Last reviewed:** 2026-07-25
**Deciders:** platform-orchestrator, legal, product, security
**Wave:** 1

## Context

Trader intelligence features ([ADR-008](ADR-008-SHARED-SIGNAL-ENGINE.md)) surface **whale trades**, **smart money wallets**, and **arbitrage opportunities**. A natural product extension is **copy trading**: automatically replicate another wallet's trades in the user's account.

Copy trading introduces severe risks:

| Risk category | Description |
|---------------|-------------|
| **Custody / signing** | Auto-execution requires delegated signing or server-side keys — violates [ADR-003](ADR-003-WALLET-AND-SIGNING-MODEL.md) |
| **Regulatory** | May constitute investment advice, broker-dealer activity, or portfolio management |
| **User harm** | Latency causes worse fills; users blame RetroPick for losses |
| **Liability** | Following "smart money" that was front-run or manipulated |
| **Abuse** | Pump groups trigger follower orders |
| **Technical** | Race conditions between signal, preview, and market movement |

V1 product scope ([02_SCOPE_AND_CAPABILITY_MATRIX.md](../../02_SCOPE_AND_CAPABILITY_MATRIX.md)) positions intelligence as **informational**, not **executional**.

### Forces

- Users may request "follow whale" feature — strong demand signal
- Legal has not cleared automated replication
- [ADR-003](ADR-003-WALLET-AND-SIGNING-MODEL.md) mandates user-signed preview for every trade
- Play Store financial app policies scrutinize automated trading
- Incident response: auto-trading bug could cause mass unintended orders (SEV1)

## Decision

**RetroPick Markets V1 will not implement automated copy trading.**

Specifically prohibited in V1:

1. **No server-side order submission** triggered by another user's trade or a signal rule without fresh user preview + signature per order.
2. **No "auto-follow wallet" mode** that places orders on behalf of the user while app is backgrounded or closed.
3. **No batch execution** of copied trade sets from a single signature.
4. **No background workers** on Android or web that submit orders without active user session and confirmation UI.
5. **Notifications** from whale alerts link to **market detail + manual order ticket** — not one-tap execute.

### Allowed in V1 (manual copy intent)

| Feature | Description |
|---------|-------------|
| Whale alert | Push/in-app: "Large buy on Market X" |
| Deep link | Opens market with pre-filled **side** suggestion (user edits) |
| Preview shortcut | Pre-populate order ticket fields; user must still preview + sign |
| Watchlist | Track wallets; no order linkage |

```mermaid
flowchart LR
    SIG[Whale signal]
    NOTIF[Notification]
    UI[Market screen]
    TICKET[Order ticket - manual]
    PREVIEW[Preview]
    SIGN[User signs]
    SUBMIT[Submit]
    SIG --> NOTIF
    NOTIF --> UI
    UI --> TICKET
    TICKET --> PREVIEW
    PREVIEW --> SIGN
    SIGN --> SUBMIT
```

**Post-V1:** Manual "copy intent" flows with explicit legal review and optional per-order confirmation redesign — not V1 scope.

## Consequences

### Positive

- **ADR-003 compliance** — no delegated signing workaround
- **Reduced legal exposure** — informational product classification
- **No SEV1 auto-trading incidents** in V1
- **Simpler Android background policy** — no order WorkManager
- **Clear user agency** — every trade is deliberate

### Negative

- **Competitive gap** — some rivals offer copy trading
- **User disappointment** — must set expectations in marketing
- **Intelligence value** — signals require user action to monetize trading fees

### Product messaging

- Intelligence is **decision support**, not **portfolio management**
- Disclaimers on signal surfaces ([intelligence/SIGNAL_PROVENANCE_CALIBRATION_AND_RETRACTIONS.md](../../intelligence/SIGNAL_PROVENANCE_CALIBRATION_AND_RETRACTIONS.md))

## Alternatives Considered

### Alternative A: Full auto copy trading

Server or client watches wallet; submits matching orders automatically.

| Issue | Verdict |
|-------|---------|
| ADR-003 | Violation |
| Legal | Not cleared |
| **Outcome** | **Rejected** |

### Alternative B: Semi-auto with session key

User signs once; session key places orders for 24h.

| Issue | Verdict |
|-------|---------|
| Custody model | Gray area |
| Revocation | Complex |
| **Outcome** | **Rejected** for V1 |

### Alternative C: One-tap copy from notification

Notification action button submits order.

| Issue | Verdict |
|-------|---------|
| Preview skip | Violates signing integrity |
| Background | Android policy |
| **Outcome** | **Rejected** |

### Alternative D: Informational only + manual ticket (chosen)

| Issue | Verdict |
|-------|---------|
| UX friction | Intentional |
| **Outcome** | **Accepted** for V1 |

## Implementation Notes

### API guards

- No `POST /markets/copy/*` endpoints in V1 OpenAPI
- Alert payloads must not include pre-signed order blobs
- `capabilities` must not expose `autoCopy: true`

### Client guards

- No `WorkManager` tasks for order submission
- Notification actions: `VIEW_MARKET` only — not `PLACE_ORDER`
- Order ticket pre-fill requires user edit before preview enabled

### CI / security tests

- Grep for `autoCopy`, `followWallet`, `mirrorTrade` in production paths
- E2E: whale notification → manual flow only ([testing/END_TO_END_CRITICAL_JOURNEYS.md](../../testing/END_TO_END_CRITICAL_JOURNEYS.md))

### Future evaluation criteria (post-V1)

1. Legal opinion on copy trading in target jurisdictions
2. Non-custodial delegated signing mechanism approved by security
3. Per-order preview UX user testing
4. Abuse prevention (rate limits, wallet allowlists)

## Links

- [ADR-003: Wallet and Signing](ADR-003-WALLET-AND-SIGNING-MODEL.md)
- [ADR-008: Shared Signal Engine](ADR-008-SHARED-SIGNAL-ENGINE.md)
- [02_SCOPE_AND_CAPABILITY_MATRIX.md](../../02_SCOPE_AND_CAPABILITY_MATRIX.md)
- [security/THREAT_MODEL.md](../../security/THREAT_MODEL.md)
- [FAILURE_DOMAINS_AND_DEGRADED_MODES.md](../FAILURE_DOMAINS_AND_DEGRADED_MODES.md)
- [phases/PHASE-8-POST-V1-ADVANCED-CAPABILITIES.md](../../phases/PHASE-8-POST-V1-ADVANCED-CAPABILITIES.md)

## Review Checklist

- [x] No auto-submit code paths in V1 scope
- [x] Notification deep links reviewed
- [x] OpenAPI has no copy-trading endpoints
- [x] Marketing copy avoids "auto copy" claims
- [x] Phase 8 explicitly owns post-V1 evaluation
