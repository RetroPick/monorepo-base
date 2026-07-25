## Quick start (non-dev friendly)

- **What this does**: prints **one-time deployment cost** and **ongoing “epoch maintenance” cost** (manual + rolling), priced using **live Base Sepolia fees**.
- **No secrets needed**: by default it does **dry-run simulations** (no broadcast) and injects safe defaults for the deploy scripts.

Run (human-readable tables):

python3 scripts/estimate_deploy_and_epoch_costs.py

Run (machine-readable JSON):

python3 scripts/estimate_deploy_and_epoch_costs.py --json

Use a specific RPC:

python3 scripts/estimate_deploy_and_epoch_costs.py --rpc-url https://sepolia.base.org

### Mainnet gas price + Sepolia deploy simulation

When `--rpc-url` is **Base mainnet** (`https://mainnet.base.org`), live **gas price / chain id / L1 fees** come from mainnet, but **`forge script` deploy dry-runs fork Base Sepolia** (mainnet forks are too slow). Override with `--deploy-fork-rpc-url` if needed.

python3 scripts/estimate_deploy_and_epoch_costs.py --json --rpc-url https://mainnet.base.org

# Skip forge deploy dry-runs and only reprice snapshot gas with live fees (fast).
python3 scripts/estimate_deploy_and_epoch_costs.py --no-deploy-sim --rpc-url https://mainnet.base.org --json

# Cap wait per forge dry-run (default 600s; env FORGE_SCRIPT_TIMEOUT).
python3 scripts/estimate_deploy_and_epoch_costs.py --forge-timeout 120 --rpc-url https://sepolia.base.org

## The three knobs people actually change (with examples)

### 1) How many manual epochs happen per day?

- **Env**: `MANUAL_EPOCHS_PER_DAY`
- **Meaning**: how many times per day the keeper performs the manual lifecycle (open → lock → resolve).
- **Default**: `1`
- **Example**: 50 manual epochs/day (high activity)

MANUAL_EPOCHS_PER_DAY=50 python3 scripts/estimate_deploy_and_epoch_costs.py --color always

### 2) How often does a rolling market tick?

- **Env**: `ROLLING_INTERVAL_SECONDS`
- **Meaning**: seconds between rolling “ticks” (each tick calls `executeRollingRound` once per template).
- **Default**: `3600` (1 hour)
- **Rule**: ticks/day = \(86400 / ROLLING_INTERVAL_SECONDS\)
- **Example**: 30-minute ticks → \(86400/1800 = 48\) ticks/day

ROLLING_INTERVAL_SECONDS=1800 python3 scripts/estimate_deploy_and_epoch_costs.py --color always

### 3) How many templates are you running?

- **Env**: `MANUAL_TEMPLATES` and `ROLLING_TEMPLATES`
- **Meaning**: how many market templates you operate in each mode.
- **Default**: `1`
- **Example**: 2 rolling templates

ROLLING_TEMPLATES=2 python3 scripts/estimate_deploy_and_epoch_costs.py --color always

### Combined example (the one you mentioned)

# 50 manual epochs/day, rolling ticks every 30 minutes, 2 rolling templates
MANUAL_TEMPLATES=15 MANUAL_EPOCHS_PER_DAY=5 ROLLING_INTERVAL_SECONDS=3600 ROLLING_TEMPLATES=2 python3 scripts/estimate_deploy_and_epoch_costs.py --color always

## Dev-oriented notes

- **Deploy simulation**: `forge script` dry-runs on `--deploy-fork-rpc-url` (default: same as `--rpc-url`, or Sepolia when pricing RPC is mainnet). Parses `Estimated total gas used for script:`; on timeout/failure falls back to `.gas-snapshot` gas.\n+- **Fee model**:\n  - L2 exec fee = gasUsed × gas price from `--rpc-url`\n  - L1 data fee = OP Stack `GasPriceOracle.getL1Fee(bytes)` on `--rpc-url`\n+- **Maintenance gas**: execution gas from `.gas-snapshot`; fees priced live from `--rpc-url`.

# Override live market inputs if needed.
python3 scripts/estimate_deploy_and_epoch_costs.py --json --gas-price-gwei 0.05 --eth-price-usd 3200

# Notes:
# - Default target is Base Sepolia (`https://sepolia.base.org`).
# - Production and testnet deploy estimates are dry-run simulations only: no broadcast, no private key.
# - The script injects built-in env defaults for `script/production` and `script/test`.
# - Manual and rolling maintenance use snapshot execution gas, but price both Base L2 execution and OP Stack L1 data fees live.