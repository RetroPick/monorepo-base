# 02 — API Classification Matrix

## 1. Classification rule

| Interaction type | Transport |
|---|---|
| Snapshot query | REST |
| Command | REST or wallet transaction |
| Live event | WebSocket |
| Async progress | WebSocket + REST fallback |
| Internal service call | Go interface first, gRPC later |
| Durable chain event | Indexer + PostgreSQL |
| Worker task | DB queue / SKIP LOCKED |

## 2. Product feature classification

| Feature | Initial | Mutation | Live update |
|---|---|---|---|
| Market list | REST | none | WS `global:markets` |
| Market detail | REST | none | WS `market:{id}` |
| Pool bars | REST | chain tx | WS `pool_update` |
| Probability | REST/derived | derived | WS `probability_update` or derive from pool |
| Epoch timer | REST timestamp | keeper/indexer | local timer + WS status |
| Price chart | REST candles | market data service | WS `candle_updated` |
| Oracle badge | REST | oracle/indexer | WS `oracle_tick/stale` |
| Deposit modal | REST intent/options | REST + wallet | WS `deposit:{id}` |
| User balance | REST | ledger update | WS `balance_update` |
| User positions | REST | chain tx/indexer | WS `position_update` |
| Claims | REST | claim tx | WS `claimable_update` |
| Operator keeper | REST | keeper | WS `ops:keeper` |
| Operator oracle | REST | oracle monitor | WS `ops:oracle` |
| Incidents | REST | alert/operator | WS `ops:incidents` |

## 3. Public REST endpoints

```http
GET /api/v1/health
GET /api/v1/ready
GET /api/v1/markets
GET /api/v1/markets/{templateId}
GET /api/v1/markets/{templateId}/epochs
GET /api/v1/markets/{templateId}/epochs/{epochId}
GET /api/v1/markets/{templateId}/chart?interval=60&limit=500
GET /api/v1/markets/{templateId}/oracle
```

## 4. User REST endpoints

```http
POST /api/v1/auth/nonce
POST /api/v1/auth/verify
DELETE /api/v1/auth/session

GET /api/v1/user/balance
GET /api/v1/user/positions
GET /api/v1/user/claims
GET /api/v1/user/history
GET /api/v1/user/deposits
```

## 5. Funding/deposit endpoints

```http
POST /api/v1/funding/intents
GET  /api/v1/funding/intents/{id}
GET  /api/v1/funding/intents/{id}/options
POST /api/v1/funding/intents/{id}/select-route
POST /api/v1/funding/intents/{id}/execution-started
POST /api/v1/funding/intents/{id}/source-tx
POST /api/v1/funding/intents/{id}/route-update
```

## 6. Market command endpoints

If wallet-direct:

```http
POST /api/v1/tx/prepare/enter
POST /api/v1/tx/prepare/switch
POST /api/v1/tx/prepare/claim
POST /api/v1/tx/submit
```

If backend relayer:

```http
POST /api/v1/markets/{templateId}/enter
POST /api/v1/markets/{templateId}/switch
POST /api/v1/claims/{claimId}
```

## 7. WebSocket channels

Public:

```txt
global:markets
market:{templateId}
epoch:{templateId}:{epochId}
oracle:{feedId}
chart:{feedId}:{interval}
```

User:

```txt
user:{walletAddress}
deposit:{fundingIntentId}
position:{walletAddress}:{templateId}
claim:{walletAddress}
```

Operator:

```txt
ops:global
ops:keeper
ops:oracle
ops:incidents
ops:template:{templateId}
ops:deposits
ops:indexer
```
