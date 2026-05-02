# 12 — Codex Implementation Prompt

Copy this into Codex/Cursor inside the RetroPick repo.

```txt
You are a senior backend and integration engineer implementing RetroPick's target-amount funding intent flow.

Product goal:
Users enter a target deposit amount like "$25". RetroPick scans supported wallet balances, finds the best token/chain route, shows "Use 0.0079 ETH on Arbitrum", the user confirms in wallet, LI.FI swaps/bridges into Base USDC, and RetroPick credits the user's USDC balance.

Architecture constraints:
- MarketEngine must remain USDC-only.
- Destination chain/token/address must be forced by backend config.
- Frontend must never control settlement destination.
- Credit only after destination-chain Base USDC Transfer logs are verified.
- Use balance-first architecture: deposit credits RetroPick USDC balance; market entry happens separately.
- Do not support multi-source balance combining in V1.

Read these docs first:
- README.md
- 01-target-intent-architecture.md
- 02-funding-intent-state-machine.md
- 03-backend-api-spec.md
- 04-database-schema.md
- 05-lifi-exact-output-and-quote-engine.md
- 06-balance-discovery-and-route-selection.md
- 07-workers-indexing-and-crediting.md
- 08-smart-contract-interfaces.md
- 09-frontend-integration-contract.md
- 10-security-risk-controls.md
- 11-rollout-plan.md

Implement in phases.

Phase 1: Database and models
1. Add migrations/models for:
   - funding_intents
   - wallet_balance_snapshots
   - funding_options
   - funding_executions
   - route_update_events
   - destination_transfers
   - user_balances
   - balance_ledger
   - market_entries
   - provider_tools_policy
2. Amounts must be integer base units.
3. Add unique constraints:
   - funding_intents(user_address, client_nonce)
   - funding_executions(source_chain_id, source_tx_hash)
   - destination_transfers(chain_id, tx_hash, log_index)
   - balance_ledger(idempotency_key)

Phase 2: Funding intent API
1. Add:
   - GET /api/funding/config
   - POST /api/funding/intents
   - POST /api/funding/intents/:intentId/scan-balances
   - GET /api/funding/intents/:intentId/options
   - POST /api/funding/intents/:intentId/select-option
   - GET /api/funding/intents/:intentId
   - GET /api/users/:address/balance
2. Validate target amount.
3. Convert USD/USDC display amount to USDC base units.
4. Enforce amount limits.
5. Force settlement:
   - SETTLEMENT_CHAIN_ID=8453
   - SETTLEMENT_USDC_ADDRESS
   - DEPOSIT_ROUTER_ADDRESS

Phase 3: Balance discovery
1. Scan only allowlisted chains/tokens:
   - Base, Arbitrum, Optimism, Ethereum, Polygon
   - native gas token, USDC, USDT, WETH, DAI
2. Use RPC balanceOf/eth_getBalance or an existing balance provider.
3. Apply gas reserve rules.
4. Store wallet_balance_snapshots.
5. Generate candidate balances that can plausibly cover target + buffer.

Phase 4: LI.FI quote engine
1. Install @lifi/sdk.
2. Configure LI.FI SDK/API with:
   - LIFI_API_KEY
   - Base/Arbitrum/Optimism/Ethereum/Polygon RPC URLs
   - integrator='RetroPick'
3. Implement QuoteEngine:
   - try exact-output quote if available
   - fallback to iterative exact-input solver
   - require minToAmount >= targetUsdcAmount
   - reject denied tools
   - reject price impact > policy
   - rank options by cost/duration/risk
4. Store route snapshots in funding_options.

Phase 5: Route selection and frontend execution
1. Add:
   - POST /api/funding/executions/:executionId/start
   - POST /api/funding/executions/:executionId/route-update
   - POST /api/funding/executions/:executionId/source-tx
2. Frontend uses executeRoute(serializedRoute).
3. updateRouteHook sends route updates and tx hashes to backend.
4. Backend stores updates but never credits based only on frontend data.

Phase 6: Destination indexing and crediting
1. Implement Base USDC ERC-20 Transfer log indexer.
2. Filter:
   - token == SETTLEMENT_USDC_ADDRESS
   - to == DEPOSIT_ROUTER_ADDRESS or vault
3. Persist destination_transfers.
4. Match transfers to funding_executions using:
   - provider status/source tx if available
   - receiver
   - amount >= minToAmount
   - time window
   - expected amount closeness
5. Credit idempotently in DB transaction:
   - lock execution
   - lock intent
   - write balance_ledger
   - upsert user_balances
   - mark transfer credited
   - mark intent CREDITED

Phase 7: Market entry
1. Add POST /api/markets/:marketId/enter.
2. Verify market open and now < lockAt - safetyBuffer.
3. Verify user balance.
4. Debit available balance via ledger.
5. Call MarketEngine.depositFor.
6. Record market_entries.

Phase 8: Tests
Add tests for:
- target amount validation
- unsupported chain rejected
- unsupported token rejected
- backend forces destination
- no funding options
- quote expiration
- minToAmount below target rejected
- duplicate source tx rejected
- duplicate destination transfer rejected
- duplicate credit blocked
- bridge late arrival credits balance
- market locked does not lose deposit
- vault solvency reconciliation

Do not:
- Add arbitrary-token support to MarketEngine.
- Let frontend set destination chain/token/address.
- Credit based on frontend route update only.
- Combine multiple balances in V1.
- Auto-enter market without explicit user opt-in and lock safety buffer.

Output:
- Code changes
- Migrations
- Tests
- README/env updates
- Local run instructions
```
