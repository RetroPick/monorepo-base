# 11 — Analytics and Metrics

## 1. Bootstrap analytics rule

Use lightweight analytics:

```txt
PostgreSQL growth_events
PostHog/free analytics if available
simple weekly SQL dashboards
```

## 2. Core funnel

```txt
landing view
profile view
tag claim
first free prediction
second prediction
D1 return
share card generated
share link clicked
referral signup
referral first prediction
paid deposit later
paid market entry later
```

## 3. KPIs by phase

Phase 0:

```txt
tag claim rate
profile completion rate
```

Phase 1:

```txt
first free prediction conversion
predictions/user/day
profile share rate
D1 retention
```

Phase 2:

```txt
click → signup
signup → first prediction
referrer activation rate
points earned per real activation
```

Phase 4:

```txt
free → paid conversion
deposit conversion
paid user D7 retention
paid PnL share rate
```

## 4. SQL examples

Top referrers:

```sql
SELECT
  referrer_user_id,
  COUNT(*) FILTER (WHERE event_type='referral_signup_attributed') AS signups,
  COUNT(*) FILTER (WHERE event_type='referral_first_free_prediction') AS first_predictions
FROM growth_events
WHERE created_at > now() - interval '7 days'
GROUP BY referrer_user_id
ORDER BY first_predictions DESC;
```

## 5. Weekly report

```txt
active predictors
new tags
first predictions
D1/D7 retention
top shared cards
top referrers
points issued
suspected abuse
paid conversion if live
```

## 6. Phase gate rules

```txt
Phase 1 → Phase 2 if users share profiles
Phase 2 → Phase 3 if referral links create first predictions
Phase 3 → Phase 4 if free users return
Phase 4 → Phase 5 if paid conversion exists
Phase 5 → Phase 6 if rooms create activity
Phase 6 → Phase 7 if revenue supports affiliate
```
