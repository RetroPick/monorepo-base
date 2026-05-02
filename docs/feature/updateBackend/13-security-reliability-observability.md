# 13 — Security, Reliability, Observability

## 1. Security principle

```txt
Frontend and WebSocket are never financial truth.
Only chain events, verified transfers, and backend transactions mutate balances.
```

## 2. WebSocket authorization

```txt
public channels: open
user channels: JWT address must match
deposit channels: JWT user must own intent
ops channels: operator allowlist
```

## 3. Client cannot publish financial events

Client may send:

```txt
subscribe
unsubscribe
resume
ping
```

Client may not send:

```txt
balance_update
pool_update
deposit_credited
position_update
```

## 4. Idempotency

Use unique keys:

```txt
chain:{chainId}:{txHash}:{logIndex}
funding-source:{chainId}:{txHash}
deposit-credit:{intentId}
ledger:{reason}:{referenceId}
```

## 5. Rate limits

```txt
public REST: 60 req/min/IP
auth REST: 120 req/min/user
funding quote: 20 req/min/user
WS connections: 5/user, 20/IP
max channels: 50/connection
```

## 6. Metrics

```txt
ws_connections_active
ws_messages_sent_total
ws_resync_required_total
realtime_events_inserted_total
realtime_event_delivery_latency_ms
marketdata_ticks_total
funding_intents_total{status}
deposit_credit_latency_seconds
keeper_executions_total{action,result}
oracle_staleness_seconds
indexer_lag_blocks
```

## 7. Critical alerts

```txt
vault balance < user liabilities
deposit credited without verified transfer
duplicate credit attempt
oracle stale beyond max delay
keeper buffer expired
indexer lag > threshold
WebSocket gateway cannot read realtime_events
```

## 8. Testing requirements

Backend:

```txt
channel authorization
event replay after lastSeq
resync_required path
deposit credit idempotency
duplicate transfer rejection
market pool event broadcast
user cannot subscribe to other user
operator channel rejects normal user
```

Frontend:

```txt
snapshot loads first
pool_update updates PoolBars
epoch_locked disables deposit form
deposit_credited updates BalanceCard
reconnect resumes subscriptions
resync_required refetches snapshot
```
