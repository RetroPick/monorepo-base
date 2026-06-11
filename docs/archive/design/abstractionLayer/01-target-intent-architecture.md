# 01 — Target-Amount Funding Intent Architecture

## 1. Problem

The best consumer UX for RetroPick is not:

```txt
Choose source chain
Choose source token
Choose source amount
```

The best UX is:

```txt
“I want to deposit $25”
```

RetroPick should then determine how that target can be funded from the user’s existing wallet balances.

## 2. Desired product flow

```txt
1. User enters target amount:
   “Deposit $25”

2. RetroPick scans supported wallet balances:
   Base USDC, Arbitrum ETH, Optimism USDT, Polygon USDC, etc.

3. RetroPick requests LI.FI routes:
   candidate source balances -> Base USDC

4. RetroPick ranks options:
   cheapest, fastest, safest, highest certainty

5. User reviews:
   “Use 0.0079 ETH on Arbitrum”
   “Receive at least 25.00 USDC on Base”

6. Wallet confirms:
   approval if needed
   route execution transaction

7. LI.FI swaps/bridges:
   source token -> Base USDC

8. RetroPick verifies destination transfer:
   Base USDC arrived at DepositRouter/Vault

9. RetroPick credits:
   user.usdc_available += received amount
```

## 3. System intent model

RetroPick should treat the deposit as a funding intent:

```txt
FundingIntent {
  userAddress
  targetCurrency: USD | USDC
  targetAmount
  settlementChainId
  settlementToken: USDC
  receiver: DepositRouter
  status
}
```

The user’s intent is target-value based. The execution route is an implementation detail selected after balance discovery.

## 4. Important product distinction

### What users experience

```txt
“I deposit $25.”
```

### What actually executes

```txt
“Spend 0.0079 ETH from Arbitrum through route X to deliver >=25 USDC on Base.”
```

The app can auto-recommend, but it must not silently spend without showing the funding source.

## 5. Architectural diagram

```txt
DepositModal
  |
  | POST /api/funding/intents
  v
FundingIntentService
  |
  | create target-USDC intent
  v
BalanceScanner
  |
  | scan user balances on allowlisted chains/tokens
  v
CandidateGenerator
  |
  | balances with enough value
  v
LifiQuoteEngine
  |
  | exact-output or iterative exact-input quotes
  v
RouteScoringService
  |
  | rank by net cost, min received, duration, reliability
  v
User Review
  |
  | selected route
  v
Wallet Execution
  |
  | executeRoute / transactionRequest
  v
DestinationUsdcIndexer
  |
  | verify USDC Transfer logs
  v
BalanceCreditWorker
  |
  | idempotent credit
  v
RetroPick USDC Balance
```

## 6. Balance-first remains mandatory

Even with target-amount UX, the recommended flow remains:

```txt
target funding intent -> USDC balance -> market entry
```

Do not make bridge execution directly place a prediction-market position in V1.

Why:

- Cross-chain execution can be delayed.
- Markets lock at deterministic times.
- A route can complete after lock.
- Users should not lose funds because a bridge was slow.
- Balance-first gives a safe fallback.

## 7. Supported execution modes

### Mode A — target amount, auto source recommendation

Default consumer UX.

```txt
User inputs: $25
App recommends: use ETH on Arbitrum
```

### Mode B — target amount, manual source override

Useful when user wants to spend a specific token.

```txt
User inputs: $25
User chooses: USDT on Polygon
App computes required source amount
```

### Mode C — source amount, estimated output

Advanced bridge/swap UX.

```txt
User inputs: spend 0.01 ETH
App estimates: receive ~31.44 USDC
```

MVP should prioritize Mode A and support Mode B. Mode C can remain hidden under “Advanced.”

## 8. MVP settlement design

```txt
Destination chain: Base
Destination token: Base native USDC
Destination receiver: DepositRouter or UserBalanceVault
Route provider: LI.FI
MarketEngine token: Base USDC only
```

## 9. Why not wallet-level “auto spend anything”?

Wallets normally do not choose which asset to spend. RetroPick must:

```txt
1. scan balances
2. create candidate routes
3. select/recommend a route
4. show the route to user
5. ask wallet to approve/sign that specific route
```

The wallet confirms the selected source token and transaction. The product layer explains the outcome.

## 10. Design rule

```txt
User chooses target amount.
RetroPick chooses destination.
RetroPick recommends source.
User approves selected source.
```
