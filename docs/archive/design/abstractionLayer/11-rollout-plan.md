# 11 — Rollout Plan

## Phase 0 — Canonical USDC balance foundation

Goal:

```txt
RetroPick can hold and account for Base USDC balances.
```

Tasks:

- Confirm settlement chain = Base.
- Confirm Base USDC token address.
- Deploy/test UserBalanceVault and DepositRouter.
- Implement `user_balances` and `balance_ledger`.
- Add `GET /api/users/:address/balance`.

Exit criteria:

```txt
A user can have a USDC balance displayed in RetroPick.
```

## Phase 1 — Direct Base USDC deposit

Goal:

```txt
Base USDC -> RetroPick balance
```

Tasks:

- Add direct deposit endpoint/UI.
- Detect Base USDC transfer to vault/router.
- Credit user idempotently.
- Add withdrawal path if using on-chain vault.

Exit criteria:

```txt
Direct Base USDC deposit credits exactly once.
```

## Phase 2 — Target amount intent without execution

Goal:

```txt
User enters $25 and sees funding options.
```

Tasks:

- Add `funding_intents`.
- Add balance scanner for allowlisted chains/tokens.
- Add target amount conversion to USDC.
- Add funding option generation.

Exit criteria:

```txt
User can enter $25 and see “Use X token on Y chain.”
```

## Phase 3 — LI.FI quote engine

Goal:

```txt
Candidate balances become real LI.FI route options.
```

Tasks:

- Install `@lifi/sdk`.
- Add LI.FI config.
- Implement exact-output quote adapter if available.
- Implement iterative exact-input fallback.
- Store route snapshots.
- Rank routes.

Exit criteria:

```txt
Backend returns executable LI.FI route options targeting Base USDC.
```

## Phase 4 — Frontend execution

Goal:

```txt
User can select recommended option and sign wallet route.
```

Tasks:

- Configure LI.FI frontend provider.
- Use `executeRoute`.
- Capture updateRouteHook.
- Submit source tx/route updates to backend.
- Build progress UI.

Exit criteria:

```txt
Source transaction hash is captured and execution progress is visible.
```

## Phase 5 — Destination indexer and crediting

Goal:

```txt
USDC arrival on Base credits user balance.
```

Tasks:

- Build Base USDC Transfer log indexer.
- Match transfer to funding execution.
- Idempotent credit worker.
- Reconciliation checks.

Exit criteria:

```txt
Cross-chain target deposit credits user exactly once.
```

## Phase 6 — Market entry from balance

Goal:

```txt
Credited balance can enter prediction markets.
```

Tasks:

- Add `POST /api/markets/:marketId/enter`.
- Verify market open and lock buffer.
- Debit balance.
- Call MarketEngine.
- Record market entry.

Exit criteria:

```txt
User deposits $25, gets USDC balance, enters market using that balance.
```

## Phase 7 — Production hardening

Tasks:

- Tool deny/prefer policy.
- Limits and manual review.
- Stuck route dashboard.
- Vault solvency alerts.
- Sentry/Datadog.
- Rate limits.
- Compliance gates.

Exit criteria:

```txt
Safe limited beta.
```

## Phase 8 — Optional auto-enter

Goal:

```txt
Deposit $25 and enter market if funds arrive before lock.
```

Tasks:

- Add `autoEnterMarketId`.
- Add `autoEnterOutcomeId`.
- Add auto-entry worker.
- Add lock safety buffer.
- Fallback to balance credit.

Exit criteria:

```txt
No user funds are lost or mis-entered if bridge arrives late.
```

## Phase 9 — Add second routing provider

Goal:

```txt
Cheaper/more reliable routing through provider competition.
```

Tasks:

- Add Bungee/SOCKET provider adapter.
- Normalize route option schema.
- Rank LI.FI vs Bungee.
- Track provider success rates.

Exit criteria:

```txt
Backend picks best route across providers.
```
