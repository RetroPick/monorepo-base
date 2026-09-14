# PRISM State Liquidity Engine — Experiment Report

## What this run establishes

This run is a numerical **falsification harness**, not a proof of commercial viability.
It tests whether the proposed shared-state cost-function market is internally coherent
under the stated model and whether it can be calibrated to observable CLOB marginals.

**Property tests passed:** 14/14

## External / fixture markets

| event   | name                               | source                     |   midpoint |   best_bid |   best_ask |   spread |   liquidity |   volume | market_id   | yes_token_id    |
|:--------|:-----------------------------------|:---------------------------|-----------:|-----------:|-----------:|---------:|------------:|---------:|:------------|:----------------|
| A       | Fixture A: macro event             | synthetic fallback fixture |       0.62 |      0.614 |      0.626 |    0.012 |       50000 |   500000 | fixture-1   | fixture-token-1 |
| B       | Fixture B: crypto event            | synthetic fallback fixture |       0.41 |      0.404 |      0.416 |    0.012 |       50000 |   500000 | fixture-2   | fixture-token-2 |
| C       | Fixture C: policy/technology event | synthetic fallback fixture |       0.55 |      0.544 |      0.556 |    0.012 |       50000 |   500000 | fixture-3   | fixture-token-3 |

## Dependency model

CLOB prices identify event marginals but do not identify their joint distribution.
This run used a Gaussian-copula prior with equicorrelation **rho = 0.200**, followed
by iterative proportional fitting so the final state distribution exactly reproduces
the observed CLOB marginals.

For A and B, the external midpoints are:

- P(A) = 0.620000
- P(B) = 0.410000

The mathematically admissible Fréchet interval for P(A AND B) is:

- lower = 0.030000
- upper = 0.410000

Any point estimate inside that interval requires additional information or assumptions.

## Five derivative use cases

| use_case       | description                                                                |   initial_price |   min_payoff |   max_payoff |
|:---------------|:---------------------------------------------------------------------------|----------------:|-------------:|-------------:|
| 1_AND_A_B      | Joint-event claim: pays $1 only if A and B both resolve YES.               |        0.284078 |            0 |            1 |
| 2_XOR_A_B      | Divergence claim: pays $1 if exactly one of A or B resolves YES.           |        0.461844 |            0 |            1 |
| 3_OR_A_B       | Broad event exposure: pays $1 if A or B (or both) resolves YES.            |        0.745922 |            0 |            1 |
| 4_2_OF_3       | Basket/parlay primitive: pays $1 if at least two of A,B,C resolve YES.     |        0.537254 |            0 |            1 |
| 5_TAIL_TRANCHE | Structured tranche: payout rises 0/.20/.60/1.00 with 0/1/2/3 YES outcomes. |        0.460817 |            0 |            1 |

## Shared-liquidity reserve theorem

The weighted cost function is

`C(q) = b log(sum_i pi_i exp(q_i / b))`

with **b = 250.0000**.

Analytic market-maker seed reserve bound:

`R0 >= b log(1/min(pi)) = 715.598908`

This is independent of how many claim definitions are listed over the *same* finite
state universe. It is **not** a statement that unlimited order flow is free or that
oracle/manipulation risk disappears.

## Tests

| test                                                 |         metric |   threshold | pass   |
|:-----------------------------------------------------|---------------:|------------:|:-------|
| Marginal calibration event 1                         |    1.4766e-14  |       1e-08 | True   |
| Marginal calibration event 2                         |    2.16493e-15 |       1e-08 | True   |
| Marginal calibration event 3                         |    0           |       1e-08 | True   |
| Complete-set identity 1_AND_A_B                      |    0           |       1e-10 | True   |
| Complete-set identity 2_XOR_A_B                      |    0           |       1e-10 | True   |
| Complete-set identity 3_OR_A_B                       |    0           |       1e-10 | True   |
| Complete-set identity 4_2_OF_3                       |    0           |       1e-10 | True   |
| Complete-set identity 5_TAIL_TRANCHE                 |    0           |       1e-10 | True   |
| Claim algebra A∧B = A + B - (A∨B)                    |    0           |       1e-10 | True   |
| Cost-function path independence                      |    0           |       1e-09 | True   |
| Round-trip cost returns to zero                      |    0           |       1e-09 | True   |
| Claim prices remain within payoff convex hull        |    0           |       1e-10 | True   |
| Seed reserve bound keeps solvency buffer nonnegative |  296.257       |      -1e-08 | True   |
| Observed worst-case loss <= analytic reserve bound   | -296.257       |       1e-08 | True   |

## Generated figures

1. `01_state_prices_before_after.png`
2. `02_prism_vs_clob_execution_curve.png`
3. `03_five_usecase_price_impact_curves.png`
4. `04_payoff_matrix.png`
5. `05_capital_efficiency_bound.png`
6. `06_solvency_stress.png`
7. `07_dependency_sensitivity_and_bounds.png`

## Interpretation

A successful run supports four narrower claims:

1. One shared finite-state cost function can quote many payoff vectors coherently.
2. Marginal claims can be anchored to external CLOB probabilities.
3. Exact payoff-equivalent portfolios have identical instantaneous values under the
   same state-price vector.
4. The weighted-LMSR cost function has a finite analytic worst-case loss bound, which
   can be used as a seed-reserve requirement.

It does **not** establish that:
- the chosen joint-dependence model is correct;
- PRISM prices will outperform professional market makers;
- external CLOB prices cannot be manipulated;
- a production oracle is safe;
- real users will trade these products;
- legal/regulatory requirements are satisfied.

Those need separate empirical and operational validation.