# 14 — Codex Implementation Prompt

```txt
You are a senior full-stack growth engineer implementing RetroPick's bootstrap growth, incentives, and marketing system.

Context:
RetroPick is a realtime prediction-market app with:
- REST snapshots
- WebSocket live deltas
- PostgreSQL durable truth
- realtime_events table
- user balances/deposits
- market indexer
- Next.js frontend

Goal:
Build a low-cost growth system for a $100/month bootstrap budget.

Core product loop:
User claims ShareTag
→ makes free predictions
→ portfolio performance stats update
→ user shares performance card
→ friend clicks profile/referral link
→ friend makes first free prediction
→ referrer earns pending points
→ leaderboard/streaks create retention
→ paid USDC incentives later

Important product decision:
Phase 1 starts with shareable portfolio performance, not individual position cards.

Implement in phases.

Phase 0:
1. Add app_users and user_tags tables.
2. Add tag claim/check endpoints.
3. Add public profile endpoint.
4. Add frontend /@[tag] page.
5. Add basic profile header and referral code.

Phase 1:
1. Add free_predictions table.
2. Add POST /api/v1/free-predictions.
3. Enforce one prediction per user/template/epoch.
4. Add user_performance_stats and user_asset_stats.
5. Add PredictionResolutionWorker to resolve free predictions from market/oracle result.
6. Add PerformanceStatsService.
7. Add /api/v1/p/{tag}/performance.
8. Add leaderboard endpoint.
9. Add portfolio performance card component.

Phase 2:
1. Add share_cards and referral_links.
2. Add /api/v1/share/cards.
3. Add /api/v1/share/cards/{id}.png or OG route if frontend-supported.
4. Add /s/{shortCode} redirect tracking.
5. Add copy post templates for X, Telegram, Discord.
6. Track share_card_created and share_link_clicked events.

Phase 3:
1. Add referral_clicks and referral_attributions.
2. Add growth_events.
3. Add points_ledger and user_points_summary.
4. Implement last-click attribution within 7 days.
5. Block self-referrals.
6. Implement PointsWorker:
   - signup
   - first free prediction
   - D1 return
   - 5 predictions
7. Add /api/v1/referrals/dashboard.
8. Add /api/v1/points/ledger and /api/v1/points/summary.

Phase 4:
1. Reuse realtime_events to emit:
   - performance_update
   - points_pending
   - points_confirmed
   - referral_signup_attributed
   - referral_first_prediction
   - leaderboard_update
2. Add WebSocket channels:
   - profile:{tag}
   - points:{address}
   - referrals:{address}
   - leaderboard:weekly
3. Update frontend hooks to live-update profile/points/referral dashboard.

Phase 5:
1. Add paid stats after paid markets exist:
   - user_paid_stats
   - paid PnL card
   - paid referral points
   - reward_reviews
2. Do not auto-payout rewards. Manual review only.

Phase 6:
1. Add creator_rooms and room_memberships.
2. Add room page and room leaderboard.
3. Add creator dashboard.
4. Room creation allowlist first.

Phase 7:
1. Add seasons and campaigns.
2. Add season leaderboard snapshots.
3. Add small manual reward review workflow.
4. Do not add affiliate fee-share until revenue exists.

Rules:
- Points must be ledgered; never only mutate users.points.
- High-value points start as PENDING.
- Points confirmation is backend-worker-only.
- Browser cannot confirm points.
- No token/airdrop guarantee language.
- No cash reward automation under bootstrap.
- No multi-level affiliate early.
- No rewarding raw clicks heavily.
- No rewarding uncapped volume.
- Do not merge free stats and paid PnL into one misleading score.
- Keep cost under $100/month.

Output:
- SQL migrations
- backend services
- REST endpoints
- realtime events
- frontend pages/components/hooks
- tests
- README update
```
