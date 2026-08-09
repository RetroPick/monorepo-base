// Package signals implements deterministic Markets signal foundations.
//
// Two layers coexist by design:
//
//   - Catalog signals (Engine → markets.SignalEnvelope) serve Phase-1 read-market
//     alerts such as new_market, price_move, liquidity_change, and rule_changed.
//
//   - Intelligence evidence envelopes (EvidenceEnvelope) serve ADR-008 Smart Money
//     publish paths with versioned params, canonical content hashes, and lifecycle
//     states (draft, active, stale, retracted, superseded).
//
// All scoring runs server-side. Clients render only; there is no client-side signal
// generation in production and no auto-copy order path from signals.
package signals
