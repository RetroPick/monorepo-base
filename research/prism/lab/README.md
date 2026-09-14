# PRISM State Liquidity Engine Lab

This package is a runnable mathematical research harness for the proposed PRISM
State Liquidity Engine (SLE).

## Install

```bash
python -m venv .venv
source .venv/bin/activate          # Linux/macOS
# .venv\Scripts\activate           # Windows

pip install -r requirements.txt
```

## Run deterministic offline validation

```bash
python prism_state_liquidity_lab.py --offline
```

Outputs are written to `prism_lab_output/`.

## Run against live Polymarket CLOB data

```bash
python prism_state_liquidity_lab.py --live
```

The script auto-selects three active liquid binary markets from the public
Polymarket Gamma API, downloads the YES-token order books, calibrates the PRISM
state prior to their CLOB midpoints, and compares the PRISM execution curve for
one base claim against executable ask-side CLOB VWAP.

If the public API is unavailable, the script explicitly warns and falls back to
synthetic fixtures. Check `markets.csv` and the `source` column before treating
a run as empirical evidence.

## Tune dependency and liquidity assumptions

```bash
python prism_state_liquidity_lab.py --live --rho 0.35 --b 500
```

- `rho` is an explicit dependency assumption. External marginal prices alone do
  **not** identify the joint distribution.
- `b` controls the cost-function liquidity / price impact.
- Higher `b` means deeper quotes but requires a larger seed reserve.

## Five built-in use cases

1. `A AND B` joint-event derivative
2. `A XOR B` divergence derivative
3. `A OR B` broad-event derivative
4. `2-of-3` basket/parlay primitive
5. Tail-risk tranche paying `0 / .20 / .60 / 1.00` as 0/1/2/3 events resolve YES

All five are payoff vectors over the same state universe and use the same
liquidity surface.

## Figures

- `01_state_prices_before_after.png`
- `02_prism_vs_clob_execution_curve.png`
- `03_five_usecase_price_impact_curves.png`
- `04_payoff_matrix.png`
- `05_capital_efficiency_bound.png`
- `06_solvency_stress.png`
- `07_dependency_sensitivity_and_bounds.png`

## What a PASS means

A PASS supports mathematical coherence of the implemented model under its stated
assumptions. It does **not** prove product-market fit, oracle safety, correct
dependency estimation, regulatory compliance, or superior execution to a CLOB.

The central empirical research question after this harness is:

> Can shared state liquidity give bespoke derivative claims useful executable
> depth and tighter capital efficiency than isolated books/AMMs, while remaining
> manipulation-resistant and solvent under real order flow?