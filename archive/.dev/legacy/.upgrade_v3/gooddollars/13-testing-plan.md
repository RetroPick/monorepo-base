# 13 — Testing Plan

## Contract tests

```text
contracts/test/gooddollar/FeeRouter.t.sol
contracts/test/gooddollar/RewardsVault.t.sol
contracts/test/gooddollar/CommunityPool.t.sol
contracts/test/gooddollar/GDollarReceiver.t.sol
```

### Required contract cases

- `pullAndRoute` success path.
- bad split reverts.
- unauthorized caller reverts.
- paused route reverts.
- actual received amount mismatch reverts.
- route event emitted with batchId and allocationHash.
- vault addresses cannot be zero.
- rewards funding only to whitelisted destination.

## Backend tests

```text
services/backend/internal/domain/gooddollar/*_test.go
services/backend/internal/domain/referral/*_test.go
services/backend/internal/api/gooddollar_handler_test.go
```

### Required backend cases

- `fee_event` idempotency.
- 4-level reward math.
- missing-level treasury logic.
- no-referrer 100% treasury.
- self-referral blocked.
- cycle blocked.
- GoodID-gated reward claim.
- non-GoodID user can still enter market.
- claim nonce replay blocked.
- prepare claim returns correct payload.

## Frontend tests

```text
apps/web/src/features/gooddollar/**/*.test.tsx
```

### Required frontend cases

- no G$ balance state.
- GoodID optional state.
- GoodID required for bonus claim.
- daily market entry pending/confirmed/error.
- claim reward pending/confirmed/error.
- impact dashboard loading/empty/error.

## End-to-end test

```text
1. User connects with Reown.
2. User sees G$ balance.
3. User applies invite code.
4. User enters a 5 G$ daily market.
5. Market event indexes.
6. Quest completes.
7. Referral ledger creates reward events.
8. User claims EngagementRewards reward.
9. Impact Dashboard updates.
```

## Staging checklist

- Celo dev/staging chain configured.
- G$ dev token configured.
- FeeRouter deployed.
- TreasuryVault deployed.
- RewardsVault deployed.
- API env vars set.
- Frontend chain registry updated.
- Dashboard metrics reset for staging.
