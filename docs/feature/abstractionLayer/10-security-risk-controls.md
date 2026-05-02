# 10 — Security and Risk Controls

## 1. Core risks

| Risk | Control |
|---|---|
| App spends unexpected token | Show selected source token before wallet confirmation |
| Fake frontend credit | Verify destination-chain USDC transfer logs |
| Wrong destination token | Backend forces canonical USDC address |
| Wrong destination receiver | Backend forces DepositRouter/Vault address |
| Double credit | DB idempotency + contract depositId |
| Route below target | Require `minToAmount >= targetUsdcAmount` |
| Bridge delay | Balance-first architecture |
| Market lock missed | Deposit credits balance, not direct market entry |
| Unsupported risky token | Chain/token allowlist |
| Risky bridge/DEX route | Provider tool policy |
| Vault insolvency | On-chain balance >= user liabilities reconciliation |

## 2. Frontend trust boundary

Frontend can report:

```txt
selected option
wallet address
route update
source tx hash
```

Backend must verify:

```txt
destination chain event
token address
receiver address
amount
confirmations
idempotency
```

## 3. Destination enforcement

Every quote request must overwrite:

```txt
toChainId = SETTLEMENT_CHAIN_ID
toTokenAddress = SETTLEMENT_USDC_ADDRESS
toAddress = DEPOSIT_ROUTER_ADDRESS
```

Even if frontend sends different values.

## 4. Amount limits

MVP defaults:

```txt
Minimum target deposit: 5 USDC
Soft max: 500 USDC
Hard max: 2,000 USDC
Manual review: >500 USDC
```

## 5. Slippage and min received

Recommended:

```txt
Base USDC direct: 0%–0.1%
Stablecoin source: 0.1%–0.3%
ETH/WETH source: 0.5%–1.0%
Reject if price impact >2%
```

For target amount:

```txt
selectedOption.minToAmount must be >= targetUsdcAmount
```

## 6. Route tool policy

Track LI.FI tools/steps.

```txt
ALLOWED
PREFERRED
TEMPORARILY_DISABLED
DENIED
```

Disable tools after repeated:

```txt
route failures
delayed arrivals
below-min arrivals
status tracking gaps
liquidity issues
```

## 7. Gas reserve

Never route the full native token balance.

```txt
native token spendable = balance - gasReserve
```

If ERC-20 source token:

```txt
require native gas balance for approval and route tx
```

## 8. Idempotency checklist

```txt
funding_intents(user_address, client_nonce) unique
funding_executions(source_chain_id, source_tx_hash) unique
destination_transfers(chain_id, tx_hash, log_index) unique
balance_ledger(idempotency_key) unique
DepositRouter.usedDepositIds[depositId] true after credit
```

## 9. Reconciliation invariant

```txt
onchain USDC in vault/router system >=
sum(user_balances.usdc_available + user_balances.usdc_locked)
```

If broken:

```txt
pause withdrawals
pause market entries
pause new credits
alert critical
```

## 10. Market timing policy

For normal balance-first deposits:

```txt
market timing irrelevant to deposit credit
```

For optional auto-enter:

```txt
if now >= lockAt - safetyBuffer:
  credit balance only
```

Recommended safety buffer:

```txt
60–120 seconds
```

## 11. Privacy controls

Balance scanning should:

```txt
scan only allowlisted chains/tokens
not store unnecessary obscure assets
not expose raw balances publicly
delete stale snapshots after retention window
```

## 12. Compliance controls

Prediction markets can trigger legal/regulatory requirements.

Add early:

```txt
terms acceptance
age gate where required
blocked jurisdictions
market category controls
deposit limits
audit logs
manual review thresholds
```

This document is technical architecture, not legal advice.
