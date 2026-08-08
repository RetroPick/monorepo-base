# Android and Google Play Current State

**Status:** reviewed
**Owner:** android-lead
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1

## 1. Purpose

Capture official Android platform guidance and Google Play policy constraints that shape RetroPick Markets native client design (ADR-006) and release gating.

## 2. Scope

### In scope

- Jetpack Compose architecture, modularization, security primitives, Play financial/crypto policies, distribution gates.

### Out of scope

- iOS.
- PRISM mobile client.
- Play Console account setup (operational).

## 3. Prerequisites

- [.dev/ANDROID_MARKETS.md](../../ANDROID_MARKETS.md)
- [ADR-006-ANDROID-JETPACK-COMPOSE.md](../architecture/adr/ADR-006-ANDROID-JETPACK-COMPOSE.md)
- [android/PLAY_STORE_COMPLIANCE_AND_RELEASE.md](../android/PLAY_STORE_COMPLIANCE_AND_RELEASE.md)

## 4. Authoritative sources

| Source | URL | Retrieved |
|--------|-----|-----------|
| App architecture | https://developer.android.com/topic/architecture | 2026-07-25 |
| Compose architecture | https://developer.android.com/develop/ui/compose/architecture | 2026-07-25 |
| Modularization | https://developer.android.com/topic/modularization | 2026-07-25 |
| Keystore | https://developer.android.com/privacy-and-security/keystore | 2026-07-25 |
| Network security config | https://developer.android.com/privacy-and-security/security-config | 2026-07-25 |
| Financial features declaration | https://support.google.com/googleplay/android-developer/answer/13849271 | 2026-07-25 |
| Blockchain content policy | https://support.google.com/googleplay/android-developer/answer/13607354 | 2026-07-25 |
| Crypto exchange/wallet requirements | https://support.google.com/googleplay/android-developer/answer/16329703 | 2026-07-25 |
| Payments policy | https://support.google.com/googleplay/android-developer/answer/10281818 | 2026-07-25 |

## 5. Current state

### 5.1 Repository

`apps/android/` is **README-only** — no Gradle project on disk (EV-027). BUILD_SESSION_PROMPT.md defines next implementation session. Target stack: Kotlin, Jetpack Compose, Material 3, Hilt, Retrofit, Coroutines/Flow.

### 5.2 Jetpack Compose (platform baseline)

Google recommends:

- **Single-activity** Compose app with Navigation Compose.
- **UI layer:** composables + ViewModel exposing `StateFlow`/`UiState`.
- **Domain layer:** use cases (e.g., `PreviewOrder`, `ObservePortfolio`).
- **Data layer:** repositories hiding Retrofit, WebSocket, Room.

RetroPick maps this to modular `feature/*`, `data/*`, `core/*` per ANDROID_MARKETS.md §4.

### 5.3 Modularization

Official guidance favors feature modules with **api/impl** separation and convention plugins (`build-logic/`). Dependency rules:

- Features → domain interfaces + design system.
- Data → generated OpenAPI models + mappers.
- No feature → direct wallet SDK calls.

### 5.4 Security primitives

| Primitive | Use in Markets |
|-----------|----------------|
| Android Keystore | App session tokens, encrypted prefs for non-wallet secrets |
| Network Security Config | TLS only; pin optional after review |
| BiometricPrompt | App unlock / sensitive settings — **not** order signing substitute |
| FLAG_SECURE | Optional on portfolio screens |
| Play Integrity | Risk signal for rooted/debug builds |

Wallet transaction signing remains with external wallet or approved wallet SDK — RetroPick never stores seed phrases.

### 5.5 Google Play — financial and crypto policies

Publishing a Polymarket trading client triggers:

1. **Financial features declaration** — declare crypto wallet / exchange / trading functionality accurately.
2. **Blockchain-based content policy** — may require licenses, jurisdiction proofs, and documentation for crypto services in target countries.
3. **Cryptocurrency exchange & software wallet policy** — compliance artifacts for regions where Google requires regulated entities.

**Implications:**

- Store listing must not promise guaranteed returns.
- Privacy policy, terms, fees, risk disclosures, and support contact required.
- Country distribution list must align with **server-side** geoblock (stricter of Play vs RetroPick policy).
- Play Billing applies to **digital subscriptions** (e.g., future analytics tier), not on-chain trades.

### 5.6 Background work and notifications

- FCM (or approved push provider) for fill/resolution alerts after backend reconciliation.
- WorkManager for cache refresh — not for autonomous trading.
- Push payloads carry opaque IDs; sensitive PnL fetched after auth.

### 5.7 Repository vs Play policy alignment

| RetroPick rule | Play alignment |
|----------------|----------------|
| No geoblock bypass | Required by blockchain policy |
| No raw key custody | Wallet policy |
| Markets-only (no PRISM) | Simpler financial declaration |
| Shared OpenAPI BFF | Demonstrates controlled trading path |

## 6. Target design

Native Android client `apps/android-markets/` (or `apps/android/` per monorepo naming) consuming **only** `schemas/openapi/markets-v1.yaml` — never production Polymarket CLOB directly.

Build variants:

| Variant | Backend | Distribution |
|---------|---------|--------------|
| devDebug | local/dev | internal |
| stagingRelease | staging | internal testing |
| prodRelease | production | Play staged rollout |

## 7. Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| React Native / Flutter | ADR-006 locks Compose |
| KMP shared UI with web | Team stack + Play review complexity |
| Embedded WebView trading | Wallet security + policy risk |
| Direct CLOB from app | ADR-002 duplication |

## 8. Decisions

- Kotlin + Jetpack Compose + Material 3 (ADR-006).
- Gradle independent of pnpm monorepo orchestration.
- Play release gated on legal opinion per country (PHASE-7).
- Feature parity with web trading deferred to PHASE-5 after web PHASE-3 stable.

## 9. Data and control flows

```mermaid
flowchart TB
  subgraph android [Android app]
    UI[Compose UI]
    VM[ViewModel]
    UC[Use cases]
    Repo[Repositories]
    Wallet[Wallet coordinator]
    Room[Room cache]
  end
  BFF[Markets BFF OpenAPI]
  WS[Realtime WS]
  ExtWallet[External wallet app]
  UI --> VM --> UC --> Repo
  UC --> Wallet
  Repo --> BFF
  Repo --> WS
  Repo --> Room
  Wallet --> ExtWallet
```

## 10. Failure and recovery

| Scenario | Behavior |
|----------|----------|
| Offline | Show cached catalog/portfolio with freshness label; block new sign |
| WS gap | Snapshot resync per ADR-005 |
| Wallet reject | Clear error; preserve preview for edit |
| Play policy rejection | Halt rollout; legal remediation track |

## 11. Security

- No cleartext traffic.
- Certificate transparency / pinning evaluated PHASE-6.
- ProGuard/R8 rules for release; no secrets in APK.
- SBOM per release.

## 12. Observability

- Crashlytics/Sentry with signature redaction.
- Metrics: cold start, ANR, order sign-to-accept latency.
- Play Console vitals as launch gate.

## 13. Test strategy

- Compose UI tests + screenshot tests.
- Repository fakes with WS gap scenarios.
- Contract tests from OpenAPI golden fixtures.
- Manual matrix: wallets × API levels × regions (blocked).

## 14. Rollout and rollback

- Internal → closed → open testing → staged production (5% → 100%).
- Remote kill switch via `/markets/capabilities` + minimum version endpoint.
- Rollback via Play halt + prior APK track.

## 15. Open questions

- Minimum SDK / target SDK (ASSUMP-007, default API 26+ / target latest stable).
- Play Integrity required for prod? (ASSUMP-008).
- FCM vs alternative push vendor (ASSUMP-009).

## 16. Acceptance criteria

- [x] Documents Compose, modularization, Keystore, NSC
- [x] Documents Play financial/crypto/trading policies
- [x] Aligns with README-only android repo state
- [x] Links BFF-only API rule
