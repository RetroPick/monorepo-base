# 05 — WebSocket Gateway Spec

## 1. Endpoint

```txt
wss://api.retropick.xyz/ws
```

Auth:

```txt
Authorization: Bearer <jwt>
or ?token=<jwt>
```

## 2. Client messages

Subscribe:

```json
{
  "type": "subscribe",
  "requestId": "req_1",
  "channels": ["market:btc-direction-1h"],
  "lastSeq": 100
}
```

Unsubscribe:

```json
{
  "type": "unsubscribe",
  "channels": ["market:btc-direction-1h"]
}
```

Resume:

```json
{
  "type": "resume",
  "subscriptions": [
    {"channel": "market:btc-direction-1h", "lastSeq": 100}
  ]
}
```

Ping:

```json
{"type":"ping","ts":1777710000}
```

## 3. Server messages

Subscribed:

```json
{"type":"subscribed","channels":["market:btc-direction-1h"]}
```

Event:

```json
{"type":"event","event":{"seq":101,"type":"pool_update","channel":"market:btc-direction-1h","payload":{}}}
```

Resync:

```json
{"type":"resync_required","channel":"market:btc-direction-1h","reason":"SEQUENCE_GAP"}
```

Error:

```json
{"type":"error","error":{"code":"UNAUTHORIZED_CHANNEL","message":"Not allowed"}}
```

## 4. Authorization

| Channel | Rule |
|---|---|
| `global:markets` | public |
| `market:{id}` | public |
| `oracle:{feed}` | public |
| `chart:{feed}:{interval}` | public |
| `user:{address}` | JWT address must match |
| `deposit:{id}` | JWT user must own intent |
| `ops:*` | operator allowlist |

## 5. Backpressure

```txt
send buffer per client: 256 messages
if buffer full: disconnect client
client reconnects and resumes with lastSeq
```

## 6. Heartbeat

```txt
server ping every 25s
client pong within 10s
disconnect after 2 missed pongs
```

## 7. Rate limits

```txt
max channels per connection: 50
max subscription messages per minute: 30
max connections per user: 5
max connections per IP: 20
```

## 8. Reconnect strategy

Frontend:

```txt
1s, 2s, 5s, 10s, 30s backoff
on reconnect send resume
if resync_required refetch REST snapshot
```
