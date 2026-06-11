# RetroPick Target-Amount Funding Intent Integration Pack

This documentation refactors the previous LI.FI chain/token abstraction into the consumer UX RetroPick actually wants:

```txt
User enters: “I want to deposit $25”
RetroPick checks wallet balances
RetroPick finds the best token/chain route
User reviews: “Use 0.0079 ETH on Arbitrum”
Wallet confirms that selected route
LI.FI swaps/bridges into Base USDC
RetroPick credits user balance
```

## Core principle

RetroPick should expose a **target amount funding intent**, not a raw bridge form.

```txt
User intent:
  Deposit $25

System target:
  Deliver at least 25.000000 USDC to RetroPick on the settlement chain

Settlement:
  Base USDC for EVM MVP

Accounting:
  User USDC balance first, market entry second
```

The prediction market engine remains **USDC-only**. It never accepts arbitrary source tokens.

## What changed from the earlier docs

The earlier pack assumed the user manually selected:

```txt
source chain + source token + source amount
```

This refactor changes the primary flow to:

```txt
target fiat/USDC amount first
wallet balance scan
route discovery across candidate balances
best-route recommendation
wallet execution
USDC credit
```

The user can still open an advanced mode to choose a source token manually, but the default UX should be target amount first.

## Included files

| File | Purpose |
|---|---|
| `01-target-intent-architecture.md` | Product and system architecture for target-amount deposits |
| `02-funding-intent-state-machine.md` | State model from intent creation to credit |
| `03-backend-api-spec.md` | REST API for target amount, options, route selection, execution, status |
| `04-database-schema.md` | PostgreSQL schema for intents, options, balances, sessions, ledger |
| `05-lifi-exact-output-and-quote-engine.md` | LI.FI quote strategy, exact-output path, fallback solver |
| `06-balance-discovery-and-route-selection.md` | Wallet balance scanning, candidate generation, route scoring |
| `07-workers-indexing-and-crediting.md` | Async execution tracking, destination indexer, credit worker |
| `08-smart-contract-interfaces.md` | DepositRouter, UserBalanceVault, MarketEngine interfaces |
| `09-frontend-integration-contract.md` | Deposit modal states and TypeScript client contract |
| `10-security-risk-controls.md` | Threat model, idempotency, slippage, amount limits, route risk |
| `11-rollout-plan.md` | Phased implementation plan |
| `12-codex-implementation-prompt.md` | Copy-paste implementation prompt for Codex/Cursor |

## Recommended MVP

```txt
Settlement chain: Base
Settlement token: native Base USDC
Source chains: Base, Arbitrum, Optimism, Ethereum, Polygon
Source tokens: native gas token, USDC, USDT, WETH, DAI
Quote engine: LI.FI
Route mode: exact-output if supported; otherwise iterative exact-input solver
Credit model: balance-first
Market entry: from confirmed USDC balance
```

## Non-negotiable invariants

```txt
1. MarketEngine is USDC-only.
2. Destination chain/token/address are backend-forced.
3. Frontend never controls settlement destination.
4. Credit only after destination-chain USDC transfer is verified.
5. One intent/session/transfer can credit only once.
6. Late bridge arrival credits balance, never loses user funds.
7. Wallet confirmation must show the selected source token before execution.
```
