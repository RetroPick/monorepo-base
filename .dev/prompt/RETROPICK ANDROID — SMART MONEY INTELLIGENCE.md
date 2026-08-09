# RETROPICK ANDROID — SMART MONEY INTELLIGENCE
## Mobile UX System & Growth-Loop Prototype

Act as a **Principal Mobile Product Designer, Senior UX Architect, Senior Android Product Designer, Fintech Trading UX Specialist, Prediction-Market Product Designer, Behavioral Product Designer, Information Architect, and Senior Frontend Engineer**.

Design a complete high-fidelity **Android mobile Smart Money Intelligence experience for RetroPick Markets V1**.

This task is primarily about:

**UX architecture, information hierarchy, user flow, interaction design, state design, mobile usability, conversion, trust, and retention.**

Do NOT treat this as a visual-style exploration.

I will upload screenshots/images of my existing RetroPick mobile UI.

## ABSOLUTE VISUAL RULE

The uploaded RetroPick UI is the **visual design source of truth**.

Study it deeply before generating anything.

Preserve its existing:

- color system
- dark/light behavior
- typography
- type scale
- spacing rhythm
- card style
- border treatment
- corner radius
- icon treatment
- button style
- navigation styling
- market-card styling
- charts
- density
- elevation
- background surfaces
- visual personality
- overall premium feel

Do NOT redesign RetroPick into another visual identity.

Do NOT create a generic crypto app.

Do NOT create a generic Material Design demo.

Do NOT create a neon Web3 casino.

Do NOT copy Binance, Robinhood, Polymarket, Kalshi, or any other product visually.

Use Android-native interaction logic where appropriate, but make it look unmistakably like the uploaded RetroPick design.

The task is:

> Extend my existing RetroPick visual system into a world-class mobile Smart Money Intelligence UX.

---

# 1. PRODUCT

RetroPick Markets is an intelligence-first interface for prediction markets.

Users should be able to discover large market moves and public trader activity, inspect public wallet history, determine whether a wallet has demonstrated meaningful performance, test a hypothetical follow strategy, paper-follow that wallet, and receive future activity alerts.

The UX must feel like:

**professional financial intelligence**

not:

**gambling**

not:

**social copy-trading hype**

not:

**crypto influencer tooling**

The product should communicate:

- evidence
- probability
- performance
- uncertainty
- provenance
- freshness
- simulation
- user control

---

# 2. PRIMARY PRODUCT LOOP

Design the entire UX around this progression:

```text
             WHALE TRADE
                  ↓
          "Who made this trade?"
                  ↓
             WALLET PROFILE
                  ↓
        "Is this trader actually good?"
                  ↓
       PERFORMANCE + SMART MONEY
                  ↓
           QUICK BACKTEST
                  ↓
       "Would copying have worked?"
                  ↓
              FOLLOW
                  ↓
            PAPER COPY
                  ↓
               ALERT
                  ↓
       RETURN TO MARKET / PROFILE
```

Future — NOT part of the current launch prototype:

```text
MANUAL COPY TRADE
        ↓
USER REVIEWS ORDER
        ↓
USER SIGNS
        ↓
LIVE TRADE
```

The current launch prototype must stop before actual trading.

Do NOT create:

- automatic copy trading
- instant copy-trade execution
- AI-generated orders
- one-tap live copy
- server-controlled trades

---

# 3. EXACT LAUNCH FEATURES

The Android Intelligence UX must cover exactly these ten features:

1. Whale Trade Feed
2. Wallet Search
3. Wallet Profile
4. P&L / ROI / Win Rate
5. Smart Money Leaderboard
6. Follow Wallet
7. Top Holders
8. Basic Whale Alerts
9. Paper Copy
10. Quick Backtest

Do not invent unrelated launch features.

---

# 4. UX PRINCIPLE

Do NOT design ten separate mini-products.

Turn them into a small number of coherent mobile destinations.

Recommended UX architecture:

```text
INTELLIGENCE
│
├── Discover
│   ├── Whale Feed
│   ├── Smart Money
│   └── Wallet Search
│
├── Wallet Profile
│   ├── Overview
│   ├── Performance
│   ├── Positions
│   ├── Activity
│   ├── Follow
│   ├── Quick Backtest
│   └── Paper Follow
│
├── Following
│   ├── Followed wallets
│   ├── Recent activity
│   └── Alert state
│
└── Paper
    ├── Paper portfolio
    ├── Paper following
    ├── Simulated positions
    ├── Simulated fills
    └── Performance
```

Top Holders is primarily embedded in:

```text
MARKET DETAIL
→ Top Holders
→ Wallet Profile
```

Alerts are not a giant separate product.

They are primarily:

```text
notification
→ deep-link
→ market/profile
```

with a lightweight inbox/settings surface.

---

# 5. MOBILE NAVIGATION

Do not add ten bottom navigation items.

Preserve the bottom navigation architecture from my uploaded UI.

Add Intelligence in the least disruptive way possible.

If the current navigation already has an appropriate destination, integrate Smart Money Intelligence there.

Inside Intelligence, prefer:

- segmented tabs
- horizontal filter chips
- context navigation
- push navigation
- bottom sheets
- contextual actions

over nested hamburger menus.

Recommended Intelligence top-level segmentation:

```text
Whales
Smart Money
Following
Paper
```

Wallet Search should be available prominently through search.

Wallet Profile is contextual and should not be a top-level tab.

Top Holders stays contextual inside a market.

Backtest stays contextual inside a wallet.

---

# 6. SCREEN 1 — INTELLIGENCE HOME / WHALE FEED

This is the main acquisition screen.

Primary user question:

> What important trades are happening right now?

Header:

```text
Intelligence
```

Secondary navigation:

```text
Whales | Smart Money | Following | Paper
```

Default:

```text
Whales
```

Add a prominent but compact wallet-search affordance.

Example search entry:

```text
Search wallet or trader
```

Do not consume half the screen with search.

---

# 7. WHALE FEED INFORMATION HIERARCHY

Each Whale Feed item should answer, in order:

### 1. WHAT MARKET?

Market thumbnail/icon where available.

Market title.

Example:

```text
Will BTC exceed $150K in 2026?
```

### 2. WHAT HAPPENED?

Example:

```text
Bought YES
```

or:

```text
Sold NO
```

### 3. HOW BIG?

Make notional the strongest numeric field.

Example:

```text
$42.5K
```

### 4. AT WHAT PRICE?

Example:

```text
YES @ 42¢
```

### 5. WHO?

Wallet identity:

```text
macroking
0x72F...9A3
```

### 6. WHY IS IT SHOWN?

Use descriptive reason chips such as:

```text
Large size
6.2% of 24h volume
Moved price +2.1¢
```

Do not display unexplained internal reason-code names.

### 7. WHEN?

Example:

```text
18s ago
```

### 8. PRIMARY CTA

```text
View Trader
```

Secondary contextual action:

```text
Follow
```

if authenticated.

Do NOT put a live "Copy" button in the Whale Feed.

---

# 8. WHALE FEED CARD DESIGN

Do not overload every card.

Use progressive disclosure.

Default collapsed card should show roughly:

```text
[market icon] Market title

BUY YES · 42¢                      18s
$42.5K

macroking · 0x72F...9A3

Large size · 6.2% volume

                        View Trader >
```

Optional expanded state:

```text
Trade Size
Volume Share
Estimated Price Impact
Freshness
Source
```

WhaleScore may exist, but avoid making:

```text
WhaleScore 87
```

the dominant message.

Users understand:

```text
$42.5K
6.2% of volume
+2.1¢ impact
```

better than an opaque score.

If WhaleScore is shown, make it secondary and explainable.

---

# 9. WHALE FEED FILTER UX

Do not create desktop-style advanced-filter panels.

Use a compact horizontal chip row:

```text
All
>$5K
>$25K
>$100K
Following
Markets
```

Optional filter sheet:

```text
Minimum trade
Minimum score
Market
Wallet
Reason
```

Add:

```text
Reset
Apply
```

Use bottom sheet on Android.

---

# 10. FEED FRESHNESS

The feed may not be sub-second.

The UI must be honest.

Show subtle states such as:

```text
Live-ish · updated 8s ago
```

or:

```text
Updated 22s ago
```

If degraded:

```text
Data delayed
Last updated 2m ago
```

Do not show a fake green "LIVE" indicator when freshness is uncertain.

---

# 11. EMPTY / FAILURE STATES

Design:

### No whales

```text
No large trades match these filters.
```

### Data temporarily delayed

```text
Whale activity is delayed.
Showing the latest available trades.
```

### Offline

Keep last-good data where possible.

Clearly mark it as stale.

---

# 12. SCREEN 2 — WALLET SEARCH

Search must feel extremely fast.

Full-screen search or focused search sheet.

Search modes:

```text
wallet address
public username
public display name
```

Search result row:

```text
[avatar]

macroking
0x72F...9A3

30d volume $1.2M
64 resolved markets
```

Do not show Smart Money Score before it is actually available.

If address has no public profile:

```text
0x72F...9A3
No public username
```

It must still be clickable.

---

# 13. SEARCH RECENT / DISCOVERY

When search is empty, show useful shortcuts:

```text
Recent searches
```

and optionally:

```text
Trending traders
Top Smart Money
Recent whales
```

Do not invent personalized recommendations if no personalization exists.

---

# 14. SCREEN 3 — WALLET PROFILE

This is the most important decision surface in the entire Intelligence experience.

The profile must answer:

```text
WHO is this?
WHAT have they done?
ARE they actually good?
SHOULD I follow them?
WOULD copying them historically have worked?
```

---

# 15. WALLET PROFILE HEADER

Top:

```text
[avatar]

macroking
0x72F...9A3       [copy address]
```

Optional descriptive tags:

```text
High volume
Recently active
Politics
```

Never show:

```text
INSIDER
Guaranteed winner
Pro trader
```

without defensible evidence.

Primary actions:

```text
Follow
Quick Backtest
```

After following:

```text
Following
```

Paper action can be introduced after evidence/performance:

```text
Paper Follow
```

not as the first action before users evaluate the wallet.

---

# 16. WALLET PROFILE SUMMARY

Immediately show the most decision-relevant metrics.

Recommended compact grid:

```text
P&L             ROI
+$84.2K         +18.7%

Win Rate        Resolved
59%             74
```

Then:

```text
Smart Money Score
82 / 100
```

only when available and validated.

Add subtle explanatory link:

```text
How this is calculated
```

---

# 17. PROVENANCE & CONFIDENCE UX

Some fields are:

```text
Polymarket public data
```

Some are:

```text
RetroPick derived
```

Do not place noisy badges beside every number.

Instead use:

- info icon
- details sheet
- methodology bottom sheet

Example:

```text
Win rate 59% ⓘ
```

Tap:

```text
Adjusted for sample size
74 resolved markets
90% interval: 52–65%
RetroPick derived
```

This builds trust without making the default screen academic.

---

# 18. WALLET PROFILE TABS

Use a compact segmented/tab structure:

```text
Overview
Positions
Activity
```

Do not create seven tabs.

Performance should be summarized in Overview and expanded through a section/details view.

---

# 19. PROFILE OVERVIEW

Recommended hierarchy:

```text
Performance Summary

Smart Money Score

Performance Over Time chart

Category Strengths

Current Exposure

Recent Activity

Quick Backtest CTA
```

Keep the most important CTA visible but not aggressive.

---

# 20. PERFORMANCE CHART

Show:

```text
30D
90D
All
```

Possible chart:

```text
Cumulative realized P&L
```

Allow alternative metric:

```text
ROI
```

Do not overload with ten lines.

---

# 21. WIN RATE

Clearly distinguish:

```text
Adjusted Win Rate
```

from simple raw wins.

When sample is insufficient:

```text
Not enough resolved markets yet
```

Do NOT show:

```text
0%
```

when the real value is unknown.

---

# 22. SMART MONEY SCORE

This is a skill-quality indicator, not a wealth score.

Visual treatment:

```text
Smart Money
82
Strong evidence
```

Supporting line:

```text
74 resolved markets · +18.7% realized ROI
```

Optional details sheet:

```text
Adjusted win rate
Realized ROI
PnL stability
Sample size
```

Avoid gauge-chart gimmicks if they conflict with the existing RetroPick design.

---

# 23. SCREEN 4 — SMART MONEY LEADERBOARD

Main user question:

> Who has demonstrated strong historical performance?

Leaderboard header:

```text
Smart Money
```

Category chips:

```text
Overall
Politics
Crypto
Macro
Sports
Tech
```

Time filters if supported:

```text
30D
90D
All
```

---

# 24. LEADERBOARD ROW

Prioritize:

```text
Rank
Trader
Smart Money Score
ROI
Resolved sample
```

Example:

```text
#1

macroking
0x72F...9A3

Score 91
ROI +32.4%
84 resolved
```

Make row tappable → Wallet Profile.

Do not create giant P&L numbers that make the leaderboard look like a gambling leaderboard.

---

# 25. LEADERBOARD CONFIDENCE

Small-sample traders should not appear as equals.

If a wallet is not eligible:

do not rank it publicly.

On profile show:

```text
Smart Money ranking unavailable
Need more resolved markets
```

---

# 26. SCREEN 5 — MARKET DETAIL / TOP HOLDERS

Top Holders belongs inside the existing Market Detail UX.

Do not create a main-nav screen unless necessary.

Add a section or tab:

```text
Top Holders
```

Segment:

```text
YES | NO
```

---

# 27. HOLDER ROW

Show:

```text
#1

macroking
0x72F...9A3

Position
$92.4K

Skill
84
```

If current user follows the wallet:

```text
Following
```

Tap → Wallet Profile.

Do not put:

```text
Copy
Buy with whale
```

buttons on holder rows.

---

# 28. HOLDERS SUMMARY

Optional compact context:

```text
Observed high-skill exposure

YES 63%
NO 37%
```

Mandatory qualifier nearby:

```text
Among scored top holders
```

Do not visually imply 63% means a 63% probability of YES.

These are different concepts.

---

# 29. SCREEN 6 — FOLLOWING

This is a retention destination.

Header:

```text
Following
```

Show followed wallets and their latest meaningful action.

Example:

```text
macroking
Politics · Score 82

Bought YES · $18.4K
Will CPI fall below 3%?
11m ago
```

Possible small status:

```text
Alerts on
Paper off
```

Tapping row → Wallet Profile.

---

# 30. FOLLOW ACTION

On Profile:

```text
Follow
```

Tap should be instant or nearly instant.

After success:

```text
Following
```

Optional small confirmation sheet:

```text
Following macroking

Notify me when this wallet makes a large trade
[On]

[Done]
```

Do NOT force users through a complex alert setup before following.

---

# 31. AUTH GATE

Follow, Alerts, Paper and saved Backtests require an account.

Do not abruptly redirect.

Use contextual gate:

```text
Follow this wallet

Create or sign in to save followed traders
and receive activity alerts.

[Continue]
[Not now]
```

Preserve the user's original task when they return from auth.

---

# 32. SCREEN 7 — BASIC WHALE ALERTS

Keep this very simple.

Not a developer-style rule builder.

Settings:

```text
Whale Alerts                    On

Followed wallets                On

Minimum trade
$5K

Minimum score
70

Quiet hours
10 PM – 7 AM

Daily maximum
12
```

Optional market selection.

No complex Boolean DSL.

No code-like UI.

---

# 33. ALERT INBOX

Notification row example:

```text
macroking made a large trade

Bought YES · $24.8K
Will BTC exceed $150K?

3m ago
```

Tap action:

```text
View Market
```

or:

```text
View Trader
```

No live order action.

---

# 34. PUSH NOTIFICATION UX

Push example:

```text
Large trade from macroking

Bought YES · $24.8K
Will BTC exceed $150K?

Tap to view
```

Deep link directly into the relevant Market Detail or Wallet Profile.

---

# 35. SCREEN 8 — QUICK BACKTEST SETUP

Launch mainly from Wallet Profile:

```text
Quick Backtest
```

This is the transition from:

```text
"they look good"
```

to:

```text
"would following them have worked for me?"
```

Do not design this as a professional quantitative backtesting terminal.

Make it approachable.

---

# 36. BACKTEST INPUTS

Recommended form:

```text
Test this wallet

Period
[7D] [30D] [90D]

Starting balance
$1,000

Copy each trade with
$25
```

Advanced settings collapsed:

```text
Advanced
```

Possible advanced options:

```text
Max entry probability
Market/category
```

Primary CTA:

```text
Run Backtest
```

---

# 37. BACKTEST RUNNING

Use a real progress state.

Example:

```text
Testing 90 days of activity…

Fetching trades
Matching historical prices
Simulating fills
Calculating performance
```

Avoid fake precision.

If processing is asynchronous, make it clear users can leave and return.

---

# 38. BACKTEST RESULT

This screen should create the strongest persuasion moment in the intelligence funnel.

Top summary:

```text
If you followed macroking

$1,000 → $1,184

+18.4%
```

Then:

```text
P&L
+$184

Max drawdown
-9.2%

Trades copied
73

Win rate
57%
```

---

# 39. BACKTEST CHART

Simple equity curve.

Time along X axis.

Virtual account value along Y axis.

Do not use flashy green fills that imply guaranteed profit.

For negative results, present equally cleanly.

---

# 40. BACKTEST ASSUMPTIONS

Results MUST surface simulation honesty.

Compact:

```text
Simulation assumptions ⓘ
```

Tap sheet:

```text
Historical simulation
Fixed $25 copy size
Includes delayed observation assumptions
Uses historical market prices where available
Some trades may be omitted when historical data is incomplete
Past performance does not guarantee future results
```

When degraded:

```text
Partial historical coverage
```

must be prominent before the user interprets performance.

---

# 41. BACKTEST PRIMARY CTA

After result:

Primary:

```text
Paper Follow
```

Secondary:

```text
Follow Wallet
```

If already followed:

```text
Start Paper Copy
```

Do NOT show:

```text
Copy Live
```

---

# 42. SCREEN 9 — PAPER COPY SETUP

Paper Copy must feel like an intentional simulation product.

Header:

```text
Paper Follow
```

Strong visual notice:

```text
SIMULATION
No real money is used.
```

Configuration:

```text
Trader
macroking

Virtual starting balance
$1,000

Copy amount per trade
$25

Maximum per trade
$50
```

Optional:

```text
Markets
All
```

Primary CTA:

```text
Start Paper Follow
```

---

# 43. PAPER COPY HONESTY

Very important:

The simulated user does NOT automatically receive the whale's original entry price.

UX should educate this elegantly.

Example info:

```text
How simulation fills work

RetroPick simulates your fill using the next
available market price after the trade is observed.
```

Do not bury this in Terms & Conditions.

---

# 44. SCREEN 10 — PAPER PORTFOLIO

This becomes a habit/retention destination.

Header:

```text
Paper
```

Summary:

```text
Virtual Equity
$1,184

Return
+18.4%

Paper P&L
+$184
```

Prominent chip:

```text
SIMULATION
```

Never style this like withdrawable cash.

---

# 45. PAPER PORTFOLIO SECTIONS

Recommended:

```text
Equity chart

Following
Open positions
Recent simulated fills
Performance
```

Avoid a dense desktop portfolio table.

---

# 46. SIMULATED FILL

Example:

```text
Simulated

YES · 44.3¢
$25

Source trader entered at 42¢
Observed +2.3¢ later

Will BTC exceed $150K?

4m ago
```

This is important UX.

It teaches the user why blindly copying whales can differ from the whale's actual result.

---

# 47. PAPER EMPTY STATE

If no paper portfolio:

```text
Test traders without risking money

Paper Follow simulates what would happen
if you followed selected public wallets.

[Find Smart Money]
```

Do not use casino copy.

---

# 48. SCREEN 11 — INTELLIGENCE HOME / SMART MONEY DISCOVERY

The `Smart Money` segment should not simply repeat leaderboard rows.

Top area:

```text
Top Smart Money
```

Compact ranks.

Then:

```text
Recently Active
```

wallets that made recent whale trades.

Then:

```text
Explore by category
Politics
Crypto
Macro
Sports
```

This creates a stronger discovery surface than a single static table.

---

# 49. CROSS-SCREEN GROWTH CTA SYSTEM

Each screen should have exactly one obvious next best action.

Use this mapping:

```text
Whale Trade
→ View Trader

Wallet Search
→ Open Profile

Wallet Profile
→ Quick Backtest

Performance
→ Quick Backtest

Smart Money Leaderboard
→ View Trader

Top Holders
→ View Trader

Following
→ View Activity

Backtest Result
→ Paper Follow

Paper Portfolio
→ Continue Monitoring

Alert
→ View Market / Trader
```

Do not place five competing primary buttons on each screen.

---

# 50. UX CONVERSION MODEL

The mobile journey should feel natural:

```text
DISCOVERY
Whale Feed
     ↓

CURIOSITY
View Trader
     ↓

TRUST
Profile + Performance
     ↓

EVIDENCE
Smart Money
     ↓

PROOF
Quick Backtest
     ↓

COMMITMENT
Follow
     ↓

HABIT
Paper Follow
     ↓

RETENTION
Alerts
     ↓

RETURN
Market / Profile / Paper
```

Design around this emotional progression.

---

# 51. TRUST BEFORE ACTION

Do not present an action to follow/copy before enough context.

Pattern:

```text
signal
→ explanation
→ evidence
→ action
```

not:

```text
signal
→ COPY NOW
```

---

# 52. LOADING STATES

Create intentional skeleton states for:

- Whale Feed
- Wallet Search
- Wallet Profile
- Leaderboard
- Top Holders
- Backtest
- Paper Portfolio

Do not use generic centered spinners everywhere.

---

# 53. PARTIAL DATA

Wallet profile can be partially hydrated.

Design a state such as:

```text
Performance data is still updating
```

while identity/recent trades are already visible.

Never block the whole profile because one upstream aggregate is delayed.

---

# 54. STALE DATA

Use one consistent stale-data system across Intelligence.

Examples:

```text
Updated 46s ago
```

```text
Data delayed
```

```text
Historical coverage incomplete
```

Avoid red-danger styling unless user action is actually unsafe.

---

# 55. ERROR UX

Differentiate:

```text
No data
```

from:

```text
Data temporarily unavailable
```

from:

```text
Feature unavailable
```

from:

```text
Account required
```

Do not use one generic "Something went wrong."

---

# 56. MOBILE TOUCH UX

Make major tap targets easy to hit one-handed.

Avoid tiny desktop controls.

Use:

- full-row taps
- 44–48dp+ practical touch areas
- bottom sheets
- sticky action area where useful
- pull to refresh where appropriate
- long lists with stable scroll behavior
- swipe only when discoverable and noncritical

Do not hide primary functionality behind gestures.

---

# 57. ANDROID INTERACTION BEHAVIOR

Use Android-appropriate interaction patterns while preserving RetroPick visuals:

- edge-to-edge layout
- system-safe insets
- Android back behavior
- bottom sheets
- haptic confirmation for Follow / Paper-start
- native share sheet where sharing exists
- notification deep links
- predictive-back-friendly navigation structure
- persistent scroll position when returning from Wallet Profile to Whale Feed
- restoration of backtest/paper state across app recreation

The design itself must remain consistent with uploaded RetroPick UI.

---

# 58. INFORMATION DENSITY

RetroPick Intelligence is data-rich, but mobile is not desktop.

Use:

```text
summary
→ drill down
→ details sheet
```

instead of displaying every metric at once.

For example:

Default:

```text
Smart Money 82
ROI +18.7%
74 resolved
```

Details:

```text
adjusted win rate
confidence interval
PnL stability
methodology
```

---

# 59. NUMBER FORMATTING

Use mobile-friendly numeric hierarchy.

Examples:

```text
$42.5K
+$84.2K
+18.7%
59%
42¢
```

Avoid:

```text
$42,547.283741
```

unless detailed precision is explicitly useful.

---

# 60. COLOR SEMANTICS

Use the existing RetroPick palette from uploaded UI.

Do not invent new branded colors.

Use positive/negative colors carefully:

- P&L positive/negative
- YES/NO positioning where existing product uses such semantics
- warning for stale/degraded
- neutral intelligence cards

Do not make every Whale Trade green.

A whale buying YES is not necessarily a "good" trade.

---

# 61. SMART MONEY IS NOT WHALE

Visually distinguish:

```text
Large Trade
```

from:

```text
Skilled Trader
```

A large transaction is about **size**.

Smart Money is about **historical evidence**.

Do not visually combine them into one badge.

Example:

```text
Large trade: $42.5K
Trader skill: 82
```

not:

```text
SUPER WHALE 94 🔥
```

---

# 62. COPYWRITING

Tone:

- professional
- compact
- analytical
- calm
- factual

Prefer:

```text
Large trade
Adjusted win rate
Historical simulation
Paper follow
Observed exposure
Data delayed
```

Avoid:

```text
Mega whale
Insider alert
Guaranteed alpha
Easy money
Copy winner
Hot bet
Moon
```

---

# 63. ACCESSIBILITY

Design for:

- strong text contrast
- readable financial figures
- scalable text
- large tap targets
- information not encoded only by color
- screen-reader-friendly row hierarchy
- chart summaries
- reduced motion
- loading labels
- explicit simulation labels

---

# 64. MOTION

Motion should communicate hierarchy, not decorate.

Good uses:

- expanding whale details
- Follow state transition
- Backtest result reveal
- Paper portfolio chart update
- tab transitions
- bottom-sheet entry

Avoid excessive ticker animations and flashing price movement.

---

# 65. FUTURE LIVE COPY PREPARATION

Do NOT design the actual live-copy execution flow as Launch.

However, preserve room for a future:

```text
Analyze Trade
```

handoff.

The future flow will be:

```text
whale activity
→ trader context
→ current market price
→ slippage/risk preview
→ user manually chooses amount
→ order review
→ user signs
```

Never:

```text
whale activity
→ automatic order
```

---

# 66. REQUIRED SCREEN SET

Generate a coherent connected Android prototype containing at least these high-fidelity screens:

```text
01 Intelligence — Whale Feed

02 Wallet Search

03 Wallet Profile — Overview

04 Wallet Profile — Positions / Activity state

05 Smart Money Leaderboard

06 Market Detail — Top Holders integration

07 Following

08 Whale Alert Settings

09 Alert Inbox / Deep-Link state

10 Quick Backtest Setup

11 Quick Backtest Running

12 Quick Backtest Result

13 Paper Copy Setup

14 Paper Portfolio

15 Paper Position / Simulated Fill detail

16 Empty / Error / Stale state examples
```

These should form one connected product, not unrelated artboards.

---

# 67. PROTOTYPE CONNECTIONS

Create interactions for:

```text
Whale Feed row
→ Wallet Profile

Wallet Search result
→ Wallet Profile

Leaderboard row
→ Wallet Profile

Top Holder
→ Wallet Profile

Profile
→ Follow

Profile
→ Quick Backtest

Backtest
→ Result

Result
→ Paper Follow

Paper Follow
→ Paper Portfolio

Whale Alert
→ Wallet Profile or Market Detail

Following row
→ Wallet Profile
```

Preserve Android back behavior logically.

---

# 68. USE MY UPLOADED UI

Before finalizing:

Compare generated Intelligence screens with my uploaded RetroPick references.

Ask:

```text
Would these screens clearly belong to the same app?
```

If not, revise them.

Do not change the uploaded design system merely because a generic finance aesthetic is easier.

Reuse existing components wherever visually appropriate:

- navigation
- app bars
- cards
- chips
- buttons
- charts
- typography
- market rows
- dividers
- sheets
- loading placeholders

Extend, don't replace.

---

# 69. UX QUALITY BAR

The interface should be immediately understandable to:

```text
a prediction-market user
```

without requiring them to understand:

```text
WhaleScore equations
Beta-Binomial statistics
API provenance
CLOB internals
Data API pagination
```

Expose methodology progressively.

---

# 70. FINAL DESIGN OBJECTIVE

The UX succeeds when a first-time user can naturally complete:

```text
Open Intelligence
       ↓
See a $40K whale trade
       ↓
Tap trader
       ↓
Understand trader performance
       ↓
Run a 90-day simulation
       ↓
Understand risk + drawdown
       ↓
Follow trader
       ↓
Start paper following
       ↓
Receive future alert
       ↓
Return to RetroPick
```

without confusion and without ever believing:

```text
RetroPick guarantees the trader is correct
```

or:

```text
Paper Copy is real trading
```

or:

```text
Whale activity automatically means Smart Money.
```

The final experience should feel:

**fast, intelligent, trustworthy, evidence-driven, premium, mobile-native, and extremely easy to navigate.**

Most importantly:

> Design the user journey first.  
> Preserve my uploaded RetroPick visual identity second.  
> Add components only when they make the growth loop easier.