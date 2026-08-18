# 09 — Referral Attribution Engine

## 1. Goal

Track which user/content/market/room brings real activated users.

## 2. Link structure

Profile:

```txt
https://retropick.xyz/@asyam?r=asyam&c=genesis&s=x
```

Short link:

```txt
https://retropick.xyz/s/abc123
```

Market later:

```txt
https://retropick.xyz/m/btc-15m?side=up&r=asyam&card=position&c=btc-battle&s=x
```

## 3. Parameters

```txt
r = referrer tag/code
c = campaign
s = source platform
card = card type
side = market side
room = room slug
```

## 4. Attribution model

MVP:

```txt
last-click within 7 days
one referrer per new user
self-referrals blocked
```

## 5. Signup attribution flow

```txt
1. User clicks /s/{shortCode}
2. Server records referral_click
3. Set referral cookie
4. User signs in with wallet
5. Backend checks cookie/referrer
6. Creates referral_attribution
7. Emits referral_signup_attributed
8. PointsWorker creates pending points
```

## 6. Anti-self-referral

Block if:

```txt
same wallet
same user id
same device visitor id
same recent funding source
obvious same IP/user-agent cluster
```

## 7. Dashboard metrics

Referrer:

```txt
clicks
signups
first free predictions
D1 retained
paid activations
pending points
confirmed points
```

Operator:

```txt
conversion by source
suspicious clusters
top referrers
top cards
top campaigns
```

## 8. Do not overbuild

No multi-level affiliate in MVP.
