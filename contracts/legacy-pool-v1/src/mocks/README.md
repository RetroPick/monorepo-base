# Contract Mocks

This directory contains Foundry-only mocks and testnet helper contracts.

- Use these contracts in tests, local deployments, and disposable testnet flows only.
- Do not wire mocks into production deployment scripts or production templates.
- Production contract sources live in `src/engine`, `src/oracle`, `src/yield`, `src/logic`, `src/interfaces`, `src/libraries`, and `src/types`.

The former `src/test` directory was renamed to `src/mocks` so production code, test helpers, and vendored `lib/` dependencies have distinct names.
