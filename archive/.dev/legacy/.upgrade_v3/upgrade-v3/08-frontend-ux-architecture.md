# 08 — Frontend UX Architecture

## V3 Product Mode

The default mode is beginner-friendly.

```text
Connect
See G$
Pick daily market
Use small G$
Wait result
Claim/view result
Learn
Invite
```

Advanced trading views are hidden behind Advanced Mode.

## One Truth Source Rule

```text
Frontend reads indexed API state by default.
Frontend writes wallet transactions directly.
Frontend waits for indexer confirmation before final state.
Live RPC is ops/debug only.
```

## Folder Structure

```text
apps/web/src/
├── app/
├── features/
│   ├── daily-market/
│   ├── gooddollar/
│   ├── rewards/
│   ├── referrals/
│   ├── markets/
│   ├── trade/
│   ├── portfolio/
│   ├── resolution/
│   ├── learn/
│   └── impact/
├── entities/
│   ├── market/
│   ├── epoch/
│   ├── position/
│   ├── reward/
│   └── referral/
├── shared/
│   ├── api/
│   ├── chain/
│   ├── realtime/
│   └── ui/
└── providers/
```

## Beginner Copy Rules

| Technical Term | UX Term |
|---|---|
| stake | use G$ |
| oracle | result source |
| settle | result checked |
| fee | platform fee |
| vault | reward pool / treasury |
| claimable | ready to claim |
| transaction | confirmation |
| referral tree | invite network |

## Core Screen List

| Screen | Purpose |
|---|---|
| Home | explain product in one sentence |
| Daily Market | one simple market at a time |
| My G$ | balance + claim/receive guidance |
| Confirm | simple amount and answer confirmation |
| Result | resolution and claim status |
| Learn | why result resolved |
| Invite | link/code and earned rewards |
| Rewards | EngagementRewards claims |
| Impact | public GoodDollar KPI dashboard |

## Safe Optimistic UI

When user enters a market:

```text
1. Create pending local position.
2. Show "confirming".
3. Wait for WS/indexer envelope.
4. Replace pending with confirmed.
5. If not indexed after N blocks, show "still confirming", not error.
```

## Degraded States

| Condition | UI |
|---|---|
| paused | disable writes, show global banner |
| indexer lag | show syncing badge |
| oracle stale | block new market entry |
| awaiting result | show waiting state |
| claim unavailable | explain why |
| GoodID not verified | show optional verify CTA only where needed |
