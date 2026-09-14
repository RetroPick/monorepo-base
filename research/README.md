# RetroPick Research

This directory contains research artifacts that are exploratory by design and are not production protocol specifications unless explicitly promoted elsewhere in the repository.

## PRISM

`prism/` contains the current research line for PRISM, RetroPick's proposed state-liquidity and programmable-derivatives architecture.

- `PRISM_PROTOCOL_ARCHITECTURE.md` — structured-outcome protocol baseline.
- `PRISM_STATE_LIQUIDITY_THEORY.md` — State Liquidity Engine, Payoff AMM, shared-state collateral and claim-transformer thesis.
- `DERIVATIVES_IDEA_RESEARCH.md` — earlier derivative/launchpad research used as input to the architecture.
- `lab/` — runnable Python falsification harness for finite-state pricing, CLOB calibration, payoff identities, solvency bounds and capital-efficiency experiments.

### Reproducing figures

The lab generates its plots deterministically from source and result data. Run:

```bash
cd research/prism/lab
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python prism_state_liquidity_lab.py --offline --output results
```

For public Polymarket CLOB calibration:

```bash
python prism_state_liquidity_lab.py --live --output results-live
```

Research results are not claims of production safety, product-market fit, oracle correctness, regulatory compliance, or execution superiority.
