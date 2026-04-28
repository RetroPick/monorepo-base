# Backend User Surface

## Purpose

This document maps user-facing backend behavior to ABI surfaces. The backend serves indexed state and transaction metadata; the wallet submits transactions.

## Read Model

Serve these from PostgreSQL by default, projected from chain events and periodically reconciled against contract views:

- market list
- current epoch state
- outcome pool state
- user position state
- claimable epochs
- historical epochs
- faucet state on Base Sepolia

Optional direct chain read fallback:

- `getMarketView(templateId)`
- `getActiveEpochView(templateId)`
- `getEpochView(templateId, epochId)`
- `getOutcomeViews(templateId, epochId)`
- `getPositionView(templateId, epochId, user)`
- `getUserEpochs(templateId, user, cursor, size)`
- `getVaultBalances(templateId)`

Direct reads should be rate limited and exposed only when the response includes a freshness reason.

## User Write ABI Map

| Action | ABI | Function | Submitter |
|---|---|---|---|
| Approve stake token | `MockERC20` on Base Sepolia, production ERC20 later | `approve(spender, value)` | User wallet |
| Deposit | `IMarketEngine` at proxy | `depositToSide(templateId, epochId, outcomeIndex, amount)` | User wallet |
| Deposit for beneficiary | `IMarketEngine` at proxy | `depositToSideFor(beneficiary, templateId, epochId, outcomeIndex, amount)` | User wallet or approved executor |
| Switch side | `IMarketEngine` at proxy | `switchSide(templateId, epochId, fromOutcome, toOutcome, grossAmount)` | User wallet |
| Claim one epoch | `IMarketEngine` at proxy | `claim(templateId, epochId)` | User wallet |
| Claim many epochs | `IMarketEngine` at proxy | `claimMany(templateId, epochIds)` | User wallet |
| Faucet request | `TokenFaucet` on Base Sepolia | `request(amount)` | User wallet |

The backend may return prepared call data and estimated display values, but it must not custody user keys or broadcast user transactions.

## User API Shapes

Market detail response should include:

- `templateId`
- `slug`
- `assetSymbol`
- `marketType`
- `executionMode`
- `oracleClass`
- `oracleKind`
- `activeEpochId`
- `activeEpoch`
- `outcomes`
- `poolTotals`
- `timing`
- `claimability`
- `dataFreshness`

Position response should include:

- `wallet`
- `templateId`
- `epochId`
- `stakes`
- `totalStake`
- `entryFeesPaid`
- `switchFeesPaid`
- `claimed`
- `pendingClaimAmount`
- `pendingRefundAmount`
- `status`

Claim response should include:

- claimable epoch IDs
- estimated claim amount
- refund mode flag
- already claimed flag
- transaction target and ABI function name

## Event Sources

User state updates come from:

- `PositionDeposited`
- `SideSwitched`
- `Claimed`
- `UserEpochIndexed`
- `EpochOpened`
- `EpochLocked`
- `EpochResolved`
- `EpochCancelled`
- `RollingRoundExecuted`

For Base Sepolia only:

- `TokenFaucet.Minted`
- `MockERC20.Transfer`
- `MockERC20.Approval`

## Frontend Contract Hints

The API should expose enough transaction metadata for frontend simulation:

- chain id
- target address
- ABI name
- function name
- typed args
- required allowance
- current allowance
- stake token decimals
- expected indexed event after success

Do not hide contract reverts behind generic API errors. Preserve known revert/error names where the client can show a useful failure state.
