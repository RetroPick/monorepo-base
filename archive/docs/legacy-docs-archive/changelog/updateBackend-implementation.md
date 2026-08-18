Implemented the backend-first refactor core for fast/cheap hybrid
  trading.

  What changed:

  - Added expanded backend schema in apps/backend/
    migrations/000004_market_live_projections.up.sql:1:
    realtime_events, WS observability, market/user projections,
    submitted tx tracking, funding/balance tables, and price candles.
  - Added reusable realtime envelope/store in apps/backend/internal/
    realtime/realtime.go:18.
      - update market pools/probabilities
      - update indexed user positions
      - insert durable realtime events and notify after commit
  - Reworked WS hub to support channel subscriptions and drop slow
    consumers, with a focused test.
  - Changed user positions and portfolio summary to use indexed
    projections by default; source=live remains the RPC fallback.
  - Added backend tx endpoints:
      - POST /api/v1/tx/prepare/enter
      - POST /api/v1/tx/prepare/switch
      - POST /api/v1/tx/prepare/claim
      - POST /api/v1/tx/submit
  - Added backend funding/balance/chart REST surfaces:
      - /api/v1/user/balance
      - /api/v1/funding/intents...
      - /api/v1/markets/{templateId}/chart

  Verification:

  - Passed: go test ./cmd/api ./internal/indexer ./internal/pglisten ./
    internal/realtime ./internal/wshub
  - Passed: pnpm --filter web exec tsc --noEmit
  - Full go test ./... still fails on the existing faucet relay tests
    expecting non-501 responses:
    TestUserFaucetRelayHandler_wrongChain,
    TestUserFaucetRelayHandler_invalidJSON.

  Not implemented yet: actual LI.FI route fetching, destination USDC
  transfer indexing/credit worker, live marketdata ingestion, and gRPC.
  The DB/API seams for those are now in place.