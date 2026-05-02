# 07 — Workers, Indexing, and Crediting

## 1. Why workers are required

Target-amount deposits are asynchronous:

```txt
wallet signs source tx
route swaps/bridges
USDC arrives later
backend verifies transfer
balance is credited
```

The frontend cannot be the source of truth.

## 2. Workers

| Worker | Responsibility |
|---|---|
| `FundingIntentTimeoutWorker` | Expire stale intents/options |
| `BalanceScanWorker` | Scan balances and create candidates |
| `FundingOptionQuoteWorker` | Request LI.FI routes for candidates |
| `LifiStatusWorker` | Poll route/provider status if available |
| `DestinationUsdcIndexer` | Watch Base USDC Transfer logs |
| `DestinationMatchingWorker` | Match transfers to executions/intents |
| `BalanceCreditWorker` | Idempotently credit user balances |
| `ReconciliationWorker` | Detect insolvency, unmatched transfers, stuck routes |

## 3. Destination USDC indexer

For Base/EVM settlement, monitor ERC-20 `Transfer` logs:

```solidity
event Transfer(address indexed from, address indexed to, uint256 value);
```

Filter:

```txt
contract address == Base USDC
to == DepositRouter or UserBalanceVault
```

Persist:

```txt
chain_id
token_address
tx_hash
log_index
from
to
amount
block_number
block_timestamp
```

## 4. Confirmation policy

Recommended MVP:

```txt
Base: 3–10 confirmations
Ethereum L1: 12+ confirmations if later used as destination
Other L2s: chain-specific policy
```

For settlement on Base, start with:

```txt
credit after 5 confirmations
```

## 5. Matching algorithm

Do not match by amount alone.

Preferred matching signals:

```txt
1. LI.FI provider status links source tx to destination tx
2. Known source tx hash from frontend route update
3. destination receiver matches configured receiver
4. destination token is canonical USDC
5. destination amount >= selected option minToAmount
6. destination amount close to expectedToAmount
7. transfer created within execution observation window
8. one uncredited execution for same user
```

### Pseudocode

```ts
async function matchDestinationTransfer(transfer) {
  const candidates = await db.fundingExecution.findMany({
    where: {
      status: { in: ['SOURCE_TX_SUBMITTED', 'BRIDGING', 'EXECUTION_STARTED'] },
      destinationChainId: transfer.chainId,
      destinationTokenAddress: transfer.tokenAddress,
      createdAt: {
        gte: minutesAgo(90),
      },
    },
    include: {
      fundingIntent: true,
      fundingOption: true,
    },
  });

  const matches = candidates
    .filter(e => transfer.toAddress.toLowerCase() === DEPOSIT_ROUTER_ADDRESS.toLowerCase())
    .filter(e => BigInt(transfer.amount) >= BigInt(e.minUsdcAmount))
    .map(e => ({
      execution: e,
      score: scoreMatch(e, transfer),
    }))
    .filter(x => x.score >= MIN_MATCH_SCORE)
    .sort((a, b) => b.score - a.score);

  return matches[0]?.execution ?? null;
}
```

## 6. Idempotent credit transaction

```ts
await db.$transaction(async (tx) => {
  const execution = await tx.fundingExecution.findUnique({
    where: { id: executionId },
    lock: { mode: 'for update' },
  });

  const intent = await tx.fundingIntent.findUnique({
    where: { id: execution.fundingIntentId },
    lock: { mode: 'for update' },
  });

  if (intent.status === 'CREDITED') return;

  const idempotencyKey = `target-intent-credit:${intent.id}:${transfer.id}`;

  await tx.balanceLedger.create({
    data: {
      userAddress: intent.userAddress,
      assetChainId: intent.settlementChainId,
      assetTokenAddress: intent.settlementTokenAddress,
      deltaAvailable: transfer.amount,
      deltaLocked: 0,
      reason: 'TARGET_INTENT_DEPOSIT_CREDIT',
      referenceType: 'funding_intent',
      referenceId: intent.id,
      idempotencyKey,
    },
  });

  const balance = await tx.userBalance.upsert({
    where: { userAddress: intent.userAddress },
    create: {
      userAddress: intent.userAddress,
      usdcAvailable: transfer.amount,
      usdcLocked: 0,
    },
    update: {
      usdcAvailable: { increment: transfer.amount },
    },
  });

  await tx.destinationTransfer.update({
    where: { id: transfer.id },
    data: {
      matchedFundingIntentId: intent.id,
      matchedExecutionId: execution.id,
      creditStatus: 'CREDITED',
    },
  });

  await tx.fundingIntent.update({
    where: { id: intent.id },
    data: {
      status: 'CREDITED',
      creditedAmount: transfer.amount,
      creditedAt: new Date(),
    },
  });

  await tx.fundingExecution.update({
    where: { id: execution.id },
    data: {
      status: 'DESTINATION_USDC_VERIFIED',
      destinationTxHash: transfer.txHash,
    },
  });
});
```

## 7. Handling destination amount above target

If received amount is above target because of buffer:

```txt
Credit actual received amount.
```

Example:

```txt
Target: 25.00 USDC
Received: 25.18 USDC
User balance credit: 25.18 USDC
```

Do not skim overage unless it is an explicit fee disclosed before signing.

## 8. Handling below-min received

If amount < selected option minToAmount:

```txt
status = MANUAL_REVIEW
credit_status = HELD
alert ops
```

Do not silently credit below-min if the app promised a minimum. You can later add a policy:

```txt
if amount >= targetUsdcAmount and below provider min due to rounding:
  allow credit
else:
  manual review
```

## 9. Stuck routes

```txt
No source tx after 15 minutes:
  EXPIRED

Source tx submitted but no destination transfer after 90 minutes:
  MANUAL_REVIEW / PROVIDER_PENDING

Destination transfer unmatched after 30 minutes:
  UNMATCHED + alert
```

## 10. Reconciliation

Run continuously:

```txt
onchain_vault_usdc_balance >= sum(user_balances.available + locked)
```

If false:

```txt
pause withdrawals
pause market entries
alert critical
```
