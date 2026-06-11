# 06 — Balance Discovery and Route Selection

## 1. Goal

Given:

```txt
userAddress = 0xUser
target = 25 USDC
```

Find candidate wallet balances that can fund the target.

## 2. MVP balance scan policy

Start with a narrow allowlist.

```txt
Chains:
- Base
- Arbitrum
- Optimism
- Ethereum
- Polygon

Tokens:
- Native gas token
- USDC
- USDT
- WETH
- DAI
```

Do not scan every token in the wallet for MVP.

## 3. Balance scanner sources

Options:

```txt
1. LI.FI token management/balance utilities
2. Alchemy Token API
3. Moralis/Covalent/Zerion
4. Direct RPC calls for allowlisted tokens
```

For MVP, direct RPC calls are enough because the allowlist is small.

## 4. Direct RPC balance checks

For each supported chain:

```txt
native balance: eth_getBalance
ERC-20 balance: balanceOf(user)
```

Normalize all token balances into base units and estimated USD value.

## 5. Candidate generation

For each balance:

```ts
type BalanceCandidate = {
  chainId: number;
  tokenAddress: string;
  tokenSymbol: string;
  decimals: number;
  balance: bigint;
  estimatedUsdValue: number;
};
```

Filter:

```txt
estimatedUsdValue >= targetUsd + conservativeBuffer
balance > gas reserve threshold if native token
chain/token allowlisted
token risk allowed
```

## 6. Gas reserve rule

If the source token is the native gas token, do not use the full balance.

Example:

```txt
Arbitrum ETH balance = 0.0100 ETH
gas reserve = 0.0003 ETH
available for route = 0.0097 ETH
```

If source token is ERC-20, ensure native gas token balance exists for approval/transaction gas.

## 7. Candidate types

### Best candidate: destination USDC

```txt
Base USDC -> Base USDC
```

No bridge, lowest risk.

### Good candidate: source-chain USDC

```txt
Arbitrum USDC -> Base USDC
```

Bridge-only or CCTP-style route if available.

### Good candidate: stablecoin

```txt
Optimism USDT -> Base USDC
```

Stable swap plus bridge.

### Acceptable candidate: blue-chip volatile token

```txt
Arbitrum ETH -> Base USDC
```

Swap plus bridge. Needs more slippage buffer.

### Disabled initially

```txt
long-tail memecoins
illiquid tokens
rebasing tokens
fee-on-transfer tokens
tokens with transfer restrictions
```

## 8. Option generation loop

```ts
async function buildFundingOptions(intent) {
  const balances = await balanceScanner.scan(intent.userAddress);

  const candidates = balances.filter(balance => {
    return isAllowlisted(balance)
      && hasEnoughEstimatedValue(balance, intent.targetUsdcAmount)
      && hasGasReserve(balance);
  });

  const options = [];

  for (const candidate of candidates) {
    const option = await quoteEngine.quoteTargetUsdc({
      userAddress: intent.userAddress,
      source: candidate,
      targetUsdcAmount: intent.targetUsdcAmount,
    });

    if (option && passesPolicy(option)) {
      options.push(option);
    }
  }

  return rankOptions(options);
}
```

## 9. Route scoring

Recommended sort priority:

```txt
1. minToAmount >= target amount
2. same-chain Base USDC direct deposit
3. lowest total user cost
4. fastest estimated completion
5. fewer steps
6. lower risk tool
7. stablecoin over volatile token
```

## 10. User-facing recommendation

The frontend should display:

```txt
Recommended:
Use 0.0079 ETH on Arbitrum

You will receive:
At least 25.00 USDC on Base

Why this route?
Cheapest available route from your supported wallet balances.
```

## 11. Alternatives

Show 2–4 alternatives if available.

```txt
Other options:
- Use 25.03 USDC on Optimism
- Use 25.12 USDT on Polygon
- Use 0.0081 ETH on Base
```

Do not overwhelm the user with 10+ route options.

## 12. Multiple small balances

Do not combine balances in V1.

Bad V1:

```txt
$10 USDC on Base + $8 ETH on Arbitrum + $12 USDT on Polygon
```

This requires multiple transactions, routes, and failure handling.

MVP rule:

```txt
One funding intent uses one source chain and one source token.
```

Later, support multi-source aggregation as an advanced feature.

## 13. No options behavior

If no balance can fund the target:

```txt
No supported balance can cover this deposit.
Try a lower amount or choose a source token manually.
```

Return machine-readable details:

```json
{
  "code": "NO_FUNDING_OPTIONS",
  "minimumDetectedSupportedUsd": "12.40",
  "suggestedLowerTarget": "10.00"
}
```

## 14. Privacy note

Balance scanning can feel sensitive. In UI copy:

```txt
RetroPick checks supported token balances only to find deposit options.
```

Do not display obscure token balances unless the user asks.
