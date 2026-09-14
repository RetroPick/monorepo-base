# PRISM External-Liquidity Spanning Lab

## Status

- Research architecture: **external prediction-market liquidity only**
- Native PRISM AMM: **none**
- Native PRISM directional liquidity in the five positive controls: **0**
- Validation mode committed here: **deterministic offline CLOB fixture**
- Property/invariant tests: **24/24 PASS**
- Live Polymarket validation: run `python prism_external_liquidity_lab.py --live`

## Thesis under test

PRISM V1 should launch a structured claim only when its payoff can be backed exactly by supported external prediction-market outcome positions and cash.

With external payoff matrix `G`, target payoff vector `h`, and non-negative backing vector `x`:

```text
G x = h
x >= 0
```

The statewise solvency invariant is:

```text
BackingPayoff(omega) >= ClaimPayoff(omega)
```

for every terminal state `omega`.

Production quotes are derived from executable external CLOB bids/asks and their depth. The model does not manufacture missing liquidity with an internal probability model.

## Five positive controls

| Product | Exact external backing | Max payoff error |
|---|---|---:|
| Thematic Basket | 0.40 A_YES + 0.35 B_YES + 0.25 C_YES | 0 |
| Relative Event Spread | 0.50 A_YES + 0.50 B_NO | 0 |
| 70% Protected Event Note | 0.70 CASH + 0.15 A_YES + 0.15 B_YES | 0 |
| Defensive Barbell | 0.50 A_NO + 0.30 B_YES + 0.20 C_NO | 0 |
| Cross-Market Blend | payoff-equivalent compression to 0.25 CASH + 0.25 A_YES + 0.25 B_NO | 0 |

## Offline executable-depth fixture result

| Product | Create capacity | Cash-out capacity |
|---|---:|---:|
| Thematic Basket | 170400.0 | 170400.0 |
| Relative Event Spread | 109737.6 | 109737.6 |
| 70% Protected Event Note | 397600.0 | 397600.0 |
| Defensive Barbell | 143704.0 | 143704.0 |
| Cross-Market Blend | 219475.2 | 219475.2 |

These numbers are synthetic CLOB fixture capacities used to test the mechanics. They are not claims about current Polymarket depth.

## Negative control

The harness asks whether `AND(A,B)` can be replicated from only:

```text
CASH
A_YES / A_NO
B_YES / B_NO
C_YES / C_NO
```

It must be rejected.

Observed best non-negative marginal-market approximation:

```text
max statewise payoff error = 0.333333...
```

Therefore the launch gate correctly rejects the joint payoff without a genuine joint/combinatorial external instrument.

This is a critical falsification test: PRISM must never replace missing joint-state liquidity with an independence assumption.

## What 24/24 PASS establishes

The deterministic reference run verifies:

- canonical backing recipes reproduce the five target payoff vectors exactly;
- the spanning solver independently finds exact external backing;
- backing dominates liability state-by-state;
- YES + NO = CASH for each binary source market;
- a non-spanned AND payoff is rejected;
- all positive-control products have non-zero external executable depth in the fixture.

## What it does not establish

This offline run does not establish:

- live Polymarket liquidity or depth;
- atomic multi-leg execution;
- future order-book persistence;
- production custody/transfer safety;
- universal spanning of arbitrary payoff functions;
- legal or regulatory conclusions.

The next empirical gate is a pinned live Polymarket run that records exact market IDs, token IDs, timestamped order books, replication certificates, synthetic PRISM bid/ask curves, maximum executable size, and failure behavior when a required leg loses depth.

## Main unresolved systems risk

**Legging risk.**

A structured claim must never mint until every required backing leg has filled and the resulting backing portfolio has been verified. If one external leg fails, the execution coordinator must reject minting and unwind or hedge any partial fills.
