# 06 — Backend Domain Architecture

## Goal

V3 backend should stop being a shared `internal/` bag. It should become:

```text
cmd/* = wiring only
internal/platform/* = infrastructure
internal/domain/* = business logic
```

## Target Domains

| Domain | Responsibilities |
|---|---|
| `market` | templates, market lists, market read models |
| `epoch` | epoch state, positions, claims |
| `oracle` | feed health, candles, checkpoints |
| `funding` | deposit intents, cross-chain credits |
| `reporter` | reporter identity, submissions, approvals |
| `realtime` | event envelopes, WS replay |
| `gooddollar` | G$ config, GoodID status, GoodDollar SDK adapters |
| `referrals` | codes, trees, referral bindings |
| `rewards` | claimable ledger, EngagementRewards claim preparation |
| `impact` | KPI aggregation and public dashboard |

## Import Rules

```text
cmd/* may import domain/* and platform/*
domain/* may import platform/*
domain/* may not import another domain/*
cross-domain coordination happens via platform/bus or cmd wiring
```

## Platform Layer

```text
platform/db
platform/bus
platform/chain
platform/config
platform/obs
platform/httpx
platform/cache
```

## Event Bus Contract

```go
type Event interface {
    Topic() string
}

type Handler func(ctx context.Context, e Event) error

type Bus interface {
    Publish(ctx context.Context, e Event) error
    Subscribe(topic string, h Handler)
}
```

## Domain Service Shape

```go
type Service struct {
    repo Repository
    bus  bus.Bus
    log  obs.Logger
}
```

## Why In-Process Bus First

Use in-process bus first because durability lives in Postgres. The bus is a decoupling tool, not a durability mechanism. Postgres `chain_events` and `realtime_events` remain the durable records.
