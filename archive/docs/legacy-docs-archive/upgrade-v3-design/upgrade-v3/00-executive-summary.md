# 00 — Executive Summary

RetroPick V3 should be an **architecture stabilization and GoodDollar integration release**, not a feature explosion.

The V2 review correctly identifies that V1 already has strong fundamentals: on-chain authoritative settlement, indexer-to-Postgres projections, and durable realtime replay. The biggest risks are boundaries: too-clever dispatcher wiring, a god `cmd/api` binary, smeared backend domain logic, off-chain math drift, too many frontend truth sources, and an underbuilt TrustedReporter workflow.

V3 fixes those issues while adding the GoodDollar/Celo growth stack.


## V3 Non-Negotiables

1. Keep RetroPick pool-based and event-driven; do not rewrite into a CLOB.
2. Keep `MarketEngine` as on-chain settlement source of truth.
3. Keep Postgres projections and `realtime_events` as the UX/read model.
4. Fix boundaries before adding complexity.
5. Add GoodDollar/Celo integrations as additive modules: G$ market token, FeeRouter, RewardsVault, referral ledger, GoodID, EngagementRewards.
6. Do not introduce Redis, Kafka, NATS, CLOB, UMA, or microservices before actual scale demands them.
7. Make non-crypto UX the default; advanced/degen UX is an opt-in mode.


## The V3 Product Thesis

RetroPick should become:

```text
A simple, mobile-first G$ prediction market where users can claim or receive G$, make tiny daily predictions, learn how market resolution works, invite others, and claim rewards from real activity.
```

## The V3 Engineering Thesis

```text
Do not scale infrastructure before demand.
Do not decompose services before boundaries are clean.
Do not rewrite the protocol before pool markets prove usage.
Do not expose advanced trading complexity to non-crypto users.
```

## What V3 Builds

| Area | V3 Build |
|---|---|
| Protocol | FeeRouter, TreasuryVault, RewardsVault, Celo/G$ deployment path |
| Backend | domain boundaries, event bus, idempotent indexer, referral/quest ledger |
| Frontend | beginner mode, one truth source, G$ UX, GoodID status, EngagementRewards claims |
| Ops | reporter queue, audit logs, fee routing dashboard, GoodDollar impact dashboard |
| Growth | referral network rewards, CRM-compatible campaign tracking, GoodBuilders metrics |

## What V3 Does Not Build

| Cut | Reason |
|---|---|
| CLOB/order book | Wrong timing; pool markets need traction first |
| Redis/Kafka/NATS | Postgres `NOTIFY` + replay is enough now |
| UMA oracle | TrustedReporter workflow is simpler for current scale |
| Full on-chain referral tree | Backend ledger is safer and faster to iterate |
| Superfluid core rewards | Useful phase 2; too complex for MVP |
| Advanced terminal UI | Non-crypto users need a daily flow, not a trading cockpit |

## V3 Success Metrics

- G$ used in markets
- G$ protocol fees
- reward liability and rewards claimed
- verified-human users
- first prediction conversion
- return-after-result rate
- referral-driven users
- markets resolved without dispute
- indexer lag and reorg recovery
- fee routing accuracy
