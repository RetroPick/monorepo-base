# RETROPICK MARKETS V1 — SMART MONEY INTELLIGENCE LAUNCH V1
## Documentation Re-Architecture, Product Growth Loop, Polymarket Integration Architecture, C4, Phased Development & Test Plan

You are acting as the **Principal Software Engineer, Staff Backend Engineer, Distributed Systems Architect, Data Engineer, Quantitative Product Engineer, Prediction-Market Infrastructure Engineer, Product Architect, Security Engineer, Test Architect, SRE, and Technical Product Lead** responsible for redesigning the RetroPick Markets V1 Intelligence documentation into a focused, low-cost, launchable product.

Operate in **CURSOR PLAN MODE ONLY**.

Do NOT implement runtime code yet.

Do NOT modify production code yet.

Do NOT start a development phase yet.

Your task is to deeply inspect the repository, official Polymarket developer documentation, existing RetroPick Markets architecture, and the current:

```text
.dev/markets-v1/intelligence/**
```

documentation and produce a precise implementation-grade documentation restructuring plan.

The final Intelligence V1 documentation must be centered around exactly these launch capabilities:

```text
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
```

These ten features are the **RetroPick Smart Money Intelligence Launch V1**.

Everything else in the current Intelligence tree must be evaluated against this launch scope.

If an existing intelligence capability:

```text
is not necessary for these ten features
AND
is not a required shared architectural dependency
AND
is not needed to preserve a critical invariant
```

then propose moving it to:

```text
Current Markets V1 authority: `.dev/markets-v1/intelligence/README.md`.
```

Do not delete useful historical work.

Archive it.

---

# 1. Product objective

Do not design Intelligence V1 as a collection of unrelated analytics screens.

Design it around one growth loop:

```text
             WHALE TRADE
                  ↓
          "Who made this trade?"
                  ↓
             WALLET PROFILE
                  ↓
        "Is this trader actually good?"
                  ↓
           SMART MONEY SCORE
                  ↓
           QUICK BACKTEST
                  ↓
       "Would copying have worked?"
                  ↓
             PAPER FOLLOW
                  ↓
                ALERT
                  ↓
         MANUAL COPY TRADE
                  ↓
         USER-SIGNED ORDER
                  ↓
               VOLUME
```

The **launch V1 scope ends at Paper Copy + Quick Backtest + Alerts**.

The following part:

```text
MANUAL COPY TRADE
→ USER-SIGNED ORDER
→ VOLUME
```

is the **future monetization/execution handoff**.

It must be architected as a future dependency but must NOT be implemented as part of this Intelligence Launch V1 documentation program unless the canonical Markets phase plan already authorizes it.

Do not implement automatic copy trading.

---

# 2. Product thesis

RetroPick should not become merely:

```text
a Polymarket clone
```

or:

```text
a whale alert bot
```

The product loop should answer five progressively more valuable questions:

```text
WHAT happened?
→ Whale Trade Feed

WHO did it?
→ Wallet Search + Wallet Profile

ARE THEY ACTUALLY GOOD?
→ Performance Metrics + Smart Money

SHOULD I FOLLOW THEM?
→ Quick Backtest

WHAT HAPPENS IF I FOLLOW THEM?
→ Paper Copy + Follow + Alerts
```

Later:

```text
CAN I EXECUTE IT?
→ Manual user-signed copy trade
```

Every document and architecture choice must reinforce this funnel.

---

# 3. Business and engineering constraints

Optimize for:

```text
low infrastructure cost
low operational complexity
high user-perceived value
high retention
high shareability
high conversion toward eventual trading volume
explainable metrics
public Polymarket data first
no unnecessary ML infrastructure
no autonomous trading
```

Do not design a hedge-fund-grade analytics stack before RetroPick has users.

Prefer:

```text
deterministic rules
PostgreSQL
Go workers
existing BFF
existing fe-v1
public Polymarket APIs
bounded caching
simple materialized aggregates
```

over:

```text
Kafka
Spark
feature stores
large ML systems
GPU inference
complex graph databases
expensive streaming infrastructure
```

unless repository evidence proves they are required.

---

# 4. Read existing repository truth first

Before proposing documentation changes, inspect:

```text
.dev/markets-v1/**
```

especially:

```text
.dev/markets-v1/README.md
.dev/markets-v1/00_DOCUMENT_MAP.md
.dev/markets-v1/02_SCOPE_AND_CAPABILITY_MATRIX.md
.dev/markets-v1/04_REQUIREMENTS_AND_TRACEABILITY.md

.dev/markets-v1/architecture/**
.dev/markets-v1/architecture/adr/**

.dev/markets-v1/backend/**
.dev/markets-v1/web/**
.dev/markets-v1/security/**
.dev/markets-v1/testing/**
.dev/markets-v1/platform/**
.dev/markets-v1/phases/**

.dev/markets-v1/agent-harness/**
.dev/markets-v1/agent-harness/implementation-manifest.yaml
.dev/markets-v1/agent-harness/task-graph.yaml
.dev/markets-v1/agent-harness/CURRENT_IMPLEMENTATION_STATE.md
```

Then inspect actual code:

```text
apps/backend/internal/markets/**
apps/backend/migrations/**
apps/backend/sql/**
apps/backend/internal/dbqueries/**

Current Markets V1 authority: `.dev/markets-v1/intelligence/README.md`.

packages/polymarket/**

schemas/openapi/**
schemas/asyncapi/**

.github/workflows/**
scripts/**
```

Do not assume old Intelligence docs represent current implementation.

---

# 5. Inspect all current Intelligence documentation

Inventory every file under:

```text
.dev/markets-v1/intelligence/**
```

Current examples may include:

```text
TRADER_INTELLIGENCE_PRODUCT_SPEC.md
WHALE_AND_LARGE_TRADE_DETECTION.md
WALLET_PROFILING_AND_SMART_MONEY.md
ALERT_RULES_AND_DELIVERY.md
MARKET_HEALTH_LIQUIDITY_AND_ORDERBOOK_ANALYTICS.md
UNUSUAL_ACTIVITY_HEURISTICS.md
RELATIONSHIP_AND_ARBITRAGE_SCANNER.md
SIGNAL_PROVENANCE_CALIBRATION_AND_RETRACTIONS.md
OPEN_SOURCE_ADOPTION_MAP.md
```

Do not assume this list is complete.

Enumerate actual repository state.

For each file classify:

```text
KEEP
REWRITE
SPLIT
MERGE
RENAME
SUPPORTING_DEPENDENCY
ARCHIVE
SUPERSEDED
```

Explain why.

---

# 6. Archive policy

Create a proposed:

```text
Current Markets V1 authority: `.dev/markets-v1/intelligence/README.md`.
```

architecture.

Files that are not launch-critical should generally move there.

Strong archive candidates include, subject to actual dependency analysis:

```text
UNUSUAL_ACTIVITY_HEURISTICS.md
RELATIONSHIP_AND_ARBITRAGE_SCANNER.md
OPEN_SOURCE_ADOPTION_MAP.md
```

Current Markets V1 authority: `.dev/markets-v1/intelligence/README.md`.

```text
MARKET_HEALTH_LIQUIDITY_AND_ORDERBOOK_ANALYTICS.md
SIGNAL_PROVENANCE_CALIBRATION_AND_RETRACTIONS.md
```

Do NOT archive a document simply because it is not user-facing if one of the ten launch features genuinely depends on its contract.

For example:

```text
signal provenance
idempotency
staleness semantics
```

may remain as shared foundations if Whale Feed, Alerts, Backtest, or Paper Copy depend on them.

Archive only after moving required canonical rules to their proper owner.

---

# 7. Archive metadata

Every archived document should eventually contain or be referenced by archive metadata stating:

```text
Status: ARCHIVED
Archived date
Reason
Replacement document
Last authoritative scope
Not current implementation authority
```

Create:

```text
Current Markets V1 authority: `.dev/markets-v1/intelligence/README.md`.
```

as the archive index.

Do not let archived docs appear in active agent context by default.

---

# 8. Remove generated documentation noise

The current Intelligence documents contain large repeated blocks such as:

```text
golden_vector_000
golden_vector_001
...
```

and repeated calibration rows/examples.

These should NOT live in product Markdown.

Propose replacing bulk test data with machine-readable fixtures such as:

```text
testdata/
  whale_feed_vectors.yaml
  wallet_performance_vectors.yaml
  smart_money_vectors.yaml
  backtest_vectors.yaml
  paper_copy_vectors.yaml
```

or the repository's existing test-fixture convention.

Markdown should describe:

```text
formula
semantics
edge cases
fixture location
acceptance criteria
```

not contain hundreds of artificial rows.

---

# 9. Official Polymarket documentation is mandatory

Research the CURRENT official Polymarket developer documentation.

Use official Polymarket docs as source of truth for external API capability.

Do not rely on:

```text
old blog posts
unofficial reverse-engineered assumptions
random SDK examples
competitor behavior
```

for protocol semantics.

At minimum investigate:

```text
Gamma API
Data API
CLOB API
Market WebSocket
public profile/search
positions
closed positions
activity
trades
holders
market positions
leaderboard
prices history
order books
rate limits
authentication
future order signing/submission
geographic restrictions
```

Record:

```text
endpoint
auth requirement
rate limit
pagination
identity semantics
timestamp semantics
known limitation
RetroPick use
cache policy
```

---

# 10. Critical Polymarket API authority model

The plan must explicitly define external authority.

Expected conceptual split to verify:

```text
Gamma API
→ market/event/profile discovery

Data API
→ wallet-attributed trades
→ positions
→ closed positions
→ activity
→ position value
→ holders
→ leaderboards

CLOB public API
→ order book
→ prices
→ midpoint
→ spread
→ price history

Market WebSocket
→ near-real-time market state
→ book
→ price changes
→ best bid/ask
→ last trade price
→ market lifecycle events

Authenticated CLOB
→ future user order management
```

Do not leak these external schemas directly into the RetroPick frontend.

Use a RetroPick anti-corruption/BFF boundary.

---

# 11. Critical whale attribution rule

This is extremely important.

The public Polymarket Market WebSocket can provide near-real-time trade/market events, but wallet identity must not be invented from a market event that does not contain wallet identity.

Therefore architecture should distinguish:

```text
MARKET EVENT TIMING
```

from:

```text
WALLET-ATTRIBUTED PUBLIC TRADE
```

Expected pattern:

```text
Polymarket Market WS
        ↓
market timing / book / price context

Polymarket Data API /trades
        ↓
wallet-attributed normalized public trade

             JOIN
              ↓
RetroPick Whale Trade Event
```

But verify whether this exact join is safe and necessary.

For a lower-cost initial release, Data API `/trades` polling may be sufficient as the canonical whale source.

Do not build a complex correlation system merely to claim sub-second whale alerts.

Prefer correctness over fake realtime.

Document expected lag honestly.

---

# 12. Rate-limit-aware architecture

Use official current rate limits.

Design bounded polling and caching.

Never make:

```text
frontend
→ Polymarket Data API directly
```

for production Intelligence.

Expected:

```text
Polymarket APIs
      ↓
RetroPick ingestion/adapters
      ↓
normalized projections/cache
      ↓
RetroPick BFF
      ↓
fe-v1
```

Model:

```text
poll cadence
batch size
pagination
start/end windows
cache TTL
backoff
429 behavior
retry
circuit breaker
stale behavior
```

Do not design around maximum upstream rate limit.

Design comfortably below it.

---

# 13. Proposed Intelligence Launch documentation tree

Evaluate and improve this target:

```text
.dev/markets-v1/intelligence/

README.md
INTELLIGENCE_LAUNCH_V1.md
INTELLIGENCE_C4_MODEL.md
POLYMARKET_INTELLIGENCE_DATA_SOURCES.md
INTELLIGENCE_DATA_MODEL.md
INTELLIGENCE_TEST_STRATEGY.md

01_WHALE_TRADE_FEED.md
02_WALLET_SEARCH.md
03_WALLET_PROFILE.md
04_WALLET_PERFORMANCE_METRICS.md
05_SMART_MONEY_LEADERBOARD.md
06_FOLLOW_WALLET.md
07_TOP_HOLDERS.md
08_BASIC_WHALE_ALERTS.md
09_PAPER_COPY.md
10_QUICK_BACKTEST.md

Current Markets V1 authority: `.dev/markets-v1/intelligence/README.md`.
  README.md
  ...
```

Do NOT blindly create files.

First determine whether some concepts should share one canonical file.

However all ten launch features must have an explicit implementation-grade specification.

---

# 14. Reuse the current Intelligence document style

Keep the familiar current-document header pattern:

```text
# FEATURE NAME

Status:
Owner:
Last updated:
Product:
Wave/Tier:
```

But redesign the body into a consistent production-quality template.

Each feature specification should contain:

```text
1. Purpose
2. Launch tier
3. User problem
4. Growth-loop position
5. Scope
6. Out of scope
7. C4 placement
8. Polymarket upstream data
9. Domain model
10. Computation / formulas
11. API contract
12. Storage / projection model
13. Background jobs / caching
14. Frontend UX states
15. Failure / stale behavior
16. Security / privacy
17. Testing strategy
18. Observability
19. Cost controls
20. Rollout / feature flag
21. Dependencies
22. Acceptance criteria
23. Cross-references
```

Do not duplicate global policies into every file.

Reference canonical owners.

---

# 15. C4 architecture — one canonical model

Do NOT create ten conflicting full C4 diagrams.

Create one canonical:

```text
INTELLIGENCE_C4_MODEL.md
```

with:

```text
C4 Level 1 — System Context
C4 Level 2 — Containers
C4 Level 3 — Intelligence Components
C4 Level 4 — Selected critical flows
Deployment View
```

Each feature document should then include a short:

```text
## C4 Placement
```

mapping the feature to that canonical model.

---

# 16. C4 Level 1 — Intelligence context

Expected actors/systems to analyze:

```text
Trader
Guest user
Authenticated RetroPick user

RetroPick Markets V1

Polymarket Gamma API
Polymarket Data API
Polymarket CLOB API
Polymarket Market WebSocket

Wallet provider
future authenticated trading boundary

Browser push / notification mechanism
```

Distinguish CURRENT from TARGET.

---

# 17. C4 Level 2 — Containers

Evaluate:

```text
Current Markets V1 authority: `.dev/markets-v1/intelligence/README.md`.
        ↓
Markets BFF / Go API
        ↓
Intelligence services/modules
        ↓
PostgreSQL

Background intelligence workers
        ↓
Polymarket adapters

Optional cache only if justified
```

Prefer the existing modular monolith unless repository evidence justifies a new service.

Do not create a microservice for every feature.

---

# 18. C4 Level 3 — proposed components

Evaluate whether the following components fit the existing Go architecture:

```text
intelligence/trades
intelligence/wallets
intelligence/performance
intelligence/smartmoney
intelligence/follows
intelligence/holders
intelligence/alerts
intelligence/papercopy
intelligence/backtest
```

Possible supporting adapters:

```text
polymarket/data
polymarket/profile
polymarket/holders
polymarket/leaderboard
polymarket/prices
```

Do not enforce these names if existing architecture has better boundaries.

---

# 19. Shared low-cost data pipeline

Design a reusable pipeline instead of ten independent upstream consumers.

Preferred conceptual model:

```text
              POLYMARKET
                  │
       ┌──────────┼───────────┐
       │          │           │
     Gamma      Data         CLOB
       │          │           │
       └──────┬───┴──────┬────┘
              │          │
         adapters    market context
              │
              ▼
       normalized events
              │
        ┌─────┴──────┐
        ▼            ▼
   projections     live cache
        │
        ▼
  intelligence engine
        │
 ┌──────┼───────────────────────────────┐
 ▼      ▼      ▼      ▼      ▼          ▼
whale wallet smart  holders alerts  backtest/paper
feed  profile money
```

Prefer reuse.

---

# 20. Feature 1 — Whale Trade Feed

Define a low-cost V1.

Primary question:

```text
What large trades just happened?
```

Do not overengineer the first release.

Research whether the best initial large-trade candidate criteria should be based on:

```text
absolute notional
relative market volume
wallet watch status
```

Optional later enrichment:

```text
order-book depth
price impact
market liquidity
```

Do not require full complex WhaleScore to launch if reliable data for every component is expensive.

The feed should include at minimum:

```text
trade id/fingerprint
wallet
market
outcome
side
price
size
notional
timestamp
market title
profile/display name when public
large-trade reason
data freshness
source/provenance
```

Plan feed ordering and cursor pagination.

---

# 21. Simplify WhaleScore

The existing WhaleScore should be reviewed critically.

Do not mix:

```text
trade size
wallet skill
unusual behavior
```

into a single opaque number unless strongly justified.

Prefer separate concepts:

```text
LargeTradeScore
TraderSkillScore
```

For Launch V1, it may be enough to expose:

```text
Large Trade
$42.5K
6.3% of recent volume
```

rather than pretending that a 0–100 composite is statistically calibrated.

If WhaleScore remains:

```text
version it
explain it
test it
do not call it predictive alpha
```

---

# 22. Feature 2 — Wallet Search

Primary question:

```text
Who is this trader?
```

Support:

```text
wallet address
public username
pseudonym
public profile search
```

Use Gamma public search/profile where officially supported.

Define:

```text
exact address lookup
partial username search
profile-not-found
invalid address
multiple matches
rate limiting
cache behavior
```

Do not deanonymize users.

Never infer real-world identity from blockchain/public activity.

---

# 23. Feature 3 — Wallet Profile

Primary question:

```text
What does this wallet look like as a trader?
```

Minimum profile:

```text
wallet address
public Polymarket profile
current positions
recent trades
closed positions
position value
trade count
volume estimate
active markets
category exposure
performance summary
```

Clearly label:

```text
Polymarket-reported field
RetroPick-derived field
estimated field
```

Do not mix them without provenance.

---

# 24. Feature 4 — P&L / ROI / Win Rate

This must be mathematically rigorous.

Define exact formulas for:

```text
realized P&L
unrealized P&L
total P&L
ROI
resolved position count
wins
losses
raw win rate
shrunk win rate
```

Audit whether the current Beta-Binomial model should be retained.

Likely useful:

```text
α0 = 2
β0 = 2
```

but do NOT freeze these merely because old docs contain them.

Require rationale.

Important:

```text
win rate != skill
```

A trader buying 95¢ contracts should not be ranked purely on winning percentage.

Document this explicitly.

---

# 25. Smart Money Score

The launch architecture needs one explainable trader-skill metric.

Do NOT use raw WhaleScore for this.

Create a separate:

```text
TraderSkillScore
```

or:

```text
SmartMoneyScore
```

Evaluate low-cost inputs:

```text
sample-size-adjusted performance
realized ROI
P&L stability
entry-price-adjusted performance
category specialization
recency
drawdown
independent resolved markets
```

Do not include metrics that cannot be reliably computed from available public data.

Every component must have:

```text
formula
range
weight
minimum sample
missing-data behavior
version
```

No AI/LLM in scoring.

---

# 26. Feature 5 — Smart Money Leaderboard

Primary question:

```text
Who has demonstrated useful performance?
```

Do not simply clone Polymarket's raw P&L leaderboard.

Polymarket's own public leaderboard can be an upstream reference/seed source.

RetroPick should add:

```text
SmartMoneyScore
ROI
sample count
confidence
category
recency
drawdown if available
```

Support categories where taxonomy exists:

```text
Overall
Politics
Crypto
Macro/Economy
Sports
Technology
Geopolitics
```

Do not invent category expertise when data is insufficient.

---

# 27. Leaderboard anti-gaming rules

Document protections against:

```text
tiny sample size
one lucky longshot
many correlated markets
multiple positions in same event
huge bankroll dominating score
inactive historical wallets
open unrealized profit being treated as realized skill
```

Prefer conservative scoring.

Show:

```text
insufficient_sample
```

when appropriate.

---

# 28. Feature 6 — Follow Wallet

Primary question:

```text
I found a trader I care about. How do I keep watching them?
```

Design minimal model:

```text
user_id
wallet_address
created_at
notification preference
paper_follow_enabled
```

But first reconcile whether user identity/auth exists in the current Markets architecture.

If account infrastructure is not yet implemented:

design:

```text
guest local follow state
```

versus:

```text
server-synced authenticated follows
```

as CURRENT/TARGET.

Do not invent an auth system inside Intelligence.

---

# 29. Follow Wallet privacy

A user's own followed-wallet list is:

```text
private user preference
```

unless deliberately shared.

Do not expose:

```text
who follows whom
```

publicly by default.

---

# 30. Feature 7 — Top Holders

Primary question:

```text
Who currently holds the largest positions on each side?
```

Use official public holder/market-position data.

UI/model should support:

```text
YES top holders
NO top holders
position size/value
public profile
SmartMoneyScore when available
```

Derived aggregations:

```text
top-5 concentration
top-10 concentration
smart-money-weighted concentration
```

Only compute metrics that can be derived accurately.

---

# 31. Top Holders + Smart Money synergy

This is a major growth feature.

Plan a view such as:

```text
YES TOP HOLDERS

Wallet       Position     Skill
0xabc...      $92K         84
0xdef...      $61K         72

NO TOP HOLDERS

...
```

Then optionally:

```text
High-skill observed exposure:
YES 63%
NO  37%
```

But require clear methodology.

Do not imply that holder concentration predicts outcome truth.

---

# 32. Feature 8 — Basic Whale Alerts

Do NOT keep the current giant general-purpose alert DSL as Launch V1 if it is unnecessary.

Launch scope:

```text
Alert when followed wallet trades
Alert when whale trades selected market
Alert when trade exceeds threshold
```

Optional:

```text
minimum notional
minimum LargeTradeScore
market filter
wallet filter
```

Delivery launch targets should be low cost:

```text
in-app inbox
browser/web push if existing stack supports it
```

Archive or defer:

```text
Telegram
Discord
webhook
complex rule DSL
portfolio risk alerts
AI alerts
```

unless current product requirements require them.

---

# 33. Alert correctness

Define:

```text
dedup key
cooldown
delivery idempotency
retry
expiry
stale event suppression
notification latency
```

Do not send the same whale event repeatedly because the upstream Data API returned it on multiple polls.

---

# 34. Feature 9 — Paper Copy

This is one of the most important features.

Primary question:

```text
What happens if I follow this trader without risking money?
```

Paper Copy MUST be:

```text
virtual
non-custodial
non-trading
no Polymarket order submission
```

Data model might include:

```text
paper_portfolios
paper_follow_rules
paper_cash_ledger
paper_orders
paper_fills
paper_positions
paper_equity_snapshots
```

But first inspect existing domain models before proposing new tables.

---

# 35. Paper Copy must not fake execution

Critical rule:

```text
THE FOLLOWER DOES NOT GET THE WHALE'S ENTRY PRICE AUTOMATICALLY.
```

The event was detected after it occurred.

Therefore paper execution must model:

```text
observation latency
current market price
spread
available liquidity if available
slippage assumption
```

For low-cost Launch V1, define a conservative deterministic fill model.

Example conceptual flow:

```text
whale trade observed
       ↓
paper-follow rule matches
       ↓
obtain next valid price snapshot
       ↓
apply deterministic slippage model
       ↓
virtual fill
```

No look-ahead.

---

# 36. Paper Copy configurations

Keep simple:

```text
starting virtual capital
fixed copy amount
max amount per trade
optional category filter
optional max probability
```

Do not initially support:

```text
complex percentage portfolio mirroring
leverage
automatic live execution
cross-wallet netting
advanced risk parity
```

---

# 37. Feature 10 — Quick Backtest

Primary question:

```text
Would following this trader historically have worked?
```

This must be scientifically honest.

It should not simply replay the whale's original P&L.

It should simulate:

```text
the follower
with a defined strategy
under observable historical information
```

---

# 38. Quick Backtest data sources

Investigate official support for:

```text
wallet historical trades
closed positions
market metadata
price history
```

The public trade API supports timestamp windows and pagination.

Account for upstream pagination caps.

For historical queries beyond offset limits, use bounded time windows if official docs require it.

Document:

```text
history horizon
maximum trades
pagination
cache
job timeout
```

---

# 39. Backtest anti-lookahead rules

Mandatory:

```text
No future market resolution information at entry time.
No future price data when selecting simulated fill.
No using whale final P&L to determine whether to copy.
No using future SmartMoneyScore when backtesting historical decisions.
```

If score history is unavailable:

either:

```text
backtest raw wallet-follow strategy
```

or:

```text
clearly label score as present-day retrospective ranking
```

Do not introduce survivorship/look-ahead bias silently.

---

# 40. Quick Backtest launch output

Keep simple.

Example:

```text
Period: 90 days
Initial capital: $1,000
Copy amount: $25

Trades copied: 73
Return: +18.4%
P&L: +$184
Win rate: 57%
Max drawdown: -9.2%
Current equity: $1,184
```

Include:

```text
simulation assumptions
data coverage
confidence/warnings
```

---

# 41. Growth-loop instrumentation

The architecture must explicitly measure conversion between stages:

```text
Whale Feed View
      ↓
Wallet Profile Open
      ↓
Follow Wallet
      ↓
Backtest Run
      ↓
Paper Copy Start
      ↓
Alert Open
      ↓
future Copy Trade Preview
      ↓
future Signed Order
```

Define analytics events.

Example:

```text
intelligence_whale_opened
intelligence_wallet_profile_viewed
intelligence_wallet_followed
intelligence_backtest_started
intelligence_backtest_completed
intelligence_paper_follow_started
intelligence_alert_opened
```

Do not track private data unnecessarily.

---

# 42. Primary product metrics

Propose launch metrics such as:

```text
Whale feed → profile CTR
Profile → follow conversion
Profile → backtest conversion
Backtest → paper-copy conversion
Paper-copy 7d retention
Followed wallets/user
Alert open rate
Weekly active intelligence users
```

Future:

```text
Paper Copy → live copy conversion
copy-trade volume
builder volume
```

---

# 43. Intelligence Launch development phases

Do not create new top-level RetroPick phase numbers that conflict with the existing canonical roadmap.

Instead define **Intelligence Launch micro-phases/waves** and map them to the appropriate canonical Markets phase.

Recommended dependency model to evaluate:

```text
I0 — Data & Contract Foundation

I1 — Whale Discovery
     Whale Trade Feed

I2 — Wallet Intelligence
     Wallet Search
     Wallet Profile
     P&L / ROI / Win Rate

I3 — Smart Money Discovery
     Smart Money Leaderboard
     Top Holders

I4 — Retention
     Follow Wallet
     Basic Whale Alerts

I5 — Proof
     Quick Backtest

I6 — Habit Formation
     Paper Copy

I7 — Future Monetization Handoff
     Manual Copy Preview
     User-Signed Trade
     NOT Launch V1
```

Verify dependencies.

---

# 44. I0 — Data foundation

Before any user feature, plan shared infrastructure:

```text
Polymarket Data adapter
profile adapter
holder adapter
market metadata mapping
normalized wallet address
normalized trade identity
pagination
rate-limit management
cache
provenance
staleness
```

Do not create one upstream poller per feature.

---

# 45. I1 — Whale Trade Feed

Entry:

```text
normalized public trade source exists
```

Exit:

```text
feed available through RetroPick BFF
dedup correct
pagination correct
source/provenance visible
large-trade rule versioned
stale state defined
```

---

# 46. I2 — Wallet Intelligence

Dependencies:

```text
trade history
current positions
closed positions
profile
```

Exit:

```text
wallet search
profile
performance
metrics
```

with deterministic tests.

---

# 47. I3 — Smart Money Discovery

Dependencies:

```text
performance metrics
minimum sample policy
category mapping
```

Exit:

```text
versioned SmartMoneyScore
leaderboard
top-holder enrichment
```

---

# 48. I4 — Follow & Alerts

Dependencies:

```text
wallet identity
user preference storage or guest-local model
whale ingestion
```

Exit:

```text
follow
unfollow
follow list
deduped whale alerts
```

---

# 49. I5 — Quick Backtest

Dependencies:

```text
historical wallet trades
market price history
performance engine
```

Exit:

```text
deterministic reproducible backtest
no look-ahead
bounded runtime
explainable assumptions
```

---

# 50. I6 — Paper Copy

Dependencies:

```text
follow system
live whale events
pricing
virtual ledger
```

Exit:

```text
paper portfolio
virtual fills
virtual P&L
restart-safe ledger
idempotent event processing
```

---

# 51. Future I7 — Manual Copy

Do NOT include in Launch V1 implementation.

But architecture must leave clean handoff.

Future flow:

```text
Whale event
    ↓
Analyze
    ↓
Current price
    ↓
Slippage
    ↓
User chooses amount
    ↓
Order Preview
    ↓
LOCAL USER SIGNATURE
    ↓
CLOB submission
```

Official Polymarket trading architecture separates local signing from order submission.

Preserve that safety model.

Never allow:

```text
Intelligence signal
→ automatic trade
```

---

# 52. No autonomous copy trading

Keep as hard invariant:

```text
NO AUTO COPY TRADING
NO LLM-TRIGGERED TRADING
NO SIGNAL-TRIGGERED UNSUPERVISED ORDER
```

Future live copy must always require explicit user action/signing unless a later formally approved product/security ADR replaces this.

---

# 53. Intelligence API surface

Design a clean RetroPick BFF contract.

Evaluate endpoints resembling:

```text
GET /markets/intelligence/whales

GET /markets/intelligence/wallets/search
GET /markets/intelligence/wallets/{address}
GET /markets/intelligence/wallets/{address}/performance

GET /markets/intelligence/leaderboard

GET /markets/intelligence/markets/{marketId}/holders

GET /markets/intelligence/follows
POST /markets/intelligence/follows
DELETE /markets/intelligence/follows/{address}

GET /markets/intelligence/alerts
POST /markets/intelligence/alerts
DELETE /markets/intelligence/alerts/{id}

POST /markets/intelligence/backtests
GET /markets/intelligence/backtests/{id}

GET /markets/intelligence/paper
POST /markets/intelligence/paper/follows
DELETE /markets/intelligence/paper/follows/{address}
```

Do NOT freeze exact endpoint names until existing OpenAPI conventions are inspected.

---

# 54. Public vs user-scoped endpoints

Explicitly classify:

```text
PUBLIC
USER-SCOPED
INTERNAL
```

Likely:

```text
Whale Feed          PUBLIC
Wallet Search       PUBLIC
Wallet Profile      PUBLIC
Performance         PUBLIC
Leaderboard         PUBLIC
Top Holders         PUBLIC

Follow Wallet       USER-SCOPED
Alerts              USER-SCOPED
Paper Copy          USER-SCOPED
Saved Backtests     USER-SCOPED
```

Quick anonymous backtest may be public if technically desirable.

---

# 55. Storage model

Plan only the minimum necessary projections.

Evaluate:

```text
markets_public_trades
markets_wallet_stats
markets_wallet_category_stats
markets_wallet_score_snapshots
markets_wallet_follows
markets_whale_events
markets_intelligence_alerts
markets_alert_deliveries

markets_backtest_runs
markets_backtest_results

markets_paper_portfolios
markets_paper_follow_rules
markets_paper_ledger
markets_paper_positions
```

Do not create these tables blindly.

First inspect existing Markets schema.

Reuse existing:

```text
market observations
signals
evidence
catalog
market data
```

when appropriate.

---

# 56. Derived data vs raw data

Do not unnecessarily mirror all Polymarket history.

Classify data:

```text
UPSTREAM CACHE
NORMALIZED PROJECTION
DERIVED AGGREGATE
USER DATA
SIMULATION DATA
```

Prefer compact derived projections.

---

# 57. Wallet performance model

Define exact accounting semantics.

Must address:

```text
BUY
SELL
partial exits
multiple entries
current/open positions
resolved positions
redeemed positions
realized P&L
unrealized P&L
fees where observable
```

Do not calculate ROI with an ambiguous denominator.

Choose and document one.

---

# 58. Win-rate semantics

Define:

```text
What is one observation?

Per trade?
Per position?
Per market?
Per event?
```

Prefer independent resolved position/event units rather than raw trade count.

Avoid a trader with 30 fills in one market appearing to have 30 independent predictions.

---

# 59. Smart Money math validation

All formulas must be versioned:

```text
smart_money_v1
large_trade_v1
roi_v1
win_rate_v1
paper_fill_v1
backtest_v1
```

Do not store formula constants only in Markdown.

Canonical constants should live in code/config once implemented.

Docs reference them.

---

# 60. Testing architecture

Create one canonical:

```text
INTELLIGENCE_TEST_STRATEGY.md
```

covering:

```text
unit
property
golden vector
contract
integration
migration
replay
idempotency
concurrency
E2E
backtest correctness
paper ledger correctness
security
load
```

Each feature document references its applicable subset.

---

# 61. Golden vectors

Golden vectors belong in test fixtures, not hundreds of Markdown rows.

Examples:

```text
wallet_performance.yaml
smart_money_score.yaml
paper_fill.yaml
backtest_cases.yaml
```

Each case should contain:

```text
input
expected output
reason
edge case
version
```

---

# 62. Whale Feed tests

Plan tests for:

```text
duplicate upstream rows
same transaction seen repeatedly
pagination overlap
late rows
invalid wallet
zero notional
market metadata missing
profile missing
upstream timeout
429
stale data
ordering
```

---

# 63. Wallet Profile tests

Plan:

```text
valid wallet
no history
only open positions
only closed positions
profile unavailable
many paginated trades
partial upstream failure
```

Do not return false zero values when data is unavailable.

Differentiate:

```text
0
```

from:

```text
unknown
```

---

# 64. P&L tests

Required:

```text
single resolved win
single resolved loss
partial sell
multiple buys
multiple sells
open position
redeemed
zero cost basis
missing data
negative P&L
large decimal precision
```

Use fixed-point/decimal semantics.

---

# 65. Smart Money tests

Required:

```text
small sample
large sample
high win rate bad ROI
low win rate positive expected value
inactive trader
single-category trader
diversified trader
missing history
tie-break
score version migration
```

---

# 66. Follow tests

Required:

```text
follow
duplicate follow
unfollow
private ownership
auth boundary
guest-to-account migration if supported
```

---

# 67. Holder tests

Required:

```text
YES
NO
multiple outcomes if applicable
missing profile
equal positions
concentration math
pagination
stale holder snapshot
```

---

# 68. Alert tests

Required:

```text
one event → one delivery
duplicate poll → no duplicate alert
cooldown
disabled alert
unfollow
stale whale event
worker restart
delivery retry
```

---

# 69. Paper Copy tests

Highest rigor.

Required:

```text
virtual deposit
virtual fill
duplicate whale event
insufficient virtual balance
trade skipped
slippage
price unavailable
paper position close
resolution
P&L
worker restart
ledger replay
concurrent event processing
```

Ledger must be deterministic and idempotent.

---

# 70. Backtest tests

Required:

```text
no future leakage
fixed dataset reproducibility
trade ordering
same timestamp ordering
slippage
latency
missing market price
closed market
position exit
resolved payout
pagination window
large history
```

Same input dataset + same version must produce same result.

---

# 71. Contract tests against Polymarket

Create sanitized fixtures for official API responses.

Contract-test:

```text
Data API trades
positions
closed positions
activity
value
holders
market positions
leaderboard

Gamma profile/search

CLOB price/history
```

Do not run every CI test against live Polymarket.

Use:

```text
fixture tests
+
bounded smoke tests
```

---

# 72. Observability

Plan metrics such as:

```text
intelligence_upstream_requests_total
intelligence_upstream_errors_total
intelligence_upstream_429_total

whale_feed_lag_seconds
whale_events_total
whale_duplicates_suppressed_total

wallet_profile_build_seconds
wallet_stats_age_seconds

backtest_duration_seconds
backtest_failures_total

paper_copy_events_total
paper_copy_skipped_total

alert_delivery_total
alert_delivery_lag_seconds
```

Keep cardinality bounded.

Never put wallet addresses directly into high-cardinality metrics labels.

---

# 73. Freshness

Every intelligence object derived from external public data should define:

```text
observed_at
source
freshness
```

Where useful.

Do not label stale intelligence as live.

---

# 74. Reliability modes

Define:

```text
LIVE
DEGRADED
STALE
UNAVAILABLE
```

where appropriate.

Example:

If:

```text
trade API works
profile API fails
```

Whale Feed should still work with:

```text
wallet address
profile unavailable
```

instead of failing the whole feed.

---

# 75. Security and privacy

Hard invariants:

```text
Public wallet activity only
No deanonymization
No insider accusations
No private-key custody
No auto-copy
No AI-triggered execution
No hidden geoblock bypass
No private follow-list disclosure
```

Treat upstream profile text as untrusted user content.

Sanitize before rendering.

---

# 76. Explainability

Every derived metric should answer:

```text
Why?
```

Example:

```text
Smart Money Score: 82

Strong:
+ 74 resolved independent markets
+ positive ROI over 90d
+ low drawdown
+ strong Politics performance

Weakness:
- limited Sports history
```

Do not expose meaningless opaque scores.

---

# 77. Cost architecture

For each feature estimate relative infrastructure cost:

```text
UPSTREAM REQUEST RATE
STORAGE
COMPUTE
BACKGROUND JOBS
REALTIME CONNECTIONS
```

Categorize:

```text
VERY LOW
LOW
MEDIUM
HIGH
```

The ten launch features should mostly remain:

```text
VERY LOW / LOW / MEDIUM
```

If one requires HIGH infrastructure, redesign it.

---

# 78. Avoid Redis by default

Use PostgreSQL and in-process bounded caches first where sufficient.

Introduce Redis only if required for:

```text
multi-replica dedup
distributed rate limiting
high-volume ephemeral fanout
```

and only when deployment architecture requires it.

Document this as a target transition, not day-one dependency.

---

# 79. Avoid heavy event infrastructure

Do not introduce Kafka/NATS merely for these ten launch features unless current architecture already depends on them.

A low-cost architecture can use:

```text
Go workers
PostgreSQL
bounded job tables
existing WebSocket infrastructure
```

at early scale.

---

# 80. API caching strategy

Plan cache policy for:

```text
Whale Feed
wallet profiles
performance
leaderboard
holders
backtests
```

Example concepts:

```text
Whale Feed        seconds
Wallet profile    tens of seconds/minutes
Performance       minutes
Leaderboard       minutes
Top holders       seconds/minutes
```

Do not freeze exact numbers without considering user experience and rate limits.

---

# 81. Background materialization

Avoid recomputing complete wallet history for every request.

Plan:

```text
wallet_stats materialization
```

for active/followed/high-interest wallets.

Cold wallet:

```text
lazy build
```

Hot wallet:

```text
incremental refresh
```

This keeps cost low.

---

# 82. Smart-money computation strategy

Do NOT score every wallet ever seen immediately.

Prioritize:

```text
Polymarket leaderboard wallets
top holders
recent whales
followed wallets
searched wallets
```

Then background-expand.

This creates a natural low-cost working set.

---

# 83. Quick Backtest compute strategy

Do not create a cluster.

For V1:

```text
bounded historical window
bounded trade count
single Go worker/job
cached result by:
 wallet
 strategy
 period
 engine version
```

Large jobs can be rejected or degraded.

---

# 84. Paper Copy compute strategy

Paper Copy should be incremental.

Do not resimulate entire history every minute.

Use:

```text
incoming attributed whale trade
        ↓
match follow rules
        ↓
virtual execution
        ↓
ledger append
        ↓
position projection
```

---

# 85. Frontend information architecture

Plan Intelligence navigation around user jobs.

Potential:

```text
Intelligence
├── Whales
├── Smart Money
├── Following
└── Paper
```

Wallet profile is reached contextually.

Top Holders lives in Market Detail as well as intelligence drill-down.

Quick Backtest lives primarily on Wallet Profile.

Avoid ten top-level navigation items.

---

# 86. Whale Feed UX

Each card/row should make action obvious:

```text
Market
Trade
Notional
Wallet
Public identity
Timestamp
Reason
```

CTA:

```text
View Trader
Follow
```

Later:

```text
Analyze & Copy
```

---

# 87. Wallet Profile UX

Recommended sections:

```text
Overview
Performance
Positions
Recent Trades
Categories
Paper Follow
```

Primary CTA:

```text
Follow Wallet
```

Secondary:

```text
Quick Backtest
```

---

# 88. Quick Backtest UX

Do not make configuration overwhelming.

Launch options:

```text
Period
Starting capital
Fixed amount per copied trade
```

Advanced settings later.

CTA from result:

```text
Paper Follow This Wallet
```

This preserves growth funnel.

---

# 89. Paper Copy UX

Main view:

```text
Virtual Balance
Equity
P&L
Following
Open Paper Positions
Recent Paper Trades
```

Make:

```text
THIS IS A SIMULATION
```

explicit.

---

# 90. Feature flags

Every launch module should support controlled rollout.

Evaluate:

```text
intelligence.whale_feed
intelligence.wallet_profile
intelligence.smart_money
intelligence.follows
intelligence.holders
intelligence.whale_alerts
intelligence.backtest
intelligence.paper_copy
```

Do not create unnecessary one-flag-per-minor-widget explosion.

---

# 91. Rollout order

Recommended:

```text
Internal
→ Shadow data validation
→ Staff/dev
→ Small beta
→ Public read intelligence
→ Account features
→ Paper Copy
```

SmartMoneyScore should run in shadow/review mode before being prominently marketed.

---

# 92. External assumption registry

For every Polymarket capability record:

```text
source
verified date
official docs page
assumption
revalidation trigger
```

Examples:

```text
trade pagination
history window
profile address semantics
holder endpoint behavior
rate limits
price-history granularity
```

Do not hard-code undocumented behavior into architecture.

---

# 93. Current Intelligence cleanup policy

Perform a per-file mapping like:

```text
OLD FILE
→ NEW OWNER
Current Markets V1 authority: `.dev/markets-v1/intelligence/README.md`.
```

For example, evaluate:

```text
TRADER_INTELLIGENCE_PRODUCT_SPEC.md
→ INTELLIGENCE_LAUNCH_V1.md

WHALE_AND_LARGE_TRADE_DETECTION.md
→ 01_WHALE_TRADE_FEED.md

WALLET_PROFILING_AND_SMART_MONEY.md
→ split between:
   03_WALLET_PROFILE.md
   04_WALLET_PERFORMANCE_METRICS.md
   05_SMART_MONEY_LEADERBOARD.md

ALERT_RULES_AND_DELIVERY.md
→ 08_BASIC_WHALE_ALERTS.md
   archive complex DSL material

UNUSUAL_ACTIVITY_HEURISTICS.md
→ archive

RELATIONSHIP_AND_ARBITRAGE_SCANNER.md
→ archive
```

Do not execute until complete dependency analysis.

---

# 94. Preserve useful math

Do not throw away genuinely useful formulas just because old docs contain noise.

Evaluate and preserve/rehome:

```text
Beta-Binomial shrinkage
ROI semantics
concentration HHI
depth/slippage math if Paper Copy needs it
dedup semantics
provenance semantics
```

Archive unsupported synthetic calibration tables.

---

# 95. Product roadmap relationship

Current Markets runtime phase and Intelligence Launch phase must not be confused.

Determine:

```text
What is already implemented?
What is current Phase 1.3 foundation?
Which existing realtime components can be reused?
Which intelligence features belong to later canonical phase?
```

Do not authorize development just by documenting it.

The final plan must map Intelligence waves to canonical RetroPick phases.

---

# 96. Requirements

Create/refactor canonical requirements for the ten features.

Suggested IDs only after inspecting current scheme.

Each requirement must map:

```text
Requirement
→ Feature
→ C4 component
→ Polymarket source
→ API
→ data model
→ micro-phase
→ test
→ evidence
```

No orphan requirement.

---

# 97. Evidence model

Each future implementation task should prove:

```text
implementation
tests
upstream contract behavior
security
performance/cost sanity
documentation
```

Do not produce fake evidence placeholders.

---

# 98. Definition of Done per intelligence feature

A feature is not DONE until:

```text
contract defined
implementation complete
tests pass
stale/degraded behavior verified
security reviewed
observability present
feature flag truth correct
evidence filed
frontend handles loading/error/empty/stale
```

---

# 99. AI context efficiency

Design documentation so future agents load only:

```text
INTELLIGENCE_LAUNCH_V1
+ INTELLIGENCE_C4_MODEL
+ one feature spec
+ relevant upstream contract
+ relevant task node
+ relevant tests
```

They should not need to load the entire Intelligence archive.

---

# 100. Plan Mode required outputs

Do not edit anything yet.

Return the complete plan with these sections.

## A. Executive Product Verdict

Explain:

```text
What Intelligence V1 becomes
Why these ten features
Why this is low-cost
Why this supports growth
```

---

## B. Existing Intelligence Audit

Table:

| File | Current purpose | Quality | Launch dependency | Action |
|---|---|---:|---|---|

Actions:

```text
KEEP
REWRITE
SPLIT
MERGE
ARCHIVE
```

---

## C. Archive Plan

Exact list of proposed archived files.

For each explain:

```text
why not launch
what useful material must be preserved
where that material moves
```

---

## D. New Target Documentation Tree

Provide exact proposed:

```text
.dev/markets-v1/intelligence/**
```

tree.

---

## E. Documentation Template

Show the exact shared feature-document template.

---

## F. Polymarket Capability Matrix

Table:

| RetroPick feature | Official upstream API | Endpoint capability | Auth | Poll/stream | Cache | Limitation |
|---|---|---|---|---|---|---|

Cover all ten features.

---

## G. Critical External Limitations

Especially report:

```text
wallet attribution
trade lag
pagination/history limits
profile availability
price-history limitations
rate limits
holder freshness
```

---

## H. Intelligence C4

Produce proposed:

```text
L1
L2
L3
critical L4 flows
deployment
```

---

## I. Ten Feature Architecture Matrix

Table:

| # | Feature | Inputs | Components | Storage | API | Frontend | Cost |
|---|---|---|---|---|---|---|---|

---

## J. Data Model Plan

Propose tables/projections with:

```text
purpose
authority
retention
indexes
idempotency
```

Do not create migrations yet.

---

## K. Upstream Ingestion Plan

Explain:

```text
trade poller
wallet lazy hydration
leaderboard hydration
holders refresh
price enrichment
```

including rate-limit strategy.

---

## L. Growth Loop Architecture

Map:

```text
Whale
→ Profile
→ Skill
→ Backtest
→ Paper
→ Alert
→ Future live copy
```

to:

```text
screen
API
backend component
data
analytics event
conversion metric
```

---

## M. Mathematical Specification Plan

List exact formulas that need canonical definition:

```text
notional
P&L
ROI
win rate
shrunk win rate
SmartMoneyScore
concentration
paper execution
paper P&L
backtest return
drawdown
```

---

## N. Testing Matrix

For each of 10 features:

```text
unit
contract
integration
property/golden
E2E
failure
security
```

---

## O. Development Micro-Phases

Map:

```text
I0
I1
I2
I3
I4
I5
I6
future I7
```

to canonical Markets phases.

Include:

```text
entry gate
tasks
dependencies
exit gate
tests
evidence
```

---

## P. Cost Analysis

For each feature estimate:

```text
upstream requests
DB storage
compute
background work
expected relative infra cost
```

Use:

```text
VERY LOW
LOW
MEDIUM
HIGH
```

---

## Q. Security & Privacy Review

Cover:

```text
wallet privacy
public data
user follow privacy
paper trading
notification leakage
user-generated profile text
future signing boundary
```

---

## R. Observability Plan

Metrics/logging/tracing needed per shared subsystem.

---

## S. Feature Flag & Rollout Plan

Define staged rollout.

---

## T. Documentation Rewrite Sequence

Exact safe sequence, for example:

```text
INTEL-DOC-0 inventory
INTEL-DOC-1 archive
INTEL-DOC-2 C4/data sources
INTEL-DOC-3 whale
INTEL-DOC-4 wallet
INTEL-DOC-5 smart money
INTEL-DOC-6 follow/holders
INTEL-DOC-7 alerts
INTEL-DOC-8 backtest
INTEL-DOC-9 paper
INTEL-DOC-10 requirements/traceability
INTEL-DOC-11 validation
```

Improve sequence if necessary.

---

## U. Per-File Change Plan

For every file:

```text
CREATE
REWRITE
MOVE
ARCHIVE
POINTER
UNCHANGED
```

Include exact intended content ownership.

---

## V. Validators

Specify docs validators needed for:

```text
broken paths
duplicate feature ownership
archive leakage
requirement coverage
C4 path validity
upstream endpoint references
phase mapping
```

---

## W. Risks

List genuine risks:

```text
upstream API drift
wallet attribution latency
bad performance formulas
small-sample leaderboard gaming
backtest bias
paper-fill realism
alert duplication
API limits
privacy
```

with mitigations.

---

## X. Final Recommended Launch Scope

Return exactly which capabilities should be public at Launch V1.

Expected target:

```text
PUBLIC:
Whale Trade Feed
Wallet Search
Wallet Profile
P&L / ROI / Win Rate
Smart Money Leaderboard
Top Holders

ACCOUNT/GATED:
Follow Wallet
Basic Whale Alerts
Quick Backtest
Paper Copy

FUTURE:
Manual Copy Trade
User-Signed Order

ARCHIVED/DEFERRED:
Unusual Activity
Cross-market discrepancy
Cross-venue arbitrage
autonomous copy trading
AI-triggered trading
complex alert DSL
```

Change only if strong repository/product evidence requires it.

---

# 101. Final design principle

Do not optimize for:

```text
maximum number of intelligence features
```

Optimize for:

```text
maximum user value per engineering dollar
```

The product should create this behavioral progression:

```text
I SEE A LARGE TRADE
        ↓
I CHECK THE TRADER
        ↓
I UNDERSTAND THEIR HISTORY
        ↓
I VERIFY THEIR PERFORMANCE
        ↓
I FOLLOW THEM
        ↓
I TEST COPYING THEM
        ↓
I PAPER COPY THEM
        ↓
I RECEIVE AN ALERT
        ↓
EVENTUALLY I EXECUTE A USER-SIGNED TRADE
```

Every architecture and documentation decision must make that loop simpler, cheaper, faster, and more trustworthy.

---

# 102. Stop condition

This is PLAN MODE.

Do not modify:

```text
.dev/markets-v1/intelligence/**
runtime code
OpenAPI
migrations
SQL
tests
task graph
manifest
```

yet.

Do not archive files yet.

Do not start development yet.

Finish with:

```text
1. exact proposed documentation architecture
2. exact archive list
3. exact C4
4. exact Polymarket integration mapping
5. exact phased development plan
6. exact testing architecture
7. exact per-file rewrite plan
8. exact first documentation action
```

Then STOP and wait for explicit authorization to execute the documentation rewrite.