# NOTIFICATIONS AND BACKGROUND WORK

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1
**Wave:** 5 — Android Compose Markets

## Description

This document covers notification architecture and background work for RetroPick Markets V1 Android (Kotlin + Compose): FCM integration, categories, v1 payload schema, WorkManager jobs, user preferences, rate limits, Doze behavior, and testing—without autonomous trading.

It sits in PHASE-5D retention work after read and trade basics. Client pieces live in a notifications module plus WorkManager; backend owns alerts/inbox and push provider secrets. Deep-link landing rules are in NAVIGATION_AND_DEEP_LINKS. Web alerts UI is complementary, not a second push stack. Widgets are V1.1+ unless explicitly tasked.

Read this when implementing alert → navigation, when BFF alert APIs or alerts.inbox change, and before enabling marketing-like pushes. Prefer ANDROID_PRODUCT_SCOPE for non-goals.

It excludes background order submit, auto-buy-on-alert workers, high-pressure entertainment urgency in titles, and putting full balances on the lock screen beyond explicit user prefs.

## 0. Developer intent (5W+1H)

Short orientation for implementers and agents. Read this before the normative sections below.

| Lens | Answer |
|------|--------|
| **Who** | Android engineers on FCM, WorkManager, and notification prefs; agents implementing alert → navigation; privacy reviewers of push payloads. |
| **What** | Notification architecture, FCM integration, categories, v1 payload schema, WorkManager jobs, (V1.1+) widgets, background restrictions, user preferences, rate limits, Doze behavior, testing. |
| **When** | PHASE-5D retention work after read/trade basics exist. When BFF alert APIs or WS `alerts.inbox` change. Before enabling marketing-like pushes. |
| **Where** | Spec: this file. Client: notifications module + WorkManager. Backend: alerts/inbox + push provider config (server-side secrets). Deep links: NAVIGATION_AND_DEEP_LINKS. Web alerts UI is complementary, not a second push stack. |
| **Why** | Push drives mobile engagement but spam erodes trust and may violate policy. Background work must not autonomously trade. Payloads must not leak sensitive balances in lock-screen cleartext beyond user prefs. |
| **How** | Opt-in categories; rate-limit. Payload carries ids + type, not full secrets. Tap → validated navigation. WorkManager for reconcile/retry of **non-trading** sync. No job that submits orders without user intent. Respect Doze; do not fight the OS with hidden foreground services for trading. |

### Worked example

**Happy path — fill alert.** BFF emits alert → FCM → notification “Order updated” with market title → tap → market/orders route → repository refresh shows fill. Prefs allow trading alerts; quiet hours respected if implemented.

**Happy path — backlog sync.** WorkManager periodic reconcile of inbox/orders when constrained network allows; UI badges update; no auto-sign.

**Failure / degraded.** Invalid payload → drop + log metric, no crash. User disabled notification permission → in-app inbox still works via REST/WS. FCM token rotate → re-register with BFF. Attempt to add “auto-buy on alert” worker → reject (product non-goal). Lock screen shows unexpected balance → tighten channel sensitivity / prefs.

### Category guidance

| Category | Default | Notes |
|----------|---------|-------|
| Orders/fills | Opt-in recommended | High trust |
| Positions/resolution | Opt-in | Claimable reminders careful |
| Product/education | Off | Not spammy |
| Security/session | On (limited) | Rare |

### Copy & policy

Notification text stays informative and calm—order updates, resolution, funding credited—not high-pressure hype. Align with Play financial/user-data disclosures.

### Payload minimalism

Prefer: `type`, `alertId`, `marketId`/`orderId`, `emittedAt`. Fetch details in-app. Avoid lock-screen amounts unless user preference explicitly allows.

### WorkManager allowlist (V1)

- Inbox sync
- Token refresh / registration
- Read-only projection refresh

Disallow: order submit, autonomous cancel/replace, funding initiation without UI.

### Agent anti-patterns

- High-frequency marketing pushes
- Background trading “helpers”
- Trusting deep link URLs from payload without allowlist
- High-pressure entertainment-gaming urgency in notification titles

### Success signal

A fill notification opens the right screen; disabling notification permission still leaves in-app inbox functional.

## 1. Purpose

Specify FCM, WorkManager jobs, notification categories, and Glance widgets (V1.1+).

## 2. Scope

### In scope

- RetroPick Markets V1 native Android client (Kotlin, Jetpack Compose, Material 3).
- Consumption of shared Markets BFF at `/api/v1/markets/*` per ADR-004.
- Feature parity targets defined in [.dev/ANDROID_MARKETS.md](../../ANDROID_MARKETS.md).
- Gradle modularization under `apps/android-markets/` (greenfield; `apps/android/` is README-only placeholder).

### Out of scope

- PRISM protocol, `contracts/prism/`, PRISM market creation, or PRISM settlement flows.
- Direct production calls to Polymarket Gamma/CLOB from the Android client (ADR-002).
- Legacy epoch MarketEngine APIs at `/api/v1/legacy/markets/*`.
- Custom RetroPick exchange or outcome-token issuance (ADR-001).
- Background autonomous trading or Android-specific order semantics.

## 3. Prerequisites

- [.dev/ANDROID_MARKETS.md](../../ANDROID_MARKETS.md) — product and architecture baseline.
- [00_DOCUMENT_MAP.md](../00_DOCUMENT_MAP.md)
- [phases/PHASE-5-ANDROID-COMPOSE-MARKETS.md](../phases/PHASE-5-ANDROID-COMPOSE-MARKETS.md)
- [architecture/adr/ADR-004-SHARED-WEB-ANDROID-API.md](../architecture/adr/ADR-004-SHARED-WEB-ANDROID-API.md)
- [architecture/adr/ADR-006-ANDROID-JETPACK-COMPOSE.md](../architecture/adr/ADR-006-ANDROID-JETPACK-COMPOSE.md)
- [schemas/openapi/markets-v1.yaml](../../../schemas/openapi/markets-v1.yaml)
- [apps/android/README.md](../../../apps/android/README.md) — current greenfield status.

## 4. Authoritative sources

| Source | URL / path | Retrieved | Confidence |
|--------|------------|-----------|------------|
| Android Markets product spec | `.dev/ANDROID_MARKETS.md` | 2026-07-25 | verified |
| Polymarket docs | https://docs.polymarket.com/ | 2026-07-25 | partially verified |
| CLOB V2 migration | https://docs.polymarket.com/v2-migration | 2026-07-25 | partially verified |
| Android app architecture | https://developer.android.com/topic/architecture | 2026-07-25 | verified |
| Compose architecture | https://developer.android.com/develop/ui/compose/architecture | 2026-07-25 | verified |
| Modularization guide | https://developer.android.com/topic/modularization | 2026-07-25 | verified |
| OpenAPI (repo) | `schemas/openapi/markets-v1.yaml` | 2026-07-25 | verified |
| Realtime schema | `schemas/events/markets-realtime-v1.json` | 2026-07-25 | verified |
| Play financial features | https://support.google.com/googleplay/android-developer/answer/13849271 | 2026-07-25 | partially verified |

## 5. Current state

`apps/android/` contains a README-only greenfield pointer. No Gradle project, modules, or
generated API client exist on disk. Implementation is scheduled for PHASE-5 per
[implementation-manifest.yaml](../agent-harness/implementation-manifest.yaml).

The target module tree is documented in [.dev/ANDROID_MARKETS.md](../../ANDROID_MARKETS.md) §4 and
expanded in [GRADLE_MODULE_GRAPH.md](./GRADLE_MODULE_GRAPH.md). CI will add an Android job once
`apps/android-markets/settings.gradle.kts` lands.

## 6. Target design

### Notification architecture

```mermaid
sequenceDiagram
    participant BFF
    participant Worker as alert-delivery
    participant FCM
    participant App
    participant User
    BFF->>Worker: domain event post-reconcile
    Worker->>Worker: prefs + dedupe + rate limit
    Worker->>FCM: data message
    FCM->>App: onMessageReceived
    App->>BFF: fetch details authenticated
    App->>User: localized notification
```

### FCM integration

- `RetroPickFirebaseMessagingService` handles data messages (preferred over notification payloads for sensitive content).
- Token registered via `POST /markets/devices` (OpenAPI TBD) on login and rotation.
- Token deleted on logout.

### Notification categories

| Type | Priority | User default |
|------|----------|--------------|
| Order filled | High | Opt-in |
| Order partial | High | Opt-in |
| Price alert | Default | Opt-in |
| Market resolving | Default | Opt-in |
| Redemption available | High | Opt-in |
| Security session | High | On (non-disable) |

### Payload schema (v1)

```json
{
  "v": 1,
  "type": "order_filled",
  "order_id": "ord_xyz",
  "collapse_key": "order:ord_xyz"
}
```

No position sizes or PnL in payload — fetch after authenticated open.

### WorkManager jobs

| Worker | Trigger | Purpose |
|--------|---------|---------|
| `SyncPortfolioWorker` | Periodic + on push | Reconcile positions |
| `RefreshCatalogWorker` | Periodic | Warm cache |
| `FlushWatchlistWorker` | Network available | Sync queued mutations |
| `RegisterFcmTokenWorker` | Token refresh | Retry registration |
| `ProcessDeepLinkWorker` | Boot | Handle deferred links |

Constraints: `NetworkType.CONNECTED` for trading-adjacent sync.

### Glance widgets (V1.1+)

| Widget | Data | Privacy |
|--------|------|---------|
| Watchlist summary | Public market prices | No account info on widget |
| Portfolio value | **Deferred** | Requires privacy review |

Use `GlanceAppWidget` + `WorkManager` refresh every 30–60 min; tap opens deep link.

### Background restrictions

- No autonomous order placement in background.
- Order submit only in foreground Activity with user gesture chain.
- `ForegroundService` not required for FCM; avoid unless media/ongoing trade UI.

### User preferences

Synced via `GET/PUT /markets/alerts/rules` and local DataStore cache.
Per-channel Android notification channels map to server rule types.

### Rate limiting

Respect server dedupe; client-side minimum interval per market alert (e.g. 5 min).

### Doze and delivery

High-priority FCM for time-sensitive fills; use `setExpedited` WorkManager only for token register retry.

### Testing

- Firebase Test Lab with FCM test messages.
- WorkManager `TestListenableWorkerBuilder`.
- Glance screenshot tests on API 31+.

See [.dev/ANDROID_MARKETS.md](../../ANDROID_MARKETS.md) §10.

## 7. Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| Flutter cross-platform | ADR-006 locks Jetpack Compose for first-party Android quality, Keystore integration, and Play policy alignment |
| React Native WebView shell | Violates native UX, accessibility, and wallet SDK integration requirements |
| Direct Gamma/CLOB from Android | ADR-002: BFF anti-corruption layer owns fee, eligibility, and schema compatibility |
| Monolithic single-module app | Blocks parallel feature development and inflates build/test cycles |
| PRISM combined mobile client | Increases policy, signing, and release risk; PRISM remains web-first |
| Embedded unrestricted WebView dApp | Tapjacking, injection, and wallet confusion risks |
| Raw private-key import | Custody and regulatory risk; wallet remains external authority |

## 8. Decisions

| ID | Decision | Rationale |
|----|----------|-----------|
| D-AND-001 | Markets-only Android scope | See [.dev/ANDROID_MARKETS.md](../../ANDROID_MARKETS.md) §1 |
| D-AND-002 | Shared OpenAPI with web | ADR-004; contract tests block breaking changes |
| D-AND-003 | Jetpack Compose + UDF | ADR-006; immutable UiState, event intents, StateFlow |
| D-AND-004 | BFF-only network boundary | ADR-002; no upstream Polymarket calls in production |
| D-AND-005 | Server-authoritative orders | Preview hash from backend; client verifies before sign |
| D-AND-006 | `apps/android-markets/` module root | Keeps README placeholder stable during greenfield bootstrap |
| D-AND-007 | No PRISM dependencies | Zero imports from `packages/prism` or PRISM schemas |

## 9. Data and control flows

```mermaid
flowchart TB
  subgraph clients [Clients]
    Web[apps/web]
    Android[apps/android-markets]
  end
  subgraph bff [Markets BFF]
    API[cmd/api /api/v1/markets]
  end
  subgraph venue [Venue]
    Gamma[Polymarket Gamma]
    CLOB[CLOB V2]
  end
  Web --> API
  Android --> API
  API --> Gamma
  API --> CLOB
  Android -.->|never in prod| Gamma
  Android -.->|never in prod| CLOB
```

## 10. Failure and recovery

| Scenario | Client behavior | Recovery |
|----------|-----------------|----------|
| Eligibility unknown | Fail closed; block trading surfaces | Retry eligibility; show support link |
| BFF 5xx on catalog | Show cached snapshot with stale label | Exponential backoff refresh |
| BFF 5xx on order preview | Block sign; no offline preview | User retries; incident banner if widespread |
| Submit timeout | State `ReconcilingUnknown`; no auto-resubmit | Poll by preview hash / order ID |
| WebSocket gap | Detect sequence gap; snapshot refresh | Atomic Room replace per ADR-005 |
| Wallet reject/timeout | Return to ReadyToSign with reason | User may change wallet or retry |
| Rooted device | Risk signal + warning; no false guarantees | User acknowledgment where required |
| Play policy block | Hide order entry per region flag | Server capability + eligibility gate |

## 11. Security

- No raw private-key custody, generation, import, or backup by RetroPick.
- Preview-before-sign: client verifies EIP-712 fields match human-readable preview.
- Android Keystore for app session secrets and encrypted DataStore master keys.
- Biometrics gate app session actions; wallet remains transaction authority.
- Network Security Configuration: TLS only, no cleartext, certificate policy reviewed.
- Sensitive screens: overlay protection, selective FLAG_SECURE, no seed clipboard.
- Deep links allowlisted; never auto-sign from link payload.
- Analytics allowlist with field redaction; no signatures in crash reports.
- See [WALLET_SIGNING_AND_SECURITY.md](./WALLET_SIGNING_AND_SECURITY.md) and [security/THREAT_MODEL.md](../security/THREAT_MODEL.md).

## 12. Observability

| Signal | Instrumentation | Alert threshold (initial) |
|--------|-----------------|---------------------------|
| Crash-free users | Firebase Crashlytics / Play Vitals | < 99.8% rolling 7d |
| ANR rate | Play Vitals + custom traces | Above Play bad-behavior internal guard |
| Cold start | Macrobenchmark + Play Vitals | Regression > 10% vs baseline |
| Order preview latency | OpenTelemetry Android + BFF trace | p95 > 2s healthy network |
| Sign-to-accepted | Custom funnel event | Drop > 15% vs prior release |
| Realtime gap recovery | `markets_android_ws_gap_total` | Sustained gap rate spike |
| Cache staleness age | Room metadata histogram | p95 staleness > 5m on catalog |

Tracing: W3C `traceparent` propagated on REST; correlate with BFF `request_id`.

## 13. Test strategy

See [ANDROID_TEST_STRATEGY.md](./ANDROID_TEST_STRATEGY.md). Minimum bar per release:

- Unit: money math, mappers, reducers, eligibility UI policy.
- Repository fakes: API errors, WS gaps, Room migrations.
- Contract: golden fixtures shared with Go and TypeScript.
- Compose: screenshot + accessibility checks on order ticket and market detail.
- Staging E2E: preview → sign → submit → reconcile happy path.
- Macrobenchmark: cold start, feed scroll, market detail from cache.

## 14. Rollout and rollback

| Track | Audience | Gate |
|-------|----------|------|
| `devDebug` | Engineers | Local/dev BFF; fixture wallets |
| `stagingRelease` | Internal QA | Staging BFF; full E2E matrix |
| `internal` Play | Closed testers | Crash/ANR budget; security review |
| `production` staged | % rollout | Order-error rate, support tickets, Play Vitals |

Kill switches: `/markets/capabilities` disables order submission per region/version.
Rollback: halt rollout, ship hotfix, or remote-disable trading without catalog regression.

## 15. Web vs Android parity

Parity is defined relative to Markets web (`apps/web`). Android may defer non-critical
surfaces but must not invent divergent trading semantics.

| Capability | Web (V1) | Android (V1) | Parity notes |
|------------|----------|--------------|--------------|
| Eligibility gate | Yes | Yes | Same `/markets/eligibility` contract |
| Capabilities flags | Yes | Yes | Order kill switch respected on both |
| Event discovery | Yes | Yes | Android adds offline cache labels |
| Market detail + rules | Yes | Yes | Adaptive layouts on tablet/foldable |
| Order book + history | Yes | Yes | Realtime via shared WS schema |
| Limit / marketable-limit orders | Yes | Yes | Identical preview hash flow |
| Wallet connect + sign | Yes | Yes | Mobile uses wallet SDK / WC deep links |
| Open orders + history | Yes | Yes | Android stale guards on order actions |
| Positions + PnL | Yes | Yes | Pull-to-refresh + WS deltas |
| Watchlist | Yes | Yes | Sync via authenticated API |
| Price alerts | Yes | Yes | Push on Android vs web inbox |
| Deep links | HTTPS app links | `retropick://` + HTTPS | See NAVIGATION doc |
| CTF split/merge/redeem | Web V1.1+ | Android V1.1+ | Deferred together |
| Intelligence signals | Web Phase 3 | Read-only V1 optional | May ship post-core trading |
| PRISM | No | No | Explicit non-goal |
| Alert delivery | Web inbox + email | FCM push + inbox sync | Push is Android differentiator |

### Parity principles

- Server authority — eligibility, fees, capabilities, and order payloads originate from BFF.
- Contract symmetry — OpenAPI and realtime schemas are version-locked across clients.
- UX adaptation — mobile optimizes for short sessions, push, and biometric session gates.
- Explicit deferrals — V1.1+ items documented; no silent web-only trading features.
- No PRISM — neither client exposes PRISM in this generation.

## 16. Open questions

| ID | Question | Expiry | Owner |
|----|----------|--------|-------|
| OQ-AND-01 | Minimum `minSdk` and target device profile | Before Gradle bootstrap | mobile-lead |
| OQ-AND-02 | Wallet vendors for V1 (WalletConnect, Coinbase, etc.) | Before wallet module | mobile-lead |
| OQ-AND-03 | Room encryption requirement given data inventory | Before database schema freeze | security |
| OQ-AND-04 | Supported Play countries and age rating | Before closed track | legal |
| OQ-AND-05 | FCM vs hybrid push for alert delivery | Before notifications module | platform |
| OQ-AND-06 | CTF split/merge in V1 vs V1.1 | Before redemption feature | product |

Full list: [research/OPEN_QUESTIONS_AND_EXPIRING_ASSUMPTIONS.md](../research/OPEN_QUESTIONS_AND_EXPIRING_ASSUMPTIONS.md).

## 17. Acceptance criteria

- FCM data-only payloads for sensitive types.
- No background order submission.
- WorkManager jobs listed with constraints.
- Widget privacy review gate for V1.1.

## 18. Related documents

- [.dev/ANDROID_MARKETS.md](../../ANDROID_MARKETS.md)
- [COMPOSE_APP_ARCHITECTURE.md](./COMPOSE_APP_ARCHITECTURE.md)
- [GRADLE_MODULE_GRAPH.md](./GRADLE_MODULE_GRAPH.md)
- [NAVIGATION_AND_DEEP_LINKS.md](./NAVIGATION_AND_DEEP_LINKS.md)
- [STATE_DATA_OFFLINE_AND_REALTIME.md](./STATE_DATA_OFFLINE_AND_REALTIME.md)
- [WALLET_SIGNING_AND_SECURITY.md](./WALLET_SIGNING_AND_SECURITY.md)
- [NOTIFICATIONS_AND_BACKGROUND_WORK.md](./NOTIFICATIONS_AND_BACKGROUND_WORK.md)
- [ACCESSIBILITY_PERFORMANCE_AND_DEVICES.md](./ACCESSIBILITY_PERFORMANCE_AND_DEVICES.md)
- [PLAY_STORE_COMPLIANCE_AND_RELEASE.md](./PLAY_STORE_COMPLIANCE_AND_RELEASE.md)
- [ANDROID_TEST_STRATEGY.md](./ANDROID_TEST_STRATEGY.md)
- [phases/PHASE-5-ANDROID-COMPOSE-MARKETS.md](../phases/PHASE-5-ANDROID-COMPOSE-MARKETS.md)

---

## Appendix A — Implementation deep dives

### A.1 notifications — Overview

**Overview** for `notifications`.

- Align with [.dev/ANDROID_MARKETS.md](../../ANDROID_MARKETS.md) and PHASE-5 exit gates.
- Never call Polymarket upstream directly from production code paths.
- Log structured diagnostics without wallet secrets or full signed payloads.
- Compose UI exposes loading, empty, error, stale, ineligible, and success states.
- ViewModels expose StateFlow<UiState>; effects use SharedFlow or Channel.
- Repository maps DTO to domain; features never import Retrofit or Room.
- Contract tests pass golden fixtures before merge.
- Touch targets ≥ 48dp; TalkBack labels on all actionable controls.
- Main thread must not perform network or disk I/O.
- Feature flags read from /markets/capabilities on cold start and resume.
- Deep dive 1 for notifications: Overview implementation checklist item 1.
- Deep dive 1 for notifications: Overview implementation checklist item 2.
- Deep dive 1 for notifications: Overview implementation checklist item 3.
- Deep dive 1 for notifications: Overview implementation checklist item 4.
- Deep dive 1 for notifications: Overview implementation checklist item 5.

### A.2 notifications — Module ownership

**Module ownership** for `notifications`.

- Align with [.dev/ANDROID_MARKETS.md](../../ANDROID_MARKETS.md) and PHASE-5 exit gates.
- Never call Polymarket upstream directly from production code paths.
- Log structured diagnostics without wallet secrets or full signed payloads.
- Compose UI exposes loading, empty, error, stale, ineligible, and success states.
- ViewModels expose StateFlow<UiState>; effects use SharedFlow or Channel.
- Repository maps DTO to domain; features never import Retrofit or Room.
- Contract tests pass golden fixtures before merge.
- Touch targets ≥ 48dp; TalkBack labels on all actionable controls.
- Main thread must not perform network or disk I/O.
- Feature flags read from /markets/capabilities on cold start and resume.
- Deep dive 2 for notifications: Module ownership implementation checklist item 1.
- Deep dive 2 for notifications: Module ownership implementation checklist item 2.
- Deep dive 2 for notifications: Module ownership implementation checklist item 3.
- Deep dive 2 for notifications: Module ownership implementation checklist item 4.
- Deep dive 2 for notifications: Module ownership implementation checklist item 5.

### A.3 notifications — API mapping

**API mapping** for `notifications`.

- Align with [.dev/ANDROID_MARKETS.md](../../ANDROID_MARKETS.md) and PHASE-5 exit gates.
- Never call Polymarket upstream directly from production code paths.
- Log structured diagnostics without wallet secrets or full signed payloads.
- Compose UI exposes loading, empty, error, stale, ineligible, and success states.
- ViewModels expose StateFlow<UiState>; effects use SharedFlow or Channel.
- Repository maps DTO to domain; features never import Retrofit or Room.
- Contract tests pass golden fixtures before merge.
- Touch targets ≥ 48dp; TalkBack labels on all actionable controls.
- Main thread must not perform network or disk I/O.
- Feature flags read from /markets/capabilities on cold start and resume.
- Deep dive 3 for notifications: API mapping implementation checklist item 1.
- Deep dive 3 for notifications: API mapping implementation checklist item 2.
- Deep dive 3 for notifications: API mapping implementation checklist item 3.
- Deep dive 3 for notifications: API mapping implementation checklist item 4.
- Deep dive 3 for notifications: API mapping implementation checklist item 5.

### A.4 notifications — State machine

**State machine** for `notifications`.

- Align with [.dev/ANDROID_MARKETS.md](../../ANDROID_MARKETS.md) and PHASE-5 exit gates.
- Never call Polymarket upstream directly from production code paths.
- Log structured diagnostics without wallet secrets or full signed payloads.
- Compose UI exposes loading, empty, error, stale, ineligible, and success states.
- ViewModels expose StateFlow<UiState>; effects use SharedFlow or Channel.
- Repository maps DTO to domain; features never import Retrofit or Room.
- Contract tests pass golden fixtures before merge.
- Touch targets ≥ 48dp; TalkBack labels on all actionable controls.
- Main thread must not perform network or disk I/O.
- Feature flags read from /markets/capabilities on cold start and resume.
- Deep dive 4 for notifications: State machine implementation checklist item 1.
- Deep dive 4 for notifications: State machine implementation checklist item 2.
- Deep dive 4 for notifications: State machine implementation checklist item 3.
- Deep dive 4 for notifications: State machine implementation checklist item 4.
- Deep dive 4 for notifications: State machine implementation checklist item 5.

### A.5 notifications — Caching

**Caching** for `notifications`.

- Align with [.dev/ANDROID_MARKETS.md](../../ANDROID_MARKETS.md) and PHASE-5 exit gates.
- Never call Polymarket upstream directly from production code paths.
- Log structured diagnostics without wallet secrets or full signed payloads.
- Compose UI exposes loading, empty, error, stale, ineligible, and success states.
- ViewModels expose StateFlow<UiState>; effects use SharedFlow or Channel.
- Repository maps DTO to domain; features never import Retrofit or Room.
- Contract tests pass golden fixtures before merge.
- Touch targets ≥ 48dp; TalkBack labels on all actionable controls.
- Main thread must not perform network or disk I/O.
- Feature flags read from /markets/capabilities on cold start and resume.
- Deep dive 5 for notifications: Caching implementation checklist item 1.
- Deep dive 5 for notifications: Caching implementation checklist item 2.
- Deep dive 5 for notifications: Caching implementation checklist item 3.
- Deep dive 5 for notifications: Caching implementation checklist item 4.
- Deep dive 5 for notifications: Caching implementation checklist item 5.

### A.6 notifications — Error UX

**Error UX** for `notifications`.

- Align with [.dev/ANDROID_MARKETS.md](../../ANDROID_MARKETS.md) and PHASE-5 exit gates.
- Never call Polymarket upstream directly from production code paths.
- Log structured diagnostics without wallet secrets or full signed payloads.
- Compose UI exposes loading, empty, error, stale, ineligible, and success states.
- ViewModels expose StateFlow<UiState>; effects use SharedFlow or Channel.
- Repository maps DTO to domain; features never import Retrofit or Room.
- Contract tests pass golden fixtures before merge.
- Touch targets ≥ 48dp; TalkBack labels on all actionable controls.
- Main thread must not perform network or disk I/O.
- Feature flags read from /markets/capabilities on cold start and resume.
- Deep dive 6 for notifications: Error UX implementation checklist item 1.
- Deep dive 6 for notifications: Error UX implementation checklist item 2.
- Deep dive 6 for notifications: Error UX implementation checklist item 3.
- Deep dive 6 for notifications: Error UX implementation checklist item 4.
- Deep dive 6 for notifications: Error UX implementation checklist item 5.

### A.7 notifications — Testing hooks

**Testing hooks** for `notifications`.

- Align with [.dev/ANDROID_MARKETS.md](../../ANDROID_MARKETS.md) and PHASE-5 exit gates.
- Never call Polymarket upstream directly from production code paths.
- Log structured diagnostics without wallet secrets or full signed payloads.
- Compose UI exposes loading, empty, error, stale, ineligible, and success states.
- ViewModels expose StateFlow<UiState>; effects use SharedFlow or Channel.
- Repository maps DTO to domain; features never import Retrofit or Room.
- Contract tests pass golden fixtures before merge.
- Touch targets ≥ 48dp; TalkBack labels on all actionable controls.
- Main thread must not perform network or disk I/O.
- Feature flags read from /markets/capabilities on cold start and resume.
- Deep dive 7 for notifications: Testing hooks implementation checklist item 1.
- Deep dive 7 for notifications: Testing hooks implementation checklist item 2.
- Deep dive 7 for notifications: Testing hooks implementation checklist item 3.
- Deep dive 7 for notifications: Testing hooks implementation checklist item 4.
- Deep dive 7 for notifications: Testing hooks implementation checklist item 5.

### A.8 notifications — Rollout flags

**Rollout flags** for `notifications`.

- Align with [.dev/ANDROID_MARKETS.md](../../ANDROID_MARKETS.md) and PHASE-5 exit gates.
- Never call Polymarket upstream directly from production code paths.
- Log structured diagnostics without wallet secrets or full signed payloads.
- Compose UI exposes loading, empty, error, stale, ineligible, and success states.
- ViewModels expose StateFlow<UiState>; effects use SharedFlow or Channel.
- Repository maps DTO to domain; features never import Retrofit or Room.
- Contract tests pass golden fixtures before merge.
- Touch targets ≥ 48dp; TalkBack labels on all actionable controls.
- Main thread must not perform network or disk I/O.
- Feature flags read from /markets/capabilities on cold start and resume.
- Deep dive 8 for notifications: Rollout flags implementation checklist item 1.
- Deep dive 8 for notifications: Rollout flags implementation checklist item 2.
- Deep dive 8 for notifications: Rollout flags implementation checklist item 3.
- Deep dive 8 for notifications: Rollout flags implementation checklist item 4.
- Deep dive 8 for notifications: Rollout flags implementation checklist item 5.

### A.9 notifications — Performance budget

**Performance budget** for `notifications`.

- Align with [.dev/ANDROID_MARKETS.md](../../ANDROID_MARKETS.md) and PHASE-5 exit gates.
- Never call Polymarket upstream directly from production code paths.
- Log structured diagnostics without wallet secrets or full signed payloads.
- Compose UI exposes loading, empty, error, stale, ineligible, and success states.
- ViewModels expose StateFlow<UiState>; effects use SharedFlow or Channel.
- Repository maps DTO to domain; features never import Retrofit or Room.
- Contract tests pass golden fixtures before merge.
- Touch targets ≥ 48dp; TalkBack labels on all actionable controls.
- Main thread must not perform network or disk I/O.
- Feature flags read from /markets/capabilities on cold start and resume.
- Deep dive 9 for notifications: Performance budget implementation checklist item 1.
- Deep dive 9 for notifications: Performance budget implementation checklist item 2.
- Deep dive 9 for notifications: Performance budget implementation checklist item 3.
- Deep dive 9 for notifications: Performance budget implementation checklist item 4.
- Deep dive 9 for notifications: Performance budget implementation checklist item 5.

### A.10 notifications — Accessibility

**Accessibility** for `notifications`.

- Align with [.dev/ANDROID_MARKETS.md](../../ANDROID_MARKETS.md) and PHASE-5 exit gates.
- Never call Polymarket upstream directly from production code paths.
- Log structured diagnostics without wallet secrets or full signed payloads.
- Compose UI exposes loading, empty, error, stale, ineligible, and success states.
- ViewModels expose StateFlow<UiState>; effects use SharedFlow or Channel.
- Repository maps DTO to domain; features never import Retrofit or Room.
- Contract tests pass golden fixtures before merge.
- Touch targets ≥ 48dp; TalkBack labels on all actionable controls.
- Main thread must not perform network or disk I/O.
- Feature flags read from /markets/capabilities on cold start and resume.
- Deep dive 10 for notifications: Accessibility implementation checklist item 1.
- Deep dive 10 for notifications: Accessibility implementation checklist item 2.
- Deep dive 10 for notifications: Accessibility implementation checklist item 3.
- Deep dive 10 for notifications: Accessibility implementation checklist item 4.
- Deep dive 10 for notifications: Accessibility implementation checklist item 5.

### A.11 notifications — Security controls

**Security controls** for `notifications`.

- Align with [.dev/ANDROID_MARKETS.md](../../ANDROID_MARKETS.md) and PHASE-5 exit gates.
- Never call Polymarket upstream directly from production code paths.
- Log structured diagnostics without wallet secrets or full signed payloads.
- Compose UI exposes loading, empty, error, stale, ineligible, and success states.
- ViewModels expose StateFlow<UiState>; effects use SharedFlow or Channel.
- Repository maps DTO to domain; features never import Retrofit or Room.
- Contract tests pass golden fixtures before merge.
- Touch targets ≥ 48dp; TalkBack labels on all actionable controls.
- Main thread must not perform network or disk I/O.
- Feature flags read from /markets/capabilities on cold start and resume.
- Deep dive 11 for notifications: Security controls implementation checklist item 1.
- Deep dive 11 for notifications: Security controls implementation checklist item 2.
- Deep dive 11 for notifications: Security controls implementation checklist item 3.
- Deep dive 11 for notifications: Security controls implementation checklist item 4.
- Deep dive 11 for notifications: Security controls implementation checklist item 5.

### A.12 notifications — Observability

**Observability** for `notifications`.

- Align with [.dev/ANDROID_MARKETS.md](../../ANDROID_MARKETS.md) and PHASE-5 exit gates.
- Never call Polymarket upstream directly from production code paths.
- Log structured diagnostics without wallet secrets or full signed payloads.
- Compose UI exposes loading, empty, error, stale, ineligible, and success states.
- ViewModels expose StateFlow<UiState>; effects use SharedFlow or Channel.
- Repository maps DTO to domain; features never import Retrofit or Room.
- Contract tests pass golden fixtures before merge.
- Touch targets ≥ 48dp; TalkBack labels on all actionable controls.
- Main thread must not perform network or disk I/O.
- Feature flags read from /markets/capabilities on cold start and resume.
- Deep dive 12 for notifications: Observability implementation checklist item 1.
- Deep dive 12 for notifications: Observability implementation checklist item 2.
- Deep dive 12 for notifications: Observability implementation checklist item 3.
- Deep dive 12 for notifications: Observability implementation checklist item 4.
- Deep dive 12 for notifications: Observability implementation checklist item 5.

### A.13 notifications — Migration notes

**Migration notes** for `notifications`.

- Align with [.dev/ANDROID_MARKETS.md](../../ANDROID_MARKETS.md) and PHASE-5 exit gates.
- Never call Polymarket upstream directly from production code paths.
- Log structured diagnostics without wallet secrets or full signed payloads.
- Compose UI exposes loading, empty, error, stale, ineligible, and success states.
- ViewModels expose StateFlow<UiState>; effects use SharedFlow or Channel.
- Repository maps DTO to domain; features never import Retrofit or Room.
- Contract tests pass golden fixtures before merge.
- Touch targets ≥ 48dp; TalkBack labels on all actionable controls.
- Main thread must not perform network or disk I/O.
- Feature flags read from /markets/capabilities on cold start and resume.
- Deep dive 13 for notifications: Migration notes implementation checklist item 1.
- Deep dive 13 for notifications: Migration notes implementation checklist item 2.
- Deep dive 13 for notifications: Migration notes implementation checklist item 3.
- Deep dive 13 for notifications: Migration notes implementation checklist item 4.
- Deep dive 13 for notifications: Migration notes implementation checklist item 5.

### A.14 notifications — FAQ

**FAQ** for `notifications`.

- Align with [.dev/ANDROID_MARKETS.md](../../ANDROID_MARKETS.md) and PHASE-5 exit gates.
- Never call Polymarket upstream directly from production code paths.
- Log structured diagnostics without wallet secrets or full signed payloads.
- Compose UI exposes loading, empty, error, stale, ineligible, and success states.
- ViewModels expose StateFlow<UiState>; effects use SharedFlow or Channel.
- Repository maps DTO to domain; features never import Retrofit or Room.
- Contract tests pass golden fixtures before merge.
- Touch targets ≥ 48dp; TalkBack labels on all actionable controls.
- Main thread must not perform network or disk I/O.
- Feature flags read from /markets/capabilities on cold start and resume.
- Deep dive 14 for notifications: FAQ implementation checklist item 1.
- Deep dive 14 for notifications: FAQ implementation checklist item 2.
- Deep dive 14 for notifications: FAQ implementation checklist item 3.
- Deep dive 14 for notifications: FAQ implementation checklist item 4.
- Deep dive 14 for notifications: FAQ implementation checklist item 5.

### A.15 notifications — Overview

**Overview** for `notifications`.

- Align with [.dev/ANDROID_MARKETS.md](../../ANDROID_MARKETS.md) and PHASE-5 exit gates.
- Never call Polymarket upstream directly from production code paths.
- Log structured diagnostics without wallet secrets or full signed payloads.
- Compose UI exposes loading, empty, error, stale, ineligible, and success states.
- ViewModels expose StateFlow<UiState>; effects use SharedFlow or Channel.
- Repository maps DTO to domain; features never import Retrofit or Room.
- Contract tests pass golden fixtures before merge.
- Touch targets ≥ 48dp; TalkBack labels on all actionable controls.
- Main thread must not perform network or disk I/O.
- Feature flags read from /markets/capabilities on cold start and resume.
- Deep dive 15 for notifications: Overview implementation checklist item 1.
- Deep dive 15 for notifications: Overview implementation checklist item 2.
- Deep dive 15 for notifications: Overview implementation checklist item 3.
- Deep dive 15 for notifications: Overview implementation checklist item 4.
- Deep dive 15 for notifications: Overview implementation checklist item 5.

### A.16 notifications — Module ownership

**Module ownership** for `notifications`.

- Align with [.dev/ANDROID_MARKETS.md](../../ANDROID_MARKETS.md) and PHASE-5 exit gates.
- Never call Polymarket upstream directly from production code paths.
- Log structured diagnostics without wallet secrets or full signed payloads.
- Compose UI exposes loading, empty, error, stale, ineligible, and success states.
- ViewModels expose StateFlow<UiState>; effects use SharedFlow or Channel.
- Repository maps DTO to domain; features never import Retrofit or Room.
- Contract tests pass golden fixtures before merge.
- Touch targets ≥ 48dp; TalkBack labels on all actionable controls.
- Main thread must not perform network or disk I/O.
- Feature flags read from /markets/capabilities on cold start and resume.
- Deep dive 16 for notifications: Module ownership implementation checklist item 1.
- Deep dive 16 for notifications: Module ownership implementation checklist item 2.
- Deep dive 16 for notifications: Module ownership implementation checklist item 3.
- Deep dive 16 for notifications: Module ownership implementation checklist item 4.
- Deep dive 16 for notifications: Module ownership implementation checklist item 5.
