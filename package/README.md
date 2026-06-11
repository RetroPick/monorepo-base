# RetroPick Contract Packages

Canonical smart-contract source:

- `package/prediction-v2` — Foundry project (`MarketEngineDispatcher`, modules, oracles, scripts, tests)

Generated ABI package:

- `package/abi` — published ABIs consumed by apps and backend

Do not add another contract implementation under `package/`. Generated Foundry directories (`out/`, `cache/`, `broadcast/`) inside `prediction-v2` are build artifacts, not source projects.
