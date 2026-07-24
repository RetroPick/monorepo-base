# User Frontend Scaffold

## Purpose

The user frontend is a wallet-first market interface. It reads indexed state from the API and submits user transactions directly from the connected wallet.

## Pages

| Page | Data source | Contract actions |
|---|---|---|
| Market list | `GET /api/v1/markets` | none |
| Market detail | `GET /api/v1/markets/:templateId`, WS `market:{templateId}` | deposit, switch |
| Epoch history | `GET /api/v1/markets/:templateId/epochs` | claim if claimable |
| Portfolio | `GET /api/v1/user/positions`, `GET /api/v1/user/claims` | claim, claimMany |
| Faucet | `GET /api/v1/user/faucet-state` | `TokenFaucet.request` on Base Sepolia only |

## Components

- `MarketCard`: template summary, active epoch, total pool, timing
- `EpochTimer`: open/lock/resolve countdown and status
- `OutcomePools`: outcome pool sizes, implied probabilities, winner state
- `OracleBadge`: oracle kind/class/feed label and data freshness
- `DepositForm`: allowance check, approve, deposit
- `SwitchForm`: current stake, target outcome, switch amount
- `ClaimButton`: single claim and batch claim states
- `PortfolioTable`: active, claimable, claimed, no-payout positions
- `FaucetPanel`: Base Sepolia-only faucet status and request

## Contract Actions

Use `IMarketEngine` at the proxy:

- `depositToSide(templateId, epochId, outcomeIndex, amount)`
- `depositToSideFor(beneficiary, templateId, epochId, outcomeIndex, amount)`
- `switchSide(templateId, epochId, fromOutcome, toOutcome, grossAmount)`
- `claim(templateId, epochId)`
- `claimMany(templateId, epochIds)`

Use stake token ABI:

- `approve(marketEngineProxy, amount)`
- `allowance(wallet, marketEngineProxy)`
- `balanceOf(wallet)`
- `decimals()`

Use faucet ABI on Base Sepolia:

- `request(amount)`
- `lastMintAt(wallet)`
- `config()`

## Transaction Flow

1. Read indexed market and position state.
2. Check wallet network and connected address.
3. Check stake token balance and allowance.
4. Simulate the contract call where the wallet provider supports simulation.
5. Submit transaction from wallet.
6. Show pending transaction hash.
7. Wait for indexer confirmation through API/WS.
8. Refresh position and market state.

## Error Handling

Known user-facing failure states:

- wrong network
- insufficient token balance
- insufficient allowance
- betting closed
- invalid outcome
- rolling halted
- protocol paused
- already claimed
- nothing to claim
- stale UI state waiting for indexer

Do not present backend state as final until the indexed block is confirmed under the configured finality depth.
