# 15 — Codex Implementation Prompt

```txt
You are a senior backend + frontend integration engineer refactoring RetroPick into a realtime prediction-market app.

Read:
- README.md
- 01-system-target-architecture.md
- 02-api-classification-matrix.md
- 03-backend-service-refactor.md
- 04-realtime-event-model.md
- 05-websocket-gateway-spec.md
- 06-grpc-internal-service-spec.md
- 07-database-schema-updates.md
- 08-market-data-and-chart-service.md
- 09-deposit-realtime-flow.md
- 10-frontend-refactor-plan.md
- 11-frontend-hooks-and-state.md
- 12-operator-dashboard-realtime.md
- 13-security-reliability-observability.md
- 14-rollout-plan.md

Goal:
Make RetroPick update frontend components in real time without page reloads while keeping PostgreSQL and chain events as durable truth.

Rules:
- REST is for snapshots, commands, auth, pagination, history.
- WebSocket is for live deltas and async progress.
- gRPC is internal only and added after boundaries stabilize.
- PostgreSQL remains durable truth.
- WebSocket events are never financial truth.
- All financial mutations must be verified through DB transactions and/or chain events.

Phase 1:
1. Add realtime_events migration.
2. Add ws_connections/ws_subscriptions migrations.
3. Implement EventEnvelope type.
4. Implement RealtimePublisher.
5. Implement /ws gateway:
   - subscribe
   - unsubscribe
   - ping/pong
   - resume
   - channel authorization
   - lastSeq replay
   - resync_required
6. Add metrics.

Phase 2:
1. Update chain indexer to insert realtime_events for:
   - pool_update
   - epoch_opened
   - epoch_locked
   - epoch_resolved
   - position_update
   - claimable_update
2. Frontend:
   - add ws client
   - add useRealtimeConnection
   - add useMarketSnapshot
   - add useMarketRealtime
   - update PoolBars/EpochTimer/MarketHeader.

Phase 3:
1. Add user:{address} channel.
2. Emit balance_update and position_update.
3. Enforce user channel auth.
4. Update BalanceCard/Portfolio.

Phase 4:
1. Add funding_intents, funding_route_options, funding_transactions, destination_usdc_transfers.
2. Add funding REST endpoints.
3. Add deposit:{intentId} channel.
4. Implement destination USDC indexer.
5. Implement idempotent credit worker.
6. Update DepositModal target amount flow.

Phase 5:
1. Add price_candles.
2. Add MarketDataService.
3. Add chart endpoint.
4. Add chart:{feed}:{interval} channel.
5. Update PriceChart.

Phase 6:
1. Add ops channels.
2. Emit keeper/oracle/indexer/deposit ops events.
3. Update operator dashboard.

Tests:
- user cannot subscribe to another user's channel
- operator channel rejects normal user
- reconnect with lastSeq replays missed events
- resync_required triggers REST refetch
- pool_update updates PoolBars without reload
- epoch_locked disables deposit form
- deposit_credited updates BalanceCard
- duplicate deposit credit impossible
- realtime event emitted only after DB commit

Do not:
- replace REST snapshots with WS-only loading
- add Kafka/Redis/NATS before measured need
- send timer ticks every second
- trust frontend deposit amounts
- allow arbitrary tokens into MarketEngine
- expose gRPC publicly

Output:
- migrations
- backend code
- WebSocket gateway
- frontend hooks/components
- tests
- README update
```
