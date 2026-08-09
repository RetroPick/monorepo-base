// Package eligibility implements server-authoritative, fail-closed jurisdiction
// checks for Markets V1 transactional gates (MKT-FR-021 / MKT-SEC-008).
//
// Unknown region, GeoIP failure, geoblock timeout, or unwired upstream (BLK-001)
// always yields eligible:false. geo.HTTPResolver resolves client region when
// MARKETS_GEOIP_BASE_URL is set; geoblock.HTTPChecker calls GET /api/geoblock when
// MARKETS_GEOBLOCK_BASE_URL is set. DefaultEvaluator keeps UnwiredResolver and
// UnwiredChecker until env or service injection. Client-supplied geo headers are
// never trusted.
package eligibility
