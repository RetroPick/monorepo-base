# 09 — Deposit Realtime Flow

## 1. Target UX

```txt
User enters: “I want to deposit $25”
RetroPick checks wallet balances
RetroPick finds best token/chain route
User reviews: “Use 0.0079 ETH on Arbitrum”
Wallet confirms selected route
LI.FI swaps/bridges into Base USDC
RetroPick credits user balance
```

## 2. Invariant

```txt
Any source token/chain is only for funding.
RetroPick balance and MarketEngine remain USDC-only.
```

## 3. State machine

```txt
CREATED
BALANCE_SCANNING
OPTIONS_READY
ROUTE_SELECTED
AWAITING_WALLET_SIGNATURE
EXECUTION_STARTED
SOURCE_TX_SUBMITTED
BRIDGING
DESTINATION_USDC_DETECTED
CREDITING
CREDITED
FAILED
EXPIRED
MANUAL_REVIEW
REFUNDED
```

## 4. REST + WebSocket split

| Step | Transport |
|---|---|
| Create intent | REST |
| Get options | REST |
| Select route | REST |
| Wallet signature | wallet |
| Source tx submitted | REST from frontend |
| Bridge progress | WS `deposit:{id}` |
| USDC detected | indexer + WS |
| Balance credited | DB tx + WS `user:{address}` |

## 5. Endpoints

```http
POST /api/v1/funding/intents
GET  /api/v1/funding/intents/{id}
GET  /api/v1/funding/intents/{id}/options
POST /api/v1/funding/intents/{id}/select-route
POST /api/v1/funding/intents/{id}/execution-started
POST /api/v1/funding/intents/{id}/source-tx
POST /api/v1/funding/intents/{id}/route-update
```

## 6. Channels

```txt
deposit:{fundingIntentId}
user:{walletAddress}
ops:deposits
```

## 7. Route scoring

```txt
score =
  estimatedUsdcReceived
  - gasCostPenalty
  - durationPenalty
  - slippagePenalty
  - providerRiskPenalty
  - stepCountPenalty
```

Route must satisfy:

```txt
minUsdcReceived >= targetUsdcAmount
source balance sufficient
source chain/token allowlisted
destination forced to Base USDC
provider/tool not denied
```

## 8. Credit transaction

Inside one DB transaction:

```txt
lock funding_intent
verify not credited
verify destination USDC transfer
insert balance_ledger
update user_balances
mark funding_intent CREDITED
insert deposit_credited event
insert balance_update event
commit
```

## 9. Events

`deposit_options_ready`:

```json
{
  "type": "deposit_options_ready",
  "channel": "deposit:dep_123",
  "payload": {
    "recommended": {
      "display": "Use 0.0079 ETH on Arbitrum",
      "estimatedUsdcReceived": "25210000",
      "minUsdcReceived": "25000000"
    }
  }
}
```

`deposit_credited`:

```json
{
  "type": "deposit_credited",
  "channel": "deposit:dep_123",
  "payload": {
    "creditedAmount": "25180000"
  }
}
```

`balance_update`:

```json
{
  "type": "balance_update",
  "channel": "user:0xuser",
  "payload": {
    "available": "25180000",
    "delta": "25180000",
    "reason": "CROSS_CHAIN_DEPOSIT_CREDIT"
  }
}
```

## 10. Market safety

Default V1:

```txt
cross-chain deposit → USDC balance → user enters market from balance
```

Optional later:

```txt
auto-enter if funds arrive before lockAt - safetyBuffer
else credit balance
```

Safety buffer:

```txt
60–120 seconds
```
