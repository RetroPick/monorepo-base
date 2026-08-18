# 15 — Bootstrap Cost Model

## 1. Target

```txt
Maximum budget: ~$100/month
```

## 2. Months 1–2

```txt
Backend/VPS: $20–40
Frontend hosting: $0
Analytics: $0
Rewards: $0–10
Content experiments: $20–30
Buffer: $20–40
```

Focus:

```txt
free prediction + portfolio share loop
```

## 3. Months 3–4

```txt
Backend/VPS: $30–50
Frontend hosting: $0–20 if needed
Analytics: $0
Rewards: $10–30
Creator experiments: $10–20
Buffer: $10–20
```

Focus:

```txt
referrals + paid conversion
```

## 4. Months 5+

```txt
Backend/VPS: $40–60
Rewards: $20–40
Creator/season experiments: $10–30
Buffer: $10
```

Focus:

```txt
rooms + seasons
```

## 5. Infrastructure guidance

Start with:

```txt
one VPS
PostgreSQL on same VPS
Next.js on free/cheap hosting or same VPS
no Redis/Kafka/NATS
no paid CRM
no paid affiliate platform
```

## 6. Cost gates

| Add | Only when |
|---|---|
| Redis/NATS | WS scale or PG NOTIFY bottleneck |
| Object storage | share images exceed local disk comfort |
| Paid analytics | free analytics insufficient |
| Paid email | email becomes meaningful retention channel |
| Larger rewards | D7 retention and paid conversion justify it |
| Affiliate payout | protocol revenue exists |

## 7. Manual-first ops

Under $100/month, do manually:

```txt
reward approvals
creator approvals
abuse reviews
weekly reports
campaign setup
```

Automate later after volume.
