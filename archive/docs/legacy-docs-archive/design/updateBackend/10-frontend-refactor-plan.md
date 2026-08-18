# 10 — Frontend Refactor Plan

## 1. Target structure

```txt
src/
  components/
    market/
    chart/
    deposit/
    portfolio/
    ops/
  hooks/
    useMarketSnapshot.ts
    useMarketRealtime.ts
    usePriceChart.ts
    useDepositIntent.ts
    useUserBalance.ts
    useUserPositions.ts
    useRealtimeConnection.ts
  lib/
    api/
    realtime/
    wallet/
```

## 2. Component update map

| Component | Snapshot | Live event |
|---|---|---|
| MarketHeader | `/markets/{id}` | `epoch_opened/locked/resolved` |
| EpochTimer | `/markets/{id}` | status event + local timer |
| PoolBars | `/markets/{id}` | `pool_update` |
| ProbabilityDisplay | derived | `pool_update` |
| PriceChart | `/chart` | `candle_updated` |
| OracleBadge | `/oracle` | `oracle_tick/stale/recovered` |
| DepositModal | `/funding/intents` | `deposit_*` |
| BalanceCard | `/user/balance` | `balance_update` |
| PositionCard | `/user/positions` | `position_update` |
| ClaimButton | `/user/claims` | `claimable_update` |

## 3. Market page flow

```txt
GET /api/v1/markets/{templateId}
GET /api/v1/markets/{templateId}/chart
GET /api/v1/user/positions if connected

Subscribe:
market:{templateId}
oracle:{feedId}
chart:{feedId}:60
user:{address}
```

## 4. Do not stream countdowns

Backend sends:

```txt
lockAt
resolveAt
status changes
```

Frontend calculates countdown locally.

## 5. Deposit modal states

```txt
IDLE
CREATING_INTENT
SCANNING_BALANCES
OPTIONS_READY
ROUTE_SELECTED
AWAITING_SIGNATURE
EXECUTING
SOURCE_TX_SUBMITTED
BRIDGING
CREDITED
FAILED
```

## 6. Performance rules

```txt
Do not rerender entire market page per tick.
Use component selectors.
Throttle chart updates to 1/sec.
Batch WS events in requestAnimationFrame.
Do not store huge event history in React state.
```

## 7. Error UX

```txt
Live updates paused. Reconnecting…
Syncing latest market state…
Your source transaction is confirmed. Bridge is processing.
Your USDC balance is ready.
This market already locked. Your funds are safe in RetroPick balance.
```
