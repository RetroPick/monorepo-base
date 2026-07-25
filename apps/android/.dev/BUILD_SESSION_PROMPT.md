# Build Session Prompt — RetroPick Markets Android (PHASE-1 Scaffold)

Copy everything between **PROMPT START** and **PROMPT END** into a new Cursor session.
Open the monorepo root: `retropick/` (not only `apps/android`).

Attach or ensure the agent can read:

- This file: `apps/android/.dev/BUILD_SESSION_PROMPT.md`
- `.dev/markets-v1/agent-harness/AGENT_OPERATING_CONTRACT.md`
- `.dev/ANDROID_MARKETS.md`
- `schemas/openapi/markets-v1.yaml`
- `docs/ARCHITECTURE.md`

---

## PROMPT START

You are a senior Android engineer implementing the **first buildable RetroPick Markets Android app** — a **PHASE-1 read-only scaffold** (catalog + platform status). This is **not** full trading (PHASE-3+) or wallet flows (PHASE-2).

### Mission

Greenfield a native Android app under `apps/android/` that:

1. **Compiles and runs** in Android Studio (minSdk 26, targetSdk 35, compileSdk 35).
2. **Consumes the Markets BFF only** — never Polymarket Gamma/CLOB directly, never legacy epoch APIs.
3. Shows **eligibility**, **capabilities**, and **events catalog** from the Go backend.
4. Establishes the **module graph and architecture** that PHASE-5 will extend.

### Non-negotiable boundaries

| Rule | Detail |
|------|--------|
| Markets only | No PRISM, no `contracts/prism/`, no legacy `/api/v1/legacy/markets/*` |
| BFF only | Base URL points to RetroPick backend; paths from `schemas/openapi/markets-v1.yaml` |
| Stack | **Kotlin + Jetpack Compose + Material 3** (ADR-006). No XML Views, no Flutter/RN/KMP |
| No trading yet | No wallet connect, no CLOB, no signing, no order submission |
| No key custody | Do not add code that stores/generates seed phrases or private keys |
| No hidden adapter | No duplicated Polymarket client inside the app |

### Current repo state (do not re-audit from scratch)

- `apps/android/` is **README-only** — no Gradle project exists yet.
- Backend BFF: `apps/backend/internal/markets/` with routes:
  - `GET /api/v1/markets/eligibility`
  - `GET /api/v1/markets/capabilities`
  - `GET /api/v1/markets/events?cursor=&limit=`
- OpenAPI stub: `schemas/openapi/markets-v1.yaml` (3 endpoints above).
- Web reference (behavior only): `apps/web/src/products/markets/` — `marketsApi.ts`, `MarketsHomePage.tsx`.
- Shared TS types (reference): `packages/polymarket/src/types.ts`.

### Target module graph

```text
apps/android/
├── settings.gradle.kts
├── build.gradle.kts
├── gradle/libs.versions.toml
├── gradle.properties
├── gradlew + gradle/wrapper/
├── app/                    # Application (Compose entry, Hilt)
├── core/
│   ├── common/
│   ├── network/            # Retrofit, OkHttp, MarketsApi
│   ├── model/              # DTOs matching OpenAPI
│   └── design/             # Material 3 theme
├── feature/
│   └── catalog/            # Home: status + events list
└── README.md               # Real build/run instructions
```

**Dependency direction:** `app` → `feature/*` → `core/*`. Features do not depend on each other.

### Tech stack

| Layer | Library |
|-------|---------|
| UI | Compose BOM, Material 3, Navigation Compose |
| DI | Hilt |
| Network | Retrofit 2, OkHttp 4, Kotlinx Serialization or Moshi |
| Async | Coroutines, Flow, lifecycle-viewmodel-compose |
| Testing | JUnit, MockWebServer, Turbine, Compose UI test (optional) |

Do **not** add Room, WalletConnect, or Web3 libraries in this session.

### API DTOs (mirror OpenAPI)

Implement `EligibilityResponse`, `CapabilitiesResponse`, `EventSummary`, `EventsListResponse` and:

```kotlin
interface MarketsApi {
    @GET("/api/v1/markets/eligibility")
    suspend fun getEligibility(): EligibilityResponse

    @GET("/api/v1/markets/capabilities")
    suspend fun getCapabilities(): CapabilitiesResponse

    @GET("/api/v1/markets/events")
    suspend fun listEvents(
        @Query("cursor") cursor: String? = null,
        @Query("limit") limit: Int? = null,
    ): EventsListResponse
}
```

### Configuration

- `BuildConfig.MARKETS_API_BASE_URL`:
  - **debug:** `http://10.0.2.2:8080` (emulator → host Go API)
  - **release:** placeholder documented in README (no invented prod URL)
- Document physical device setup (`adb reverse tcp:8080 tcp:8080` or LAN IP).

### UI requirements

Single-activity Compose home screen:

1. Loading, error-with-retry, and success states.
2. Status card: eligibility + capabilities (match web MarketsHomePage information).
3. Events list with title/slug; empty state; show `source`.
4. Pull-to-refresh.
5. Material 3 light theme (dark optional).

### Architecture

- `MarketsRepository` + impl; `CatalogViewModel` with `StateFlow` UiState.
- No business logic in Composables.

### Must create

- Full Gradle project with wrapper
- Hilt Application + MainActivity
- Network module, repository, ViewModel, Compose UI
- At least one unit test (MockWebServer for `/api/v1/markets/events`)
- Updated `apps/android/README.md`
- `apps/android/.dev/BUILD_LOG.md` with commands run and results

### Must NOT touch

- `apps/backend/internal/legacy/**`, `contracts/**`, legacy web routes, PRISM

### Verification

```bash
cd apps/android
./gradlew :app:assembleDebug
./gradlew testDebugUnitTest
```

With backend running: `curl -s http://127.0.0.1:8080/api/v1/markets/events`

### Docs to update after build

- `.dev/markets-v1/android/GRADLE_MODULE_GRAPH.md` — actual module names
- Do not mark PHASE-5 complete (PHASE-1 scaffold only)

### Acceptance criteria

- [ ] `assembleDebug` succeeds
- [ ] App launches without crash
- [ ] BFF data or explicit error UI (no silent failure)
- [ ] No calls to gamma-api.polymarket.com or legacy markets API
- [ ] README has emulator + device instructions
- [ ] At least one unit test passes

### Out of scope

Wallet, CLOB, trading, FCM, Play Store release, OpenAPI codegen plugin (manual DTOs OK for 3 endpoints)

### Execution order

1. Read agent contract + OpenAPI + web `marketsApi.ts`
2. Scaffold Gradle + version catalog
3. core/model, core/network, Hilt
4. feature/catalog ViewModel + UI
5. app module + manifest
6. Unit test + gradle verify
7. README + BUILD_LOG

Do not invent test results or API responses.

## PROMPT END

---

## Operator notes

- **Harness task:** `MKT-P1-007` (scaffold) — code implementation
- **Start backend:** `apps/backend` on `:8080` before live catalog test
- **Emulator:** `10.0.2.2` = host localhost
