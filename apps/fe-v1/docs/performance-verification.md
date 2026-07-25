## FE-V1 Prediction Market Performance Verification

### Scope
- Validate backend-first trade/funding integration on `apps/fe-v1`.
- Ensure websocket + polling strategy is low-churn and resilient.

### Core Checks
- Trade submit flow: wallet sign to `/api/v1/tx/submit` acknowledgment < 2.0s p50 (excluding chain inclusion).
- Funding intent flow: create intent + route options loaded < 1.5s p50 on local/staging API.
- Portfolio initial render (connected): first meaningful positions table paint < 2.5s p50.
- Market detail chart refresh: websocket update reflected in UI < 1.0s p50 when event channel is healthy.

### Request Budget
- Portfolio page: max 1 `markets` + 1 `positions` + 1 `claims` + 1 `events` + 1 `portfolio-summary` + 1 `watchlist` + 1 batched outcome query on first load.
- Avoid repeated broad invalidation (`["retropick-api"]`) during steady websocket traffic.
- Probability polling fallback fixed to >= 20s interval when websocket connected.

### Load/Resilience
- Simulate websocket disconnect for 60s; app should reconnect with exponential backoff and continue rendering stale data without crash.
- Simulate 429/5xx on API: retries should backoff and UI should show non-blocking error summaries.
- Verify no request storm on wallet connect/disconnect (max 2 invalidation bursts).

### Acceptance
- No auth-required endpoint returns `401` when JWT is present.
- No critical trade/funding action depends on legacy relayer endpoints.
- Lighthouse interaction responsiveness (market page) remains >= 90 on local production build.

