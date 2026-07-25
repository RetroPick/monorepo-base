# RetroPick Markets — Android

Native **Markets-only** client (Kotlin + Jetpack Compose). Consumes the shared Markets BFF — not Polymarket APIs directly.

## Status

**Not buildable yet.** No Gradle project on disk. Use the build prompt for the next implementation session.

## Next session

Copy the prompt from:

**[.dev/BUILD_SESSION_PROMPT.md](.dev/BUILD_SESSION_PROMPT.md)**

## Specs

- Product: [.dev/ANDROID_MARKETS.md](../../.dev/ANDROID_MARKETS.md)
- Architecture: [.dev/markets-v1/android/](../.dev/markets-v1/android/)
- OpenAPI: [schemas/openapi/markets-v1.yaml](../../schemas/openapi/markets-v1.yaml)
- Agent contract: [.dev/markets-v1/agent-harness/AGENT_OPERATING_CONTRACT.md](../../.dev/markets-v1/agent-harness/AGENT_OPERATING_CONTRACT.md)

## Target stack

Kotlin, Jetpack Compose, Material 3, Hilt, Retrofit, Coroutines/Flow (ADR-006).
