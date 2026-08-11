# FOLLOW WALLET

**Status:** reviewed
**Owner:** intelligence-lead
**Last updated:** 2026-08-09
**Product:** RetroPick Markets V1
**Wave:** Smart Money Intelligence Launch V1

## Description

This document is the launch authority for **Follow Wallet** in RetroPick Smart Money Intelligence Launch V1. It defines a private, account-scoped follow/unfollow store over RetroPick user identity only—so authenticated users can keep watching wallets they care about after leaving a profile, without RetroPick inventing social graphs, public “followed by” counts, or any auto-copy linkage.

It sits after Wallet Profile / Smart Money and before Basic Whale Alerts and Paper Copy in the growth loop (“I found a trader I care about → keep watching”). Persistence lives under `markets_wallet_follows` (or equivalent); HTTP surface is CRUD under `/markets/intelligence/follows`. Feature flag: `intelligence.follow`. **ACCOUNT gated** (auth required; Markets PHASE-2 account infrastructure). Follow never places, schedules, or implies orders (ADR-009).

Read this when shipping follow buttons on wallet profile, wiring alert/paper “follow source” lists, or implementing follow privacy. Prefer [08_BASIC_WHALE_ALERTS.md](08_BASIC_WHALE_ALERTS.md) for notification rules and [09_PAPER_COPY.md](09_PAPER_COPY.md) for simulated follow—not for the follow store itself. Do not invent auth inside Intelligence; reuse Markets account principals.

## 0. Developer intent (5W+1H)

| Lens | Answer |
|------|--------|
| **Who** | Authenticated RetroPick users; BFF follow store; web/Android wallet-profile clients; agents wiring `intelligence.follow`; alert/paper consumers of the user’s follow set. |
| **What** | Private follow/unfollow of public wallet addresses, owned by `user_id`. Optional notification / paper-follow preference flags on the row. **Not** public follower counts, social feed, guest server sync, or auto-copy. |
| **When** | After account auth exists (PHASE-2). Applies when shipping profile Follow CTA, follow list management, and downstream “watched/followed wallet” alert inputs. |
| **Where** | Spec: this doc. APIs: `/markets/intelligence/follows`. Store: user-scoped follow table. Flag: `intelligence.follow`. Cross-ref: ADR-009, [03_WALLET_PROFILE.md](03_WALLET_PROFILE.md), [08_BASIC_WHALE_ALERTS.md](08_BASIC_WHALE_ALERTS.md), [09_PAPER_COPY.md](09_PAPER_COPY.md). |
| **Why** | Retention: users need a durable “watch this trader” preference that feeds alerts and paper sim without exposing who follows whom or automating trades. |
| **How** | Authenticated CRUD; lists private by default; no reverse index API; never auto-submit orders when a followed wallet trades. |

### Scope boundaries

- **In scope:** follow, unfollow, list my follows, optional per-follow prefs (`notify`, `paper_follow_enabled`); idempotent create; max follows cap.
- **Out of scope:** public “followed by”; mutual follows; guest cloud sync (local-only guest state is client concern, not this API); Telegram/social share of follow graphs; auto-copy from follow.
- **Depends on:** Markets account/auth (PHASE-2); wallet address normalization from Wallet Search/Profile.
- **Downstream:** Basic Whale Alerts (`watched/followed`); Paper Copy follow source; growth analytics `intelligence_wallet_followed`.

## 1. Purpose and growth-loop position

**Primary question:** *I found a trader I care about. How do I keep watching them?*

Growth-loop stage: after profile / smart-money evaluation; before alerts and paper copy. Follow is preference storage only—not execution.

## 2. Privacy (normative)

| Rule | Requirement |
|------|-------------|
| Follow list default | **Private** to the owning `user_id` |
| Public “followed by” | **Forbidden** in Launch V1 |
| Reverse graph queries | **No** public or cross-user API |
| Sharing | Only via explicit future share flows (out of Launch V1) |
| Analytics | Aggregate counters only; do not log peer identity pairs into product analytics |

## 3. Domain model

```text
markets_wallet_follows
  id              uuid
  user_id         uuid          -- RetroPick account
  wallet_address  text          -- checksummed / lowercased per platform convention
  created_at      timestamptz
  notify          bool          -- default true when whale_alerts enabled
  paper_follow_enabled bool     -- preference hint; does not start paper alone
  UNIQUE (user_id, wallet_address)
```

Caps (launch defaults): `max_follows_per_user = 100`. Reject over-cap with `429` / structured error.

## 4. API contract

Base path: `/markets/intelligence/follows`  
Auth: **required** (ACCOUNT). Flag: `intelligence.follow` off → `404` or capability-denied per OpenAPI convention.

| Method | Path | Behavior |
|--------|------|----------|
| `GET` | `/markets/intelligence/follows` | List caller’s follows (paginated) |
| `POST` | `/markets/intelligence/follows` | Body `{ walletAddress, notify?, paperFollowEnabled? }` — upsert |
| `PATCH` | `/markets/intelligence/follows/{id}` | Update prefs only |
| `DELETE` | `/markets/intelligence/follows/{id}` | Unfollow |
| `DELETE` | `/markets/intelligence/follows?walletAddress=` | Unfollow by address (optional convenience) |

Responses never include other users’ follow state. No `followersCount` on public wallet profile.

## 5. C4 placement

- **Container:** Markets BFF (`apps/backend/internal/markets/intelligence/`).
- **Components:** FollowStore (CRUD), AuthPrincipal middleware, Preference projection read by Alerts/Paper.
- **Actors:** Authenticated trader only.
- Canonical diagrams: `INTELLIGENCE_C4_MODEL.md` (when present).

## 6. Frontend UX states

| State | UX |
|-------|-----|
| Flag off / unauthenticated | Hide Follow or show sign-in gate |
| Not following | Primary “Follow” on wallet profile |
| Following | “Following” + unfollow confirm |
| Cap reached | Inline error; no silent drop |
| Error | Retry; do not claim follow succeeded |

Copy must stay descriptive (“Follow this wallet for alerts”)—never “auto-copy their trades.”

## 7. Never V1 (hard reject)

| Capability | Status | Authority |
|------------|--------|-----------|
| Auto-copy / server orders from follow | **reject** | ADR-009 |
| Public follower graph | **reject** | Privacy §2 |
| One-tap execute from follow UI | **reject** | ADR-009 |
| Inventing auth inside Intelligence | **reject** | Markets account owns identity |

## 8. Testing, observability, cost

- Unit: upsert idempotency, uniqueness, cap, privacy (no reverse list).
- Contract: OpenAPI ACCOUNT + flag gating.
- Metrics: `intelligence_follows_total{action=create|delete}`, `intelligence_follows_cap_hits_total`.
- Cost: O(follows) rows per user; no fan-out to Polymarket on write.

## 9. Acceptance criteria

1. Authenticated user can follow/unfollow a wallet; list returns only their rows.
2. Unauthenticated callers receive auth challenge; no guest write to server store.
3. No API exposes who follows a wallet.
4. Enabling follow does not create orders, paper runs, or alert deliveries by itself.
5. Flag `intelligence.follow` disables the surface cleanly.

## 10. Cross-references

- [03_WALLET_PROFILE.md](03_WALLET_PROFILE.md), [05_SMART_MONEY_LEADERBOARD.md](05_SMART_MONEY_LEADERBOARD.md)
- [08_BASIC_WHALE_ALERTS.md](08_BASIC_WHALE_ALERTS.md), [09_PAPER_COPY.md](09_PAPER_COPY.md), [10_QUICK_BACKTEST.md](10_QUICK_BACKTEST.md)
- [../architecture/adr/ADR-009-NO-AUTO-COPY-TRADING-V1.md](../architecture/adr/ADR-009-NO-AUTO-COPY-TRADING-V1.md)
- Dedup/delivery concepts remain in [ALERT_RULES_AND_DELIVERY.md](ALERT_RULES_AND_DELIVERY.md) → rehomed for launch into 08 (do not treat complex DSL as launch scope)
