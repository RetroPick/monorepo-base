# RetroPick Growth, Incentives, and Marketing Technical Product Docs

## Goal

Apply the growth concept into RetroPick's existing realtime backend/frontend architecture:

```txt
ShareTag identity
→ shareable portfolio performance
→ free predictions
→ referral attribution
→ points ledger
→ paid USDC incentives
→ creator rooms
→ seasons
→ revenue-backed affiliate
```

## Budget constraint

Bootstrap budget: **~$100/month**.

Therefore:

```txt
Do not buy growth with cash.
Build share loops, identity, content, and points first.
Use tiny rewards only after retention appears.
Use fee-share only after protocol revenue exists.
```

## Core decision

The first viral growth asset should be **shareable portfolio performance**, not a single market-position card.

```txt
Position card = temporary opinion
Portfolio profile = persistent identity and reputation
```

## Included files

| File | Purpose |
|---|---|
| `01-product-growth-architecture.md` | Growth system architecture and product logic |
| `02-phase-roadmap-budget.md` | Phase-by-phase features, must/later, cost |
| `03-growth-api-classification.md` | REST/WS/internal classification for growth features |
| `04-database-schema-growth.md` | PostgreSQL schema for identity, stats, referrals, points, rooms, seasons |
| `05-realtime-events-growth.md` | WebSocket channels/events for profile, points, referrals, leaderboards |
| `06-frontend-growth-refactor.md` | Next.js pages/components/hooks |
| `07-share-card-and-og-image-system.md` | Portfolio/share card image generation architecture |
| `08-points-incentive-engine.md` | Points formulas, ledger, anti-farming, reward status |
| `09-referral-attribution-engine.md` | Attribution model, link params, event tracking |
| `10-creator-rooms-and-seasons.md` | Creator rooms, campaigns, seasonal leaderboards |
| `11-analytics-and-metrics.md` | Product analytics, growth events, KPI dashboards |
| `12-security-anti-abuse-compliance.md` | Sybil/farming controls and compliance boundaries |
| `13-implementation-rollout.md` | Engineering rollout plan connected to existing backend update |
| `14-codex-implementation-prompt.md` | Copy-paste prompt for Codex/Cursor |
| `15-bootstrap-cost-model.md` | $100/month operating model |
