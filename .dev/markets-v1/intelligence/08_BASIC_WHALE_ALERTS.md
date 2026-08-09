# BASIC WHALE ALERTS

**Status:** reviewed
**Owner:** intelligence-lead
**Last updated:** 2026-08-09
**Product:** RetroPick Markets V1
**Wave:** Smart Money Intelligence Launch V1

## Description

This document is the launch authority for **Basic Whale Alerts** in RetroPick Smart Money Intelligence Launch V1. It defines a minimal, account-scoped alert surface: notify when a **followed or watched** wallet trades, and/or when a trade clears **minimum score / notional** thresholds on selected markets—so users get timely awareness without the Wave-6 full alert DSL, spam, or any one-tap execute path.

Launch rehomes **dedup fingerprint + cooldown + quiet hours** concepts from [ALERT_RULES_AND_DELIVERY.md](ALERT_RULES_AND_DELIVERY.md) (complex condition DSL, email/webhook/telegram deferred). Delivery is **push and/or WebSocket/inbox deep-link to market or wallet profile only**—never order submit (ADR-009). Feature flag: `intelligence.whale_alerts`. **ACCOUNT gated**.

Read this when implementing alert prefs on follow rows, whale-event fan-out, or notification actions. Prefer [01_WHALE_TRADE_FEED.md](01_WHALE_TRADE_FEED.md) for whale scoring and [06_FOLLOW_WALLET.md](06_FOLLOW_WALLET.md) for follow membership. Keep [ALERT_RULES_AND_DELIVERY.md](ALERT_RULES_AND_DELIVERY.md) as historical/quantitative reference; do not ship the closed multi-type DSL as Launch V1.

## 0. Developer intent (5W+1H)

| Lens | Answer |
|------|--------|
| **Who** | Authenticated users; alert evaluation worker; inbox/push/WS delivery; agents implementing `intelligence.whale_alerts`. |
| **What** | Basic rules only: followed/watched wallet trades; min LargeTradeScore / notional; optional market filter. Dedup + cooldown + quiet hours. Deep-link delivery only. |
| **When** | After a committed whale/trade event matches user prefs. Applies when shipping follow-linked alerts and threshold alerts. |
| **Where** | Spec: this doc. Store: user alert prefs + delivery log. Inputs: whale feed events + follow set. Flag: `intelligence.whale_alerts`. Channels: inbox, push, WS notify. |
| **Why** | Close the loop after Follow: “tell me when they trade” without becoming a spam bot or an execution engine. |
| **How** | Match event → expand fingerprint → cooldown/quiet-hours gate → fan-out with `VIEW_MARKET` / `VIEW_PROFILE` actions only. |

### Scope boundaries

- **In scope:** followed-wallet trade alerts; whale/threshold alerts on watched markets; min score; min notional; market filter; dedup/cooldown/quiet hours/`maxPerDay`; inbox + push + WS deep-link.
- **Out of scope (Launch):** full JSON condition DSL; portfolio risk alerts; AI-authored alerts; Telegram/Discord/webhook/email; one-tap execute; suggested market orders in payload.
- **Depends on:** [01_WHALE_TRADE_FEED.md](01_WHALE_TRADE_FEED.md), [06_FOLLOW_WALLET.md](06_FOLLOW_WALLET.md), `backend/NOTIFICATIONS.md`.
- **Rehome from alert DSL:** fingerprint, cooldown, quiet hours, maxPerDay — not the full `when.all` type catalog.

## 1. Purpose and growth-loop position

**Primary questions:** Alert when a followed wallet trades; alert when a whale trade exceeds my threshold.

Growth-loop: Follow → Alert → (future) manual copy ticket. Launch ends at awareness + deep-link.

## 2. Basic rule model

Per-user preferences (not arbitrary DSL documents):

```text
markets_whale_alert_prefs
  user_id
  enabled
  min_score              -- optional; null = any scored whale event policy default
  min_notional_usd       -- optional
  market_ids[]           -- empty = all markets (subject to cost caps)
  followed_wallets_only  -- default true for follow-sourced fires
  quiet_hours            -- { tz, start, end } half-open [start, end)
  cooldown_seconds       -- default 1800
  max_per_day            -- default 12
```

Follow rows may set `notify` ([06_FOLLOW_WALLET.md](06_FOLLOW_WALLET.md)); evaluation ANDs user prefs with per-follow `notify`.

## 3. Dedup fingerprint, cooldown, quiet hours (rehomed)

From [ALERT_RULES_AND_DELIVERY.md](ALERT_RULES_AND_DELIVERY.md) §§4.2–4.3 — launch-simplified:

```text
fingerprint = hash(
  user_id,
  event_id | (wallet, market_id, side, trade_time_bucket),
  rule_kind  -- followed_wallet | whale_threshold
)

if delivery exists with same fingerprint and age < cooldown_seconds:
  suppress

if local_time in quiet_hours [start, end):
  queue (non-critical); flush at end unless maxQueueAge exceeded (default 4h)
```

| Policy | Launch default |
|--------|----------------|
| `cooldown_seconds` | 1800 (followed wallet / whale) |
| `max_per_day` | 12 |
| Quiet hours bypass | Launch: **no** critical bypass for whale alerts (all queueable) |
| Idempotency | Persist delivery id; retries must not double-notify |
| Stale suppression | Drop if event age > `max_event_age` (e.g. 15m) before delivery |

Do not re-fire because Data API pagination returned the same trade on a later poll—identity must key on stable trade/event id when present.

## 4. Delivery (normative)

| Channel | Launch | Payload actions |
|---------|--------|-----------------|
| Inbox | yes | deep-link |
| Push | yes (if stack supports) | deep-link |
| WebSocket user notify | yes | deep-link |
| Email / webhook / Telegram | **no** (defer) | — |

**Allowed deep-links:** market detail, wallet profile.  
**Forbidden:** `PLACE_ORDER`, pre-signed orders, one-tap execute, auto-copy CTAs (ADR-009).

Card copy is descriptive (“Followed wallet traded on {market}”) — not a trade instruction.

## 5. API sketch

ACCOUNT + `intelligence.whale_alerts`:

| Method | Path | Behavior |
|--------|------|----------|
| `GET` | `/markets/intelligence/alerts/prefs` | Read prefs |
| `PUT` | `/markets/intelligence/alerts/prefs` | Replace prefs |
| `GET` | `/markets/intelligence/alerts/inbox` | List deliveries |
| `POST` | `/markets/intelligence/alerts/inbox/{id}/read` | Mark read |

Evaluation is worker-driven from whale events; clients do not POST “fire alert.”

## 6. C4 placement

- **Components:** WhaleEvent source → AlertMatcher → DedupStore → DeliveryFanout → NOTIFICATIONS / WS hub.
- **Reads:** FollowStore, user prefs.
- Failures isolated from balances/orders (invariant 28).

## 7. Frontend UX states

| State | UX |
|-------|-----|
| Prefs | Thresholds, quiet hours, followed-only toggle |
| Inbox empty / list | Deep-link rows |
| Push tapped | Open market or profile — never order ticket submit |
| Flag off | Hide prefs; stop evaluation |

## 8. Never V1

| Capability | Status | Authority |
|------------|--------|-----------|
| One-tap execute from alert | **reject** | ADR-009 |
| Full alert DSL as launch surface | **defer** | This doc vs ALERT_RULES… |
| AI→alert→order | **reject** | ADR-009 / ADR-008 |
| Public alert of another user’s follows | **reject** | Privacy |

## 9. Testing, observability, cost

- Unit: fingerprint stability across duplicate polls; cooldown; quiet-hours queue/drop.
- E2E: push/inbox action is view-only.
- Metrics: `intelligence_whale_alerts_matched_total`, `suppressed_total{reason=cooldown|quiet|max_per_day|stale}`, delivery latency.
- Cost: evaluate only users with prefs enabled; bound market_ids cardinality.

## 10. Acceptance criteria

1. User with follow + notify receives at most one delivery per fingerprint inside cooldown.
2. Quiet hours queue non-bypass whale alerts; flush or expire per policy.
3. Delivery deep-links to market/profile only—no execute action.
4. ACCOUNT required; flag `intelligence.whale_alerts` gates feature.
5. Duplicate upstream polls do not create duplicate inbox items.

## 11. Cross-references

- [ALERT_RULES_AND_DELIVERY.md](ALERT_RULES_AND_DELIVERY.md) — source of dedup/cooldown/quiet-hours concepts (not launch DSL)
- [01_WHALE_TRADE_FEED.md](01_WHALE_TRADE_FEED.md), [06_FOLLOW_WALLET.md](06_FOLLOW_WALLET.md), [09_PAPER_COPY.md](09_PAPER_COPY.md)
- [../backend/NOTIFICATIONS.md](../backend/NOTIFICATIONS.md)
- [../architecture/adr/ADR-009-NO-AUTO-COPY-TRADING-V1.md](../architecture/adr/ADR-009-NO-AUTO-COPY-TRADING-V1.md)
