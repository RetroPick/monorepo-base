# Pipeline Architecture Scaffold

## Purpose

The pipeline turns chain events into indexed state, schedules keeper work, tracks oracle health, and opens operator incidents. It follows the public-RPC optimized architecture in [../.tecStackPublicRPC.md](../.tecStackPublicRPC.md).

## Services

| Service | Responsibility | RPC policy |
|---|---|---|
| `retropick-index` | Batched log indexing, state projection, reorg handling | `eth_getLogs` batched, `eth_blockNumber`, rare header reads for reorgs |
| `retropick-keeper` | Execute scheduled lifecycle jobs | PG-driven idle loop, one live chain preflight per execution |
| `retropick-alert` | Incidents, alert routing, oracle stale checks | PostgreSQL only in normal operation |
| `retropick-reporter` | TrustedReporter signing and posting | Only for reporter-enabled templates |

The old idle oracle polling service should not be implemented. Oracle health comes from indexed Chainlink feed events and `oracle_health` rows.

## Indexer Inputs

Contract log sources:

- MarketEngine proxy with `MarketEngineDispatcher` ABI
- TrustedReporter adapter if deployed/configured
- TokenFaucet on Base Sepolia
- MockERC20 stake token on Base Sepolia
- Chainlink feed proxy addresses listed in `feed_registry`

Do not index module addresses for normal protocol state. Modules are routing targets, not the user-facing event source.

## MarketEngine Event Map

| Event group | Events | Projection target |
|---|---|---|
| Template | `TemplateUpserted`, `MarketInitialized` | `templates`, `audit_log` |
| Epoch lifecycle | `EpochOpened`, `EpochLocked`, `EpochLockedV2`, `EpochResolved`, `EpochResolvedV2`, `EpochCancelled` | `epochs`, `keeper_schedule`, `chain_events` |
| User positions | `PositionDeposited`, `SideSwitched`, `Claimed`, `UserEpochIndexed` | `positions`, `user_epochs`, `epochs` |
| Rolling | `RollingGenesisStarted`, `RollingGenesisLocked`, `RollingRoundExecuted`, `RollingHalted`, `RollingLifecycleReset` | `ledgers`, `epochs`, `keeper_schedule`, `incidents` |
| Yield/recovery | `YieldRouterSet`, `YieldRouterDisabled`, `YieldRouterFailureRecorded`, `YieldEmergencyWithdrawn`, `EpochYieldAccrued`, routed-claims events | `operator_state`, `epochs`, `incidents`, `audit_log` |
| Governance | `Upgraded`, module events, selector events, oracle setter events, role updates | `audit_log`, `incidents` |
| Fees/LM | `FeesWithdrawn`, `LMRewardReceived`, `LMRewardsEnabledUpdated` | `audit_log`, `operator_state` |

## Reporter Event Map

TrustedReporter events should populate oracle/reporter audit state:

- `ResultPosted`
- `LockSamplePosted`
- `OhlcPosted`
- `ResolveResultCleared`
- `LockSampleCleared`
- `OhlcResultCleared`
- `TrustedReporterUpdated`
- `MaxSignatureAgeUpdated`
- ownership events

Reporter incidents should link market ID to `positionKey(templateId, epochId)` where applicable.

## Chainlink Feed Event Map

Index Chainlink `AnswerUpdated(int256 current, uint256 roundId, uint256 updatedAt)` from active feed proxies.

Projection:

- `oracle_readings`
- `oracle_health`
- `feed_registry.last_healthy_at`
- `keeper_schedule` preflight context
- `ops:oracle` WebSocket notifications

Do not call every adapter every minute for feed freshness. The alert service can compute staleness from indexed feed events.

## Keeper Scheduler

Schedule jobs from indexed events:

- after `EpochOpened`: schedule `lockEpoch`
- after `EpochLocked`: schedule `resolveEpoch`
- after `RollingGenesisStarted`: schedule `genesisLockRolling`
- after `RollingGenesisLocked`: schedule `executeRollingRound`
- after `RollingRoundExecuted`: schedule next `executeRollingRound`
- after halt/cancel/reset events: update or disable affected jobs

Keeper job fields:

- `id`
- `template_id`
- `epoch_id`
- `action`
- `scheduled_at`
- `window_end_at`
- `status`
- `attempt_count`
- `last_error`
- `tx_hash`
- `preflight_snapshot`

## Keeper Execution Rule

Before broadcasting:

1. lock the job row with `FOR UPDATE SKIP LOCKED`
2. record an execution attempt
3. validate PG projected state
4. perform one live chain read for the minimum required state
5. build/sign/send transaction
6. wait for receipt with backoff
7. write receipt and post-state validation

Never run an idle loop that calls `eth_call` every few seconds.

## Reorg Handling

Indexer must store:

- block number
- block hash
- parent hash if available
- log index
- transaction hash
- removed flag

On suspected reorg:

1. stop applying new projections
2. locate common ancestor within configured depth
3. roll back affected projections or rebuild from canonical event log rows
4. re-apply canonical logs
5. emit an incident if depth exceeds threshold

## Core Tables

Minimum schema ownership:

- `chain_events`
- `indexer_state`
- `contracts`
- `templates`
- `ledgers`
- `epochs`
- `positions`
- `user_epochs`
- `oracle_readings`
- `oracle_health`
- `feed_registry`
- `keeper_schedule`
- `keeper_executions`
- `incidents`
- `audit_log`

## Public RPC Policy

Default endpoint order for Base mainnet profile:

- `https://mainnet.base.org`
- `https://base.llamarpc.com`
- `https://1rpc.io/base`
- `https://base-mainnet.public.blastapi.io`
- `https://base.rpc.thirdweb.com`

Base Sepolia should use equivalent public or configured testnet endpoints from environment config.

RPC budget target:

- indexer: one batched `eth_getLogs` poll per interval
- keeper: one live read and one transaction path per actual execution
- API: zero routine chain calls
- alerting: zero routine chain calls

Paid RPC is added only after measured public endpoint error rate, latency, or scale requires it.

## Alert Rules

Open or update incidents for:

- rolling halt
- keeper missed or nearly missed window
- keeper tx failure
- yield router disabled
- unreconciled recovered amount
- stale feed for active template
- unexpected implementation upgrade
- unexpected module/selector event
- oracle cursor reset
- reporter clear/rotation/post outside schedule

Every incident should link:

- environment
- chain id
- template id
- epoch id if applicable
- transaction hash
- event name
- decoded event payload
- runbook section
