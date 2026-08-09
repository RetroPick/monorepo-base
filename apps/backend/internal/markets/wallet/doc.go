// Package wallet implements account-wallet discovery and linkage for Markets V1.
//
// ADR-003 invariants:
//   - signerAddress and accountWallet are always distinct JSON fields
//   - accountWallet addresses come only from AccountStore linkage, never invented
//   - session auth is required; UnauthenticatedResolver returns 401 by default
//
// MKT-P2-004 adds Postgres persistence (markets_wallet_accounts) and link write APIs.
// CLOB credentials and relayer HTTP are out of scope.
package wallet
