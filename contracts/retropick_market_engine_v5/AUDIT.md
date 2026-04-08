# Audit notes v4

Resolved in this pass:
- oracle numbers are no longer trusted from raw instruction params
- void/draw and cancel paths move liabilities into `ClaimsVault`
- claim path is full-claim-only and idempotent
- reserve accounting helpers are explicit

Still recommended before deployment:
- compile-clean pass in your exact local Anchor toolchain
- end-to-end tests with posted Pyth updates
- invariant/fuzz testing for switching, settlement, and refunds
