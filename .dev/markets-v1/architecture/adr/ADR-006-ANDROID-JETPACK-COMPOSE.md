# ADR-006: Android Jetpack Compose

**Status:** accepted
**Date:** 2026-07-24
**Last reviewed:** 2026-07-25
**Deciders:** platform-orchestrator, android-markets, design
**Wave:** 1

## Description

This ADR records the accepted decision that Markets Android V1 is **Kotlin + Jetpack Compose only** in `apps/android-markets/` (from the `apps/android` scaffold): UDF ViewModel+StateFlow, Navigation Compose, Hilt, OpenAPI-generated network (ADR-004), min SDK API 26. No XML for new features; React Native, Flutter, and WebView-shell are rejected as the product app.

It sits with ADR-004’s rule that clients share **API not UI**: web remains Next.js; design tokens align Material 3. Feature parity comes through the shared OpenAPI spec and BFF, not by embedding the website. Unavoidable View SDKs wrap in `AndroidView`.

Read this for any new Android UI, navigation, or module work, and for order-book performance or WalletConnect/offline cache scaffolding. It does not authorize introducing RN/Flutter for delivery speed, hand-rolled models that drift from OpenAPI/web, or XML layouts for “just one” new feature.

## 0. Developer intent (5W+1H)

Short orientation for implementers and agents. Read this before **Context / Decision / Consequences** below.

**5W+1H → ADR mapping:** Context = UI technology options; Decision = Kotlin + Compose exclusively; Consequences = no shared UI with web—share API via OpenAPI.

**Do not invent decisions.** If a product request conflicts with Decision, refuse or open an ADR change process—do not “interpret around” accepted text.

| Lens | Answer |
|------|--------|
| **Who** | Deciders: platform-orchestrator, android-markets, design. Audience: Android feature authors, Gradle module owners, agents scaffolding screens. |
| **What** | **Decision:** Markets Android V1 is **Kotlin + Jetpack Compose only** in `apps/android-markets/` (from `apps/android` scaffold). UDF ViewModel+StateFlow; Navigation Compose; Hilt; OpenAPI-generated network ([ADR-004](ADR-004-SHARED-WEB-ANDROID-API.md)); min SDK API 26. No XML for new features; reject RN/Flutter/WebView-shell as the product app. |
| **When** | Any new Android UI, navigation, or module; order-book performance work; WalletConnect/offline cache; Play financial-app compliance UI. |
| **Where** | `apps/android-markets/` per module graph: Compose UI → ViewModel → UseCase → Repository → OpenAPI client + Room. Web remains Next.js; design tokens align Material 3. |
| **Why** | Context: 60fps book scrolling, wallet UX, offline catalog, Play compliance. Cross-platform UI stacks fight native + OpenAPI codegen; ADR-004 shares **API not UI**. |
| **How** | Implement screens in Compose; wrap unavoidable View SDKs in `AndroidView`; keep feature parity through the shared spec and BFF, not by embedding the website. |

### Worked example

**What a developer must do differently because of this ADR**

New market detail with live book.

1. Compose screen + ViewModel collecting StateFlow.
2. Repository uses generated OpenAPI client + Room cache.
3. Realtime follows snapshot/gap rules ([ADR-005](ADR-005-REALTIME-AND-RECONCILIATION.md)).
4. No WebView of the Next.js route; no new XML Fragment layouts.

**Failure / Never-V1 (still bound by Decision)**

- Introducing React Native/Flutter for delivery speed.
- Hand-rolled models that drift from OpenAPI/web.
- Assuming shared React components satisfy Android parity.
- XML layouts for “just one” new feature.

**Agent checklist**

- [ ] Compose-only for new UI?
- [ ] ViewModel + StateFlow UDF?
- [ ] OpenAPI client regenerated?
- [ ] Module graph respected?
- [ ] Min/target SDK policy met?

**ADR section map**

| Lens | Read in this ADR |
|------|------------------|
| Who / Why | Context, Forces, Deciders metadata |
| What / How | Decision (+ Implementation Notes if present) |
| When / Where | Status/Date, Links, repo/API constraints |
| Day-2 behavior | Consequences, Review Checklist |


## Context

RetroPick Markets V1 requires a **native Android application** for Play Store distribution. Android UI technology options:

| Option | Maturity | Team skill | Markets fit |
|--------|----------|------------|-------------|
| XML Views + Fragments | Legacy | Mixed | High maintenance |
| Jetpack Compose | Modern (2026) | Target skill | Declarative, testable |
| React Native / Flutter | Cross-platform | New stack | Violates native + OpenAPI codegen path |
| WebView shell | Fast | Low | Poor trading UX, wallet friction |

Product requirements ([android/ANDROID_PRODUCT_SCOPE.md](../../android/ANDROID_PRODUCT_SCOPE.md)):
- 60fps order book scrolling
- WalletConnect integration
- Offline catalog cache
- Material Design 3 alignment with web design tokens
- Play Store financial app compliance

### Forces

- Web is Next.js — **not** shared UI code with mobile
- [ADR-004](ADR-004-SHARED-WEB-ANDROID-API.md) shares **API** not UI
- Google recommends Compose for new apps (2026)
- Existing `apps/android/` is a Compose scaffold

## Decision

Build Markets Android V1 with **Kotlin + Jetpack Compose** exclusively:

1. Target app: `apps/android-markets/` (migrate from `apps/android/` scaffold).
2. **No XML layouts** for new features; Compose only.
3. Architecture: **unidirectional data flow** with ViewModel + StateFlow.
4. Navigation: **Navigation Compose** with typed routes ([android/NAVIGATION_AND_DEEP_LINKS.md](../../android/NAVIGATION_AND_DEEP_LINKS.md)).
5. DI: **Hilt** for dependency injection.
6. Network: **OpenAPI-generated** client ([ADR-004](ADR-004-SHARED-WEB-ANDROID-API.md)).
7. Min SDK: API 26 (Android 8.0); target SDK: latest stable Policy requirement.

```mermaid
flowchart TB
    UI[Compose UI]
    VM[ViewModel]
    UC[UseCase]
    REPO[Repository]
    API[OpenAPI client]
    ROOM[Room DB]
    UI --> VM
    VM --> UC
    UC --> REPO
    REPO --> API
    REPO --> ROOM
```

## Consequences

### Positive

- **Modern toolkit** — less boilerplate than Views
- **Preview-driven development** — `@Preview` for components
- **Testability** — ViewModel unit tests without device
- **Alignment with Google** — long-term support path
- **Performance** — efficient list rendering for order books (LazyColumn)

### Negative

- **Learning curve** — team must be proficient in Compose
- **Library ecosystem** — some third-party SDKs still View-based (wrap in AndroidView)
- **No code sharing with web** — parallel UI implementation
- **Compose version churn** — requires periodic upgrades

### Module structure

Per [android/GRADLE_MODULE_GRAPH.md](../../android/GRADLE_MODULE_GRAPH.md):
- `:app` — entry, DI graph
- `:core:network`, `:core:auth`, `:core:design`
- `:feature:catalog`, `:feature:trading`, `:feature:portfolio`, `:feature:intelligence`, `:feature:wallet`

## Alternatives Considered

### Alternative A: XML Views

| Issue | Verdict |
|-------|---------|
| Velocity | Slower new development |
| **Outcome** | **Rejected** |

### Alternative B: Flutter

| Issue | Verdict |
|-------|---------|
| OpenAPI Kotlin codegen | Awkward |
| Wallet SDK | Native bridge complexity |
| **Outcome** | **Rejected** |

### Alternative C: React Native

| Issue | Verdict |
|-------|---------|
| Performance | Order book concern |
| Consistency | Third stack in monorepo |
| **Outcome** | **Rejected** |

### Alternative D: Jetpack Compose (chosen)

| Issue | Verdict |
|-------|---------|
| Greenfield skill | Training investment |
| **Outcome** | **Accepted** |

## Implementation Notes

### Design system

Shared tokens with web via [web/DESIGN_SYSTEM_AND_ACCESSIBILITY.md](../../web/DESIGN_SYSTEM_AND_ACCESSIBILITY.md) — color, typography, spacing JSON or Figma source of truth.

### Testing

- Unit: ViewModel + UseCase (JUnit5)
- UI: Compose UI tests for critical flows
- E2E: Firebase Test Lab / Maestro ([android/ANDROID_TEST_STRATEGY.md](../../android/ANDROID_TEST_STRATEGY.md))

### Play release

[android/PLAY_STORE_COMPLIANCE_AND_RELEASE.md](../../android/PLAY_STORE_COMPLIANCE_AND_RELEASE.md) — tracks in [DEPLOYMENT_ARCHITECTURE.md](../DEPLOYMENT_ARCHITECTURE.md).

## Links

- [ADR-004: Shared API](ADR-004-SHARED-WEB-ANDROID-API.md)
- [android/COMPOSE_APP_ARCHITECTURE.md](../../android/COMPOSE_APP_ARCHITECTURE.md)
- [TARGET_MONOREPO_ARCHITECTURE.md](../TARGET_MONOREPO_ARCHITECTURE.md)
- [phases/PHASE-5-ANDROID-COMPOSE-MARKETS.md](../../phases/PHASE-5-ANDROID-COMPOSE-MARKETS.md)


### Compose interop for legacy SDKs

Some wallet and charting SDKs still ship View-based APIs. Wrap them with `AndroidView` in isolated composables at the `:feature:*` boundary — never spread `AndroidView` into core design components. Prefer SDKs with Compose-first APIs when available (WalletConnect modal, Accompanist where appropriate).

### Version pinning

Use Compose BOM in `gradle/libs.versions.toml`:
- Compose BOM aligned with Kotlin version
- Monthly review of stable channel releases
- Upgrade in dedicated PR with screenshot regression on catalog and order ticket screens

### Accessibility

Markets V1 targets WCAG 2.1 AA alignment per [android/ACCESSIBILITY_PERFORMANCE_AND_DEVICES.md](../../android/ACCESSIBILITY_PERFORMANCE_AND_DEVICES.md):
- Semantic headings on market detail
- TalkBack labels on order book rows
- Minimum 48dp touch targets on trade buttons
- Respect system font scaling (no hard-coded `sp` caps)

## Review Checklist

- [x] No new XML layout files in feature modules
- [x] OpenAPI codegen wired
- [x] Min/target SDK documented
- [x] Compose BOM version pinned in catalog
