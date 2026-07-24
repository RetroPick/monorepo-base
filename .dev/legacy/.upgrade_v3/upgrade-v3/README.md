# RetroPick Upgrade V3 — Integration Pack

Created: 2026-07-02

This folder is the implementation-oriented architecture pack for **RetroPick Upgrade V3**. It turns the V2 architecture review into an executable plan that also includes the GoodDollar/Celo integration target.

V3 is not a CLOB rewrite and not a microservice migration. It is a **boundary-hardening + GoodDollar integration release**:

- safer protocol fee routing
- better backend domain boundaries
- one frontend truth source
- real TrustedReporter workflow
- Celo/G$ deployment plan
- GoodID and EngagementRewards integration
- referral ledger and rewards accounting
- impact dashboard for GoodBuilders / Celo ecosystem reporting

## Recommended Reading Order

1. `00-executive-summary.md`
2. `01-upgrade-v3-scope.md`
3. `02-target-architecture.md`
4. `03-monorepo-folder-structure.md`
5. `04-smart-contract-upgrade-plan.md`
6. `05-fee-router-rewards-vault.md`
7. `06-backend-domain-architecture.md`
8. `07-indexer-event-bus-realtime.md`
9. `08-frontend-ux-architecture.md`
10. `09-gooddollar-celo-integration.md`
11. `10-referral-and-engagement-rewards.md`
12. `11-trusted-reporter-v3.md`
13. `12-database-migrations.md`
14. `13-api-contracts.md`
15. `14-security-threat-model.md`
16. `15-testing-and-ci-cd.md`
17. `16-implementation-roadmap.md`
18. `17-cursor-master-prompt.md`
19. `sources.md`

## Locked V3 Summary

```text
RetroPick V3 = V2 architecture hardening + GoodDollar/Celo growth integration.

Keep:
- MarketEngine as on-chain authority
- pool-based prediction market model
- indexer -> Postgres -> API/WS frontend read flow
- cheap VPS + Postgres-first infra

Add:
- FeeRouter
- TreasuryVault
- RewardsVault
- optional CommunityPool
- G$ market token support
- GoodID only for subsidized/verified rewards
- EngagementRewards claim flow
- backend referral/quest ledger
- Impact Dashboard

Defer:
- CLOB
- UMA
- Redis
- Kafka/NATS
- Superfluid streaming core rewards
- advanced trading terminal
```

For a single plan-mode prompt that runs phase 1 and then phase 2, use `../cursor-plan-prompt.md`.
