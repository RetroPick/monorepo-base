package migrations

import (
	"strings"
	"testing"
)

func TestMarketsV1MigrationDeclaresRequiredProjections(t *testing.T) {
	t.Parallel()

	up, err := Files.ReadFile("000001_markets_v1_foundation.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	down, err := Files.ReadFile("000001_markets_v1_foundation.down.sql")
	if err != nil {
		t.Fatal(err)
	}

	required := []string{
		"markets_catalog_events",
		"markets_catalog_markets",
		"markets_catalog_outcomes",
		"markets_catalog_rules",
		"markets_market_data_latest",
		"markets_market_data_history",
		"markets_market_health_snapshots",
		"markets_raw_upstream_events",
		"markets_sync_checkpoints",
		"markets_market_signals",
		"markets_signal_evidence",
		"markets_signal_retractions",
	}
	for _, table := range required {
		if !strings.Contains(string(up), "CREATE TABLE IF NOT EXISTS "+table) {
			t.Errorf("up migration does not create %s", table)
		}
		if !strings.Contains(string(down), "DROP TABLE IF EXISTS "+table) {
			t.Errorf("down migration does not drop %s", table)
		}
	}
}

func TestMarketsV1MigrationBoundsRawPayloadRetention(t *testing.T) {
	t.Parallel()

	up, err := Files.ReadFile("000001_markets_v1_foundation.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	sql := string(up)
	for _, fragment := range []string{
		"expires_at TIMESTAMPTZ NOT NULL",
		"CHECK (octet_length(payload::text) <= 1048576)",
		"UNIQUE (source, upstream_event_id)",
		"CHECK (freshness_state IN ('fresh', 'stale', 'resyncing', 'unavailable', 'invalid'))",
	} {
		if !strings.Contains(sql, fragment) {
			t.Errorf("migration missing %q", fragment)
		}
	}
}
