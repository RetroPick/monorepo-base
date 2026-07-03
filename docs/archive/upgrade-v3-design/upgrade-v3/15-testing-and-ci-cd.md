# 15 — Testing and CI/CD

## Contract Tests

### FeeRouter

- route exact full-referral allocation
- route no-referral allocation
- route missing-level allocation
- reject bad sum
- reject zero amount
- reject unwhitelisted destination
- pause blocks routing
- nonReentrant works
- batch replay rejected

### RewardsVault

- fund allowed EngagementRewards destination
- reject unknown destination
- emit `RewardFundingSent`
- pause works
- only manager role can fund

### MarketEngine Compatibility

- existing settlement invariants unchanged
- fees still accrue to fee reserves
- withdrawFees works with FeeRouter as treasury
- claimsReserve unaffected

## Backend Tests

- referral tree ancestor lookup
- missing-level treasury calculation
- self-referral rejected
- cycles rejected
- duplicate fee event ignored
- reward claim cannot exceed balance
- GoodID status cache refresh
- EngagementRewards payload nonce uniqueness
- impact KPI aggregation

## Frontend Tests

- connect -> G$ balance -> daily market flow
- no G$ path shows claim/receive guidance
- GoodID not forced on normal market entry
- pending tx not final
- reward claim button disabled if not eligible
- impact dashboard loads with empty state

## CI Gates

```text
go test ./...
pnpm test
forge test
forge test --match-path test/invariant/*
golangci-lint
eslint
abi drift check
storage-layout diff
migration up/down test
```

## Deployment Gates

- staging deploy first
- smoke test Celo/G$ market entry
- smoke test indexer event
- smoke test FeeRouter route
- smoke test reward claim preparation
- smoke test WebSocket replay
- manual production approval
