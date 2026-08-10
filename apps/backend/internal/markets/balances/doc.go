// Package balances serves authenticated collateral balance reads for Markets V1.
//
// Contract:
//   - Polymarket CLOB is venue authority; the BFF never invents balances
//   - Primary accountWallet comes from wallet discovery (P2-003), not the client
//   - MoneyAmount uses integer base units (no binary floating point)
//   - ClobVenueSource reads GET /balance-allowance (COLLATERAL) with server L2 HMAC
//   - Unwired L2CredentialStore returns 502 until auth persistence lands
//   - Wire production via NewProductionHandlerConfig (see factory.go godoc)
package balances
