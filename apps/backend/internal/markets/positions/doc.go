// Package positions stores BFF position projections reconciled against Polymarket
// venue truth (Data API GET /positions). Projections are not ownership authority;
// venue and chain remain authoritative per ADR-001.
//
// The reconcile worker polls venue read-only on a 5m cadence, repairs drift,
// and surfaces syncStatus updating/reconciling during reorgs or sustained mismatch.
// No CTF redeem, split, or merge operations live in this package (MKT-P4-004+).
package positions
