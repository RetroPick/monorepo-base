# PRISM External-Liquidity Spanning Lab

This is the corrected PRISM research harness.

It contains **no LMSR** and **no PRISM-native AMM**.

The thesis tested is:

> PRISM should make existing prediction-market liquidity programmable rather
> than bootstrap another liquidity pool.

## Mathematical model

Let the terminal-state payoff of each externally tradable prediction-market
position be a column of `G`.

For a PRISM derivative with target payoff vector `h`, V1 only accepts the
product when it can prove:

```text
G x = h
x >= 0
```

The resulting `x` is a replication certificate.

At issuance, backing must satisfy:

```text
BackingPayoff(state) >= ClaimPayoff(state)
```

for **every** terminal state.

The quote is then derived from executable CLOB depth. No probability model is
allowed to manufacture a price for missing exposure.

## Install

```bash
python -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt
```

Windows:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## First: deterministic validation

```bash
python prism_external_liquidity_lab.py --offline
```

This checks the math against deterministic CLOB-shaped fixtures.

## The important run: live Polymarket CLOB

```bash
python prism_external_liquidity_lab.py \
  --live \
  --output prism_live_external_liquidity
```

The script:

1. discovers three active liquid binary Polymarket markets;
2. downloads the live YES and NO CLOB books;
3. maps the six outcome tokens into state-contingent payoff vectors;
4. creates five structured PRISM products;
5. proves each payoff is exactly backed;
6. derives synthetic PRISM bid/ask curves by consuming those CLOB books;
7. measures maximum fully executable size;
8. verifies statewise backing;
9. tests a deliberately non-spanned `AND(A,B)` payoff and requires rejection;
10. saves CSV evidence and mathematical plots.

Public market data does not require trading credentials.

## Pin exact Polymarket markets

For a repeatable experiment, pass three Gamma market IDs:

```bash
python prism_external_liquidity_lab.py \
  --live \
  --market-id MARKET_ID_A \
  --market-id MARKET_ID_B \
  --market-id MARKET_ID_C \
  --output prism_pinned_run
```

This is better for a paper or hackathon demo because the experiment can name the
exact underlying markets.

## Five positive-control use cases

### 1. Thematic Basket

```text
0.40 YES A
0.35 YES B
0.25 YES C
```

### 2. Relative Event Spread

```text
0.50 YES A
0.50 NO B
```

### 3. 70% Protected Event Note

```text
0.70 cash
0.15 YES A
0.15 YES B
```

### 4. Defensive Barbell

```text
0.50 NO A
0.30 YES B
0.20 NO C
```

### 5. Cross-Market Blend

```text
0.25 YES A
0.25 NO B
0.25 YES C
0.25 NO C
```

All are fully collateralized by external positions plus cash.

## Negative control

The harness also asks whether

```text
AND(A,B)
```

can be replicated from only:

```text
cash
YES/NO A
YES/NO B
YES/NO C
```

It should fail.

That is intentional. Marginal markets do not span the nonlinear joint state
`A AND B`.

If the model ever "prices" this missing exposure by assuming independence, the
proof has failed.

A genuine joint/combinatorial external instrument can later be added to `G`, at
which point the same spanning test can make the claim launchable.

## Figures generated

The model generates:

- five `payoff_*.png` statewise target-vs-backing charts;
- five `curve_*.png` external-liquidity synthetic bid/ask curves;
- `depth_06_external_bottlenecks.png`;
- `spread_07_vs_size.png`;
- `negative_08_and_not_spanned.png`;
- `liquidity_09_inheritance.png`.

The curves are the core demo. They show that PRISM depth is inherited from
constituent CLOB depth and deteriorates exactly when those external books become
more expensive or run out.

## Transparent fee/buffer overlay

You can add a builder fee or execution-risk buffer without pretending it is
liquidity:

```bash
python prism_external_liquidity_lab.py \
  --live \
  --builder-fee-bps 20 \
  --execution-buffer-bps 10
```

These are explicit price overlays only.

## What the model proves

A successful **live** run is empirical evidence for the narrow claim:

> Five new structured payoffs can receive executable quotes and measurable depth
> without a dedicated PRISM liquidity pool because their backing positions are
> already traded on Polymarket.

It does **not** prove multi-leg atomicity.

The next systems problem is legging risk:

```text
quote basket
-> execute every external leg
-> verify full backing
-> only then mint PRISM
```

If one required leg fails, the claim must not mint and the execution coordinator
needs an unwind/hedge policy.

## Machine learning

ML is intentionally **not** used for fair value, settlement, or missing joint
probabilities.

A future ML module can estimate:

- quote decay probability;
- probability all FOK legs remain fillable for N milliseconds;
- expected unwind loss after one leg fails;
- optimal execution ordering;
- anomaly/manipulation risk.

Those outputs should only modify an execution-risk buffer or routing decision.
They must never turn a non-spanned payoff into a "replicable" one.