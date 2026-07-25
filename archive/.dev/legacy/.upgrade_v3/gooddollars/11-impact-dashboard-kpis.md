# 11 — GoodDollar Impact Dashboard

## Purpose

Show GoodBuilders, Celo ecosystem partners, and users that RetroPick creates measurable G$ utility.

## Public dashboard headline

```text
RetroPick GoodDollar Impact
G$ used, predictions made, rewards claimed, and verified-human participation.
```

## Metrics

| Metric | Definition | Source |
|---|---|---|
| G$ market volume | Sum of G$ used in markets | MarketEngine events |
| G$ protocol fees | Sum of G$ fees accrued | Fee events |
| G$ rewards distributed | Reward claims paid | EngagementRewards/claim tx |
| G$ rewards claimable | Current claimable rewards | Reward ledger |
| Unique users | Distinct wallets using markets | Indexer |
| Verified users | GoodID verified/root wallets | GoodID status |
| First predictions | Users making first market entry | Market events |
| Returning users | Users active on multiple days | DB aggregation |
| Referral users | Users with invite applied | Referral registry |
| Markets resolved | Count of resolved markets | Epoch events |
| Claim-to-predict conversion | Claimed/received G$ → market entry | Funnel events |

## Dashboard layout

```text
Top row:
- G$ Used
- Predictions Made
- Verified Users
- Rewards Claimed

Second row:
- Daily active users
- Returning users
- Referral users
- Markets resolved

Funnel:
Connect → G$ balance → First prediction → Result viewed → Reward claimed → Returned
```

## Daily aggregation SQL sketch

```sql
INSERT INTO impact_daily_metrics(day, g_volume, predictions, unique_users, verified_users, rewards_claimed)
SELECT
  date_trunc('day', created_at)::date,
  SUM(g_amount),
  COUNT(*),
  COUNT(DISTINCT wallet_address),
  COUNT(DISTINCT wallet_address) FILTER (WHERE goodid_verified = true),
  SUM(reward_claimed_amount)
FROM gooddollar_activity_events
GROUP BY 1
ON CONFLICT (day) DO UPDATE SET ...;
```

## GoodBuilders reporting view

Include a weekly export:

```text
Week
G$ market volume
Protocol fees
Rewards distributed
Verified users
New users
Returning users
Referral signups
Top markets
Lessons learned
Next milestone
```

## Anti-vanity rule

Do not only report number of contacts/leads. Report actual G$ activity and conversion:

```text
Good metric: 300 users completed first G$ prediction.
Weak metric: 1M emails collected.
```
