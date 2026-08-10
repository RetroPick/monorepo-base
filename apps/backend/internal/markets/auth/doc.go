// Package auth implements Markets V1 SIWE session authentication and middleware.
// Session tokens authenticate API access only; they do not confer on-chain signing
// authority (ADR-003). Eligibility gating reuses eligibility.Evaluator fail-closed.
package auth
