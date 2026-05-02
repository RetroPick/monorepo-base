# 04 — Database Schema for Growth

Assumes PostgreSQL.

Use the existing `realtime_events` table for WebSocket delivery.

## 1. Users and tags

```sql
CREATE TABLE app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_wallet TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ
);

CREATE TABLE user_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id),
  tag TEXT UNIQUE NOT NULL,
  normalized_tag TEXT UNIQUE NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT true,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_at TIMESTAMPTZ,
  CHECK (normalized_tag = lower(normalized_tag))
);
```

## 2. Free predictions

```sql
CREATE TABLE free_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id),
  user_address TEXT NOT NULL,
  template_id TEXT NOT NULL,
  epoch_id BIGINT NOT NULL,
  asset_symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  result TEXT,
  is_correct BOOLEAN,
  predicted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'web',
  referral_attribution_id UUID,
  UNIQUE(user_id, template_id, epoch_id)
);
```

## 3. Performance stats

```sql
CREATE TABLE user_performance_stats (
  user_id UUID PRIMARY KEY REFERENCES app_users(id),
  total_predictions INT NOT NULL DEFAULT 0,
  correct_predictions INT NOT NULL DEFAULT 0,
  accuracy_bps INT NOT NULL DEFAULT 0,
  current_streak INT NOT NULL DEFAULT 0,
  best_streak INT NOT NULL DEFAULT 0,
  prediction_score BIGINT NOT NULL DEFAULT 0,
  underdog_wins INT NOT NULL DEFAULT 0,
  last_prediction_at TIMESTAMPTZ,
  rank_global INT,
  percentile_global INT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_asset_stats (
  user_id UUID NOT NULL REFERENCES app_users(id),
  asset_symbol TEXT NOT NULL,
  total_predictions INT NOT NULL DEFAULT 0,
  correct_predictions INT NOT NULL DEFAULT 0,
  accuracy_bps INT NOT NULL DEFAULT 0,
  current_streak INT NOT NULL DEFAULT 0,
  best_streak INT NOT NULL DEFAULT 0,
  score BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, asset_symbol)
);
```

## 4. Paid performance stats

Add in Phase 4.

```sql
CREATE TABLE user_paid_stats (
  user_id UUID PRIMARY KEY REFERENCES app_users(id),
  paid_markets_entered INT NOT NULL DEFAULT 0,
  paid_wins INT NOT NULL DEFAULT 0,
  paid_win_rate_bps INT NOT NULL DEFAULT 0,
  total_staked_usdc NUMERIC(78,0) NOT NULL DEFAULT 0,
  realized_pnl_usdc NUMERIC(78,0) NOT NULL DEFAULT 0,
  roi_bps INT NOT NULL DEFAULT 0,
  best_win_usdc NUMERIC(78,0) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 5. Referrals

```sql
CREATE TABLE referral_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES app_users(id),
  code TEXT UNIQUE NOT NULL,
  destination_type TEXT NOT NULL,
  destination_id TEXT,
  campaign_id UUID,
  source_platform TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE referral_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_link_id UUID REFERENCES referral_links(id),
  referrer_user_id UUID REFERENCES app_users(id),
  visitor_id TEXT,
  ip_hash TEXT,
  user_agent_hash TEXT,
  landing_path TEXT NOT NULL,
  source_platform TEXT,
  campaign_id UUID,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE referral_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referred_user_id UUID NOT NULL REFERENCES app_users(id),
  referrer_user_id UUID NOT NULL REFERENCES app_users(id),
  referral_click_id UUID REFERENCES referral_clicks(id),
  referral_link_id UUID REFERENCES referral_links(id),
  attribution_model TEXT NOT NULL DEFAULT 'last_click',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  UNIQUE(referred_user_id)
);
```

## 6. Growth events and points

```sql
CREATE TABLE growth_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  actor_user_id UUID REFERENCES app_users(id),
  actor_address TEXT,
  target_user_id UUID REFERENCES app_users(id),
  reference_type TEXT,
  reference_id TEXT,
  referral_attribution_id UUID REFERENCES referral_attributions(id),
  campaign_id UUID,
  payload JSONB NOT NULL DEFAULT '{}',
  ip_hash TEXT,
  user_agent_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id),
  delta BIGINT NOT NULL,
  reason TEXT NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  campaign_id UUID,
  status TEXT NOT NULL DEFAULT 'PENDING',
  idempotency_key TEXT NOT NULL UNIQUE,
  available_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  clawed_back_at TIMESTAMPTZ,
  review_note TEXT
);

CREATE TABLE user_points_summary (
  user_id UUID PRIMARY KEY REFERENCES app_users(id),
  pending_points BIGINT NOT NULL DEFAULT 0,
  confirmed_points BIGINT NOT NULL DEFAULT 0,
  clawed_back_points BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 7. Share cards

```sql
CREATE TABLE share_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES app_users(id),
  card_type TEXT NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  short_code TEXT UNIQUE NOT NULL,
  image_url TEXT,
  title TEXT NOT NULL,
  description TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  referral_link_id UUID REFERENCES referral_links(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 8. Rooms, seasons, rewards

```sql
CREATE TABLE creator_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES app_users(id),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE room_memberships (
  room_id UUID NOT NULL REFERENCES creator_rooms(id),
  user_id UUID NOT NULL REFERENCES app_users(id),
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  referral_attribution_id UUID REFERENCES referral_attributions(id),
  PRIMARY KEY(room_id, user_id)
);

CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  reward_budget_usdc NUMERIC(78,0) NOT NULL DEFAULT 0,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID REFERENCES seasons(id),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL,
  status TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  point_multiplier_bps INT NOT NULL DEFAULT 10000,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reward_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id),
  season_id UUID REFERENCES seasons(id),
  reward_type TEXT NOT NULL,
  amount_usdc NUMERIC(78,0),
  points_cost BIGINT,
  status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  reason TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  payout_tx_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 9. Migration order

```txt
Phase 0: app_users, user_tags
Phase 1: free_predictions, user_performance_stats, user_asset_stats, share_cards
Phase 2: referral_links, referral_clicks, referral_attributions, growth_events, points_ledger, user_points_summary
Phase 4: user_paid_stats, reward_reviews
Phase 5: creator_rooms, room_memberships
Phase 6: seasons, campaigns, leaderboard_snapshots
```
