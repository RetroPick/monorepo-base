# 05 — LI.FI Exact-Output and Quote Engine

## 1. Integration goal

The user enters a target amount:

```txt
Deposit $25
```

RetroPick needs a route that delivers:

```txt
minToAmount >= 25.000000 USDC
```

to the settlement receiver.

## 2. Quote modes

### Exact-input quote

The app knows source amount and receives estimated output.

```txt
Spend 0.01 ETH -> receive ~31.22 USDC
```

This is common and simple.

### Exact-output quote

The app knows required output and asks provider to calculate input.

```txt
Receive exactly/at least 25 USDC -> spend ~0.0079 ETH
```

This matches RetroPick’s target-amount UX.

## 3. Recommended strategy

Use this order:

```txt
1. If LI.FI exact-output quote endpoint/intent is available for selected route/token:
   use exact-output.

2. If exact-output is unavailable:
   use iterative exact-input solver.

3. If solver cannot produce minToAmount >= target:
   reject the source token as insufficient/unavailable.
```

## 4. Backend destination enforcement

Never accept destination from frontend.

```ts
const destination = {
  chainId: Number(process.env.SETTLEMENT_CHAIN_ID), // 8453
  tokenAddress: process.env.SETTLEMENT_USDC_ADDRESS!,
  receiver: process.env.DEPOSIT_ROUTER_ADDRESS!,
};
```

## 5. Exact-output route request concept

Conceptual request shape:

```ts
type ExactOutputQuoteInput = {
  userAddress: string;
  sourceChainId: number;
  sourceTokenAddress: string;
  targetUsdcAmount: bigint;
};

async function requestExactOutputQuote(input: ExactOutputQuoteInput) {
  return lifiQuoteExactOutput({
    fromChain: input.sourceChainId,
    fromToken: input.sourceTokenAddress,
    fromAddress: input.userAddress,

    toChain: SETTLEMENT_CHAIN_ID,
    toToken: SETTLEMENT_USDC_ADDRESS,
    toAddress: DEPOSIT_ROUTER_ADDRESS,

    toAmount: input.targetUsdcAmount.toString(),
    slippage: policySlippageFor(input.sourceTokenAddress),
  });
}
```

The exact function or endpoint depends on the LI.FI API surface you use. Keep this inside an adapter so you can switch between standard quote, advanced routes, and intents without changing the rest of RetroPick.

## 6. Iterative exact-input fallback

If exact-output is not available, solve for source amount.

### Input

```txt
targetUsdcAmount = 25_000000
source token = ETH on Arbitrum
source balance = 0.012 ETH
```

### Algorithm

```txt
1. Estimate source amount from token USD price.
2. Add safety buffer.
3. Request exact-input quote.
4. Check quote.estimate.toAmountMin.
5. If toAmountMin < target, increase source amount.
6. If toAmountMin >= target, store option.
7. Repeat a small bounded number of times.
```

### Pseudocode

```ts
async function solveSourceAmountForTarget(input: {
  userAddress: string;
  sourceChainId: number;
  sourceTokenAddress: string;
  sourceTokenDecimals: number;
  sourceBalance: bigint;
  targetUsdcAmount: bigint;
}) {
  const bufferBps = getBufferBpsForSource(input.sourceTokenAddress); // e.g. 50-150 bps
  let estimatedSourceAmount = await estimateSourceForUsdTarget({
    sourceChainId: input.sourceChainId,
    sourceTokenAddress: input.sourceTokenAddress,
    targetUsdcAmount: input.targetUsdcAmount,
    bufferBps,
  });

  let low = estimatedSourceAmount * 90n / 100n;
  let high = estimatedSourceAmount * 115n / 100n;

  if (high > input.sourceBalance) {
    high = input.sourceBalance;
  }

  let bestQuote: any | null = null;

  for (let i = 0; i < 5; i++) {
    const mid = (low + high) / 2n;

    const quote = await requestExactInputQuote({
      userAddress: input.userAddress,
      sourceChainId: input.sourceChainId,
      sourceTokenAddress: input.sourceTokenAddress,
      sourceAmount: mid,
      toChainId: SETTLEMENT_CHAIN_ID,
      toTokenAddress: SETTLEMENT_USDC_ADDRESS,
      toAddress: DEPOSIT_ROUTER_ADDRESS,
    });

    const minToAmount = BigInt(quote.estimate.toAmountMin ?? '0');

    if (minToAmount >= input.targetUsdcAmount) {
      bestQuote = quote;
      high = mid;
    } else {
      low = mid + 1n;
    }
  }

  if (!bestQuote) {
    return null;
  }

  return {
    sourceAmount: high,
    quote: bestQuote,
  };
}
```

## 7. Safety buffer

Recommended initial buffers:

```txt
Base USDC -> Base USDC: 0 bps to 10 bps
Stablecoin -> USDC: 20–50 bps
ETH/WETH -> USDC: 80–150 bps
Long-tail volatile tokens: disabled in MVP
```

## 8. Route option validation

Reject any quote where:

```txt
toChainId != settlementChainId
toTokenAddress != settlementUsdcAddress
toAddress != DepositRouter/UserBalanceVault
toAmountMin < targetUsdcAmount
sourceAmount > walletBalance
priceImpact > policyMax
estimatedDuration > policyMax
tool is denied
quote expires too soon
```

## 9. Route ranking

Score candidate options:

```ts
score =
  100
  - gasCostPenalty
  - routeFeePenalty
  - durationPenalty
  - priceImpactPenalty
  - toolRiskPenalty
  + directUsdcBonus
  + sameChainBonus
```

Suggested bonuses:

```txt
Base USDC direct deposit: +30
Same-chain Base source: +20
Stablecoin source: +10
Fast bridge estimate: +5
```

Suggested penalties:

```txt
Ethereum L1 gas for small deposit: -30
Volatile source token: -10
Bridge duration > 10 minutes: -20
Multiple swaps/bridges: -10
Price impact > 1%: -20
```

## 10. Route snapshot storage

Store the entire provider route/quote snapshot in `funding_options.route_snapshot`.

Also store normalized fields for querying:

```txt
source chain/token/amount
estimated to amount
min to amount
estimated duration
tools
gas estimate
price impact
expiration
score
```

## 11. Quote freshness

Target-amount quotes go stale fast.

Recommended:

```txt
Quote TTL: 60 seconds
Options refresh button: always available
Auto-refresh: only before route selection, not during wallet prompt
```

Never execute an expired route.
