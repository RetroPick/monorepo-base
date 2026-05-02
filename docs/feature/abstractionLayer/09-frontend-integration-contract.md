# 09 — Frontend Integration Contract

## 1. Product UX

Primary flow:

```txt
Deposit amount
[ $25.00 ]

Funding source
[ Auto: best available token ]

Recommended route
Use 0.0079 ETH on Arbitrum
Receive at least 25.00 USDC on Base

[Confirm in wallet]
```

## 2. Components

```txt
TargetDepositModal
  TargetAmountInput
  CurrencySelector
  FundingSourceAutoCard
  FundingOptionsList
  RouteReviewCard
  WalletExecutionButton
  ExecutionProgress
  BalanceCard
```

## 3. UI states

```txt
IDLE
CREATING_INTENT
SCANNING_BALANCES
OPTIONS_LOADING
NO_OPTIONS
OPTIONS_READY
OPTION_SELECTED
AWAITING_APPROVAL
AWAITING_SIGNATURE
EXECUTING_ROUTE
SOURCE_TX_SUBMITTED
BRIDGING
CREDITED
FAILED
EXPIRED
MANUAL_REVIEW
```

## 4. Create intent

```ts
async function createFundingIntent(input: {
  userAddress: string;
  targetAmount: string; // "25.00"
  targetCurrency: 'USD' | 'USDC';
  clientNonce: string;
}) {
  const res = await fetch('/api/funding/intents', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      userAddress: input.userAddress,
      targetCurrency: input.targetCurrency,
      targetAmount: input.targetAmount,
      clientNonce: input.clientNonce,
      mode: 'AUTO_BEST_SOURCE',
    }),
  });

  if (!res.ok) throw await res.json();
  return res.json();
}
```

## 5. Load options

```ts
async function getFundingOptions(intentId: string) {
  const res = await fetch(`/api/funding/intents/${intentId}/options`);
  if (!res.ok) throw await res.json();
  return res.json();
}
```

## 6. Select option

```ts
async function selectFundingOption(intentId: string, optionId: string) {
  const res = await fetch(`/api/funding/intents/${intentId}/select-option`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ optionId }),
  });

  if (!res.ok) throw await res.json();
  return res.json();
}
```

## 7. Execute route

```ts
import { executeRoute } from '@lifi/sdk';

async function executeSelectedRoute(executionId: string, serializedRoute: any) {
  await fetch(`/api/funding/executions/${executionId}/start`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      walletAddress: connectedAddress,
      clientRouteExecutionId: crypto.randomUUID(),
    }),
  });

  return executeRoute(serializedRoute, {
    async updateRouteHook(updatedRoute) {
      const observedTxHashes = extractTxHashes(updatedRoute);

      await fetch(`/api/funding/executions/${executionId}/route-update`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          route: updatedRoute,
          observedTxHashes,
        }),
      });
    },
  });
}
```

## 8. Route review copy

Display before wallet opens:

```txt
You are depositing: $25.00

Recommended source:
0.0079 ETH on Arbitrum

Destination:
Base USDC

Minimum received:
25.00 USDC

Estimated received:
25.18 USDC

Estimated time:
~2 minutes

Route:
1inch -> Across

Important:
Your wallet will ask you to approve/sign the route. RetroPick credits your USDC balance after Base USDC arrives.
```

## 9. Wallet confirmation expectations

Tell users:

```txt
Your wallet may show a token approval and then a swap/bridge transaction.
```

For ERC-20 source token:

```txt
1. Approve source token
2. Confirm route transaction
```

For native token:

```txt
1. Confirm route transaction
```

## 10. Progress UI

```txt
Preparing route
Waiting for wallet
Source transaction submitted
Bridge/swap in progress
USDC received on Base
RetroPick balance credited
```

## 11. Final success state

```txt
Deposit complete
25.18 USDC added to your RetroPick balance

[Enter market]
[View balance]
```

## 12. Important UX rules

Do not say:

```txt
Market entered
```

after deposit credit.

Only say:

```txt
Balance credited
```

Market entry requires separate confirmation unless the user explicitly enabled auto-enter and policy allows it.

## 13. Error messages

### No options

```txt
No supported balance can cover this deposit. Try a lower amount or choose a token manually.
```

### Quote expired

```txt
This route expired. Refresh to get a new quote.
```

### User rejected

```txt
You rejected the wallet request. No funds moved.
```

### Bridge pending

```txt
Your source transaction is confirmed. The bridge is still processing. Your balance will update when USDC arrives.
```

### Manual review

```txt
Your funds were detected, but the amount or route needs review before crediting.
```

## 14. Polling

While active:

```txt
GET /api/funding/intents/:id every 3–5 seconds
```

After credited:

```txt
GET /api/users/:address/balance
```

Use SSE/WebSocket later.
