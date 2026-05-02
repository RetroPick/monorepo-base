# 03 — Backend API Spec for Target-Amount Funding

Base path:

```txt
/api
```

## 1. Get deposit configuration

```http
GET /api/funding/config
```

Returns settlement destination and supported source policy.

```json
{
  "settlement": {
    "chainId": 8453,
    "chainName": "Base",
    "token": {
      "symbol": "USDC",
      "address": "0xBaseUsdc",
      "decimals": 6
    }
  },
  "limits": {
    "minDepositUsdc": "5000000",
    "softMaxDepositUsdc": "500000000",
    "hardMaxDepositUsdc": "2000000000"
  },
  "supportedSourceChains": [8453, 42161, 10, 1, 137],
  "supportedSourceTokens": {
    "8453": ["NATIVE", "USDC", "WETH"],
    "42161": ["NATIVE", "USDC", "USDT", "WETH"],
    "10": ["NATIVE", "USDC", "USDT", "WETH"],
    "1": ["NATIVE", "USDC", "USDT", "WETH", "DAI"],
    "137": ["NATIVE", "USDC", "USDT", "WETH"]
  }
}
```

## 2. Create target funding intent

```http
POST /api/funding/intents
```

### Request

```json
{
  "userAddress": "0xUser",
  "targetCurrency": "USD",
  "targetAmount": "25.00",
  "clientNonce": "uuid-from-client",
  "mode": "AUTO_BEST_SOURCE"
}
```

### Backend behavior

1. Validate wallet address.
2. Convert target amount to USDC base units.
3. Validate amount limits.
4. Force settlement chain/token/address from server config.
5. Create funding intent.
6. Start balance scan and quote generation synchronously or asynchronously.

### Response

```json
{
  "intentId": "fi_01H...",
  "status": "SCANNING_BALANCES",
  "target": {
    "currency": "USDC",
    "amount": "25000000",
    "displayAmount": "25.00"
  },
  "settlement": {
    "chainId": 8453,
    "tokenAddress": "0xBaseUsdc",
    "receiver": "0xDepositRouter"
  },
  "expiresAt": "2026-05-02T12:05:00.000Z"
}
```

## 3. Refresh balance scan

```http
POST /api/funding/intents/:intentId/scan-balances
```

Use when the user changes wallet, network, or wants to refresh options.

### Response

```json
{
  "status": "SCANNING_BALANCES"
}
```

## 4. Get funding options

```http
GET /api/funding/intents/:intentId/options
```

### Response

```json
{
  "intentId": "fi_01H...",
  "status": "OPTIONS_READY",
  "targetUsdcAmount": "25000000",
  "recommendedOptionId": "fo_01H...",
  "options": [
    {
      "optionId": "fo_01H...",
      "provider": "LIFI",
      "source": {
        "chainId": 42161,
        "chainName": "Arbitrum",
        "tokenSymbol": "ETH",
        "tokenAddress": "0x0000000000000000000000000000000000000000",
        "decimals": 18,
        "requiredAmount": "7900000000000000",
        "displayRequiredAmount": "0.0079"
      },
      "destination": {
        "chainId": 8453,
        "tokenSymbol": "USDC",
        "estimatedToAmount": "25210000",
        "minToAmount": "25000000"
      },
      "estimate": {
        "estimatedDurationSeconds": 120,
        "gasCostUsd": "0.18",
        "routeFeeUsd": "0.04",
        "priceImpactPct": "0.12",
        "slippagePct": "0.50"
      },
      "route": {
        "summary": "Arbitrum ETH -> Base USDC",
        "steps": [
          { "type": "swap", "tool": "1inch" },
          { "type": "bridge", "tool": "Across" }
        ]
      },
      "score": 91,
      "warnings": []
    }
  ]
}
```

## 5. Select funding option

```http
POST /api/funding/intents/:intentId/select-option
```

### Request

```json
{
  "optionId": "fo_01H..."
}
```

### Response

```json
{
  "intentId": "fi_01H...",
  "status": "ROUTE_SELECTED",
  "execution": {
    "executionId": "fe_01H...",
    "provider": "LIFI",
    "serializedRoute": {}
  }
}
```

## 6. Register execution started

```http
POST /api/funding/executions/:executionId/start
```

### Request

```json
{
  "walletAddress": "0xUser",
  "clientRouteExecutionId": "local-uuid"
}
```

### Response

```json
{
  "status": "EXECUTION_STARTED"
}
```

## 7. Submit route update

```http
POST /api/funding/executions/:executionId/route-update
```

Frontend sends LI.FI route updates from `updateRouteHook`.

```json
{
  "route": {},
  "observedTxHashes": [
    {
      "chainId": 42161,
      "txHash": "0x...",
      "stepIndex": 0,
      "type": "SOURCE"
    }
  ]
}
```

### Backend behavior

- Store provider route status snapshot.
- Persist source tx hash when observed.
- Never credit based on this update alone.

## 8. Submit source transaction hash

```http
POST /api/funding/executions/:executionId/source-tx
```

```json
{
  "chainId": 42161,
  "txHash": "0x..."
}
```

## 9. Get intent status

```http
GET /api/funding/intents/:intentId
```

```json
{
  "intentId": "fi_01H...",
  "status": "BRIDGING",
  "targetUsdcAmount": "25000000",
  "selectedOption": {
    "sourceChainId": 42161,
    "sourceTokenSymbol": "ETH",
    "sourceAmount": "7900000000000000"
  },
  "sourceTxHash": "0x...",
  "destinationTxHash": null,
  "creditedUsdcAmount": "0",
  "timeline": [
    { "name": "quote", "status": "DONE" },
    { "name": "wallet", "status": "DONE" },
    { "name": "bridge", "status": "PENDING" },
    { "name": "credit", "status": "WAITING" }
  ]
}
```

## 10. User balance

```http
GET /api/users/:address/balance
```

```json
{
  "userAddress": "0xUser",
  "asset": "USDC",
  "chainId": 8453,
  "available": "25180000",
  "locked": "0",
  "decimals": 6
}
```

## 11. Enter market from balance

```http
POST /api/markets/:marketId/enter
```

```json
{
  "userAddress": "0xUser",
  "outcomeId": 1,
  "amount": "10000000"
}
```

Backend behavior:

1. Verify market is open.
2. Verify `now < lockAt - safetyBuffer`.
3. Verify available balance.
4. Debit user balance idempotently.
5. Call `MarketEngine.depositFor`.
6. Record market entry.

## 12. Error model

```json
{
  "error": {
    "code": "NO_FUNDING_OPTIONS",
    "message": "No supported wallet balance can cover this deposit amount.",
    "details": {
      "targetUsdcAmount": "25000000"
    }
  }
}
```

Common codes:

```txt
INVALID_TARGET_AMOUNT
TARGET_TOO_LOW
TARGET_TOO_HIGH
UNSUPPORTED_WALLET
BALANCE_SCAN_FAILED
NO_SUPPORTED_BALANCES
NO_FUNDING_OPTIONS
QUOTE_UNAVAILABLE
QUOTE_EXPIRED
OPTION_EXPIRED
ROUTE_REJECTED_BY_POLICY
USER_REJECTED
SOURCE_TX_FAILED
BRIDGE_PENDING
DESTINATION_NOT_VERIFIED
DESTINATION_AMOUNT_TOO_LOW
DUPLICATE_CREDIT_ATTEMPT
INSUFFICIENT_BALANCE
MARKET_LOCKED
```
