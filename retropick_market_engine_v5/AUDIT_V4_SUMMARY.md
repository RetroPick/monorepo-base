# Audit notes v4

Resolved in this pass:
- lock/resolve no longer trust off-chain price numbers directly
- void/draw path moves refundable liabilities into `ClaimsVault`
- claims are full-claim-only and idempotent via `claimed` flag
- reserve accounting is explicit for claim/fee movements

Still version-sensitive:
- exact `pyth-solana-receiver-sdk` crate compatibility must be validated in your local toolchain lockfile
- TS integration tests need a local validator + receiver-posting flow wired to your preferred scripts

Still recommended before deployment:
- end-to-end lifecycle tests
- invariant/property tests
- explicit worker runbook and monitoring
- deeper economic/audit review of switch-fee accounting against UI expectations
