# Smart Contract Model Grill

This review covers the current MarketEngine model in `package/prediction-v2`.

## Executive rating

| Area | Rating | Notes |
|------|--------|-------|
| Epoch accounting model | 8.5/10 | Strong internal ledger and vault mirrors; invariant coverage is good. Storage is intentionally permanent. |
| Position model | 8/10 | Internal `Position` mapping is cheaper and safer than transferable claim tokens for the current product. |
| Yield integration | 8/10 | Route policy is explicit and template-locked. Operational risk moves to route governance and router health monitoring. |
| Oracle model | 8/10 | Chainlink scalar path and TrustedReporter OHLC path are separated. Corridor/Cascade reject scalar Chainlink. |
| Upgrade safety | 7.5/10 | Single storage layout plus module allowlisting is workable, but dispatcher/module upgrades require strict review discipline. |
| Gas profile | 7.5/10 | Bounded arrays and single-outcome claim fast paths are good. First-position deposits remain expensive due storage writes. |
| UX/composability | 7/10 | Internal positions simplify protocol UX but are not transferable without a secondary off-chain/orderbook layer. |
| Audit readiness | 7.5/10 | Good tests/invariants. Remaining audit focus should be upgrade operations, yield recovery, oracle monitoring, and route governance. |

## Position model

Current user exposure is not an ERC-1155. It is an internal ledger:

```text
positions[positionKey(templateId, epochId)][user] => Position
```

`Position` stores an `occupiedMask`, up to eight outcome stakes, total stake, fees, claimed amount, and claim flags. This is the correct default for RetroPick v1 because:

- Settlement and claims are epoch-driven and depend on engine state.
- Yield routing is template/epoch scoped, not per-user transferable collateral.
- Switching sides mutates accounting inside one epoch.
- Claims need last-claimer remainder handling and vault reserve updates.
- Backend/indexer can derive user positions from engine events and views.

## ERC-1155 comparison

### ERC-1155 position tokens

Pros:

- Transferable positions can support secondary markets.
- Wallets and indexers can display tokenized position balances.
- An external AMM/orderbook could compose with position IDs.

Cons:

- Deposit needs mint bookkeeping in addition to engine ledger updates.
- Claim needs burn or claimed-state reconciliation.
- Transfers create new attack surface: after transfer, who can claim, who owns pending yield, and how to handle partially switched positions.
- ERC-1155 receiver hooks add reentrancy and griefing surface.
- Per-outcome token IDs complicate multi-outcome positions, partial switches, refunds, batch claims, and user epoch indexing.
- On-chain transferability can break UX expectations if a user sells a winning token but still sees stale indexed positions.
- More bytecode, more storage/event writes, more audit scope.

### Internal stake ledger

Pros:

- Cheapest path for the current v1 trading flow.
- Engine remains the only source of truth for positions, claims, vaults, and yield.
- No external token receiver hooks.
- No secondary transfer edge cases during lock/resolve/claim.
- Cleaner recovery model when yield router failures or oracle incidents happen.

Cons:

- Positions are not natively transferable.
- Wallets cannot show position tokens.
- Secondary markets require off-chain signatures or a future tokenized wrapper.

## Decision

Keep the internal stake ledger for v1. Do not add ERC-1155 position tokens to the core MarketEngine.

If transferable positions become a real requirement, add them later as an opt-in wrapper or a separate market family after v1 accounting is stable. The wrapper must prove these invariants before production:

- One canonical claimant per economic position.
- Transfers cannot bypass switch fees, settlement fees, or single-side rules.
- Claim burns and engine claimed flags cannot diverge.
- Yield-routed settled claims cannot be double-spent through token transfers.
- Receiver hooks cannot reenter engine user operations.
- Indexer can reconcile token ownership and engine state after reorgs.

## Gas evidence

Measured with:

```bash
forge test --root package/prediction-v2 --match-path 'test/gas/EpochGas.t.sol'
```

Current focused gas references:

| Operation | Gas |
|----------|-----:|
| `depositToSide` first position | 254837 |
| `depositToSide` existing position | 16488 |
| `switchSide` full binary position | 119701 |
| `claim` after resolve | 50068 |
| `claimMany` two epochs | 113865 |
| `openEpoch` cold | 193209 |
| `lockEpoch` Direction | 128938 |
| `lockEpoch` Threshold | 46754 |
| `resolveEpoch` Direction | 209039 |
| `resolveEpoch` Threshold | 240420 |

The expensive user path is first-position deposit, because it initializes the position, indexes the user epoch, updates pools/vaults, and transfers the stake token. ERC-1155 minting would add token balance storage and transfer/mint events on top of this path.

## Recommended next optimizations

1. Keep the core non-transferable.
2. Keep `MAX_OUTCOMES=8`; do not unbound arrays.
3. Preserve single-outcome claim fast paths.
4. Avoid adding on-chain enumerable position lists beyond `_userEpochs`.
5. Consider an off-chain signed transfer/intent layer before any tokenized position design.
6. If secondary markets become mandatory, build a separate ERC-1155 wrapper and fuzz transfer/claim/switch interactions before merging into core.
