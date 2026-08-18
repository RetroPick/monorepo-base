# 13 — API Contracts

## New V3 API Groups

```text
/api/v1/gooddollar/*
/api/v1/rewards/*
/api/v1/referrals/*
/api/v1/impact/*
/api/v1/fee-router/*
/api/v1/reporter/*
```

## GoodDollar API

```http
GET /api/v1/gooddollar/status?wallet=0x...
```

Response:

```json
{
  "wallet": "0x...",
  "chainId": 42220,
  "gDollarBalance": "1000000000000000000",
  "goodIdVerified": true,
  "rootWallet": "0x...",
  "canClaimOrReceiveG": true
}
```

## Rewards API

```http
GET /api/v1/rewards/claimable?wallet=0x...
POST /api/v1/rewards/prepare-claim
POST /api/v1/rewards/submit-claim-tx
```

## Referral API

```http
GET /api/v1/referrals/me
POST /api/v1/referrals/apply-code
GET /api/v1/referrals/network
GET /api/v1/referrals/earnings
```

## Impact API

```http
GET /api/v1/impact/gooddollar
GET /api/v1/impact/daily
GET /api/v1/impact/public-summary
```

Response:

```json
{
  "gDollarVolume": "1240000000000000000000",
  "predictions": 382,
  "uniqueUsers": 120,
  "verifiedUsers": 91,
  "rewardsClaimed": "210000000000000000000",
  "marketsResolved": 14,
  "returningUsers": 37
}
```

## Fee Router Ops API

```http
GET /api/v1/ops/fee-router/batches
POST /api/v1/ops/fee-router/prepare-route
POST /api/v1/ops/fee-router/record-route-tx
```

## Reporter API

```http
GET /api/v1/reporter/pending
POST /api/v1/reporter/submit
POST /api/v1/reporter/approve
POST /api/v1/reporter/reject
```

## Versioning Rules

- v1 is additive only.
- breaking response changes require v2.
- new fields must be optional for old clients.
- write endpoints must be idempotent.
