package migrations

import (
	"strings"
	"testing"
)

func TestMarketsV1MigrationDeclaresRequiredProjections(t *testing.T) {
	t.Parallel()

	up, err := Files.ReadFile("000016_markets_v1_foundation.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	down, err := Files.ReadFile("000016_markets_v1_foundation.down.sql")
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

func TestMarketsV1CatalogWatchlistExpandMigration(t *testing.T) {
	t.Parallel()

	up, err := Files.ReadFile("000019_markets_v1_catalog_watchlist_expand.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	down, err := Files.ReadFile("000019_markets_v1_catalog_watchlist_expand.down.sql")
	if err != nil {
		t.Fatal(err)
	}
	upSQL := string(up)
	downSQL := string(down)

	watchlistTables := []string{
		"markets_watchlists",
		"markets_watchlist_items",
	}
	for _, table := range watchlistTables {
		if !strings.Contains(upSQL, "CREATE TABLE IF NOT EXISTS "+table) {
			t.Errorf("up migration does not create %s", table)
		}
		if !strings.Contains(downSQL, "DROP TABLE IF EXISTS "+table) {
			t.Errorf("down migration does not drop %s", table)
		}
	}

	catalogTables := []string{
		"markets_catalog_events",
		"markets_catalog_markets",
		"markets_catalog_outcomes",
		"markets_catalog_rules",
	}
	for _, table := range catalogTables {
		for _, fragment := range []string{
			"ADD COLUMN IF NOT EXISTS id UUID",
			"ADD COLUMN IF NOT EXISTS upstream_id TEXT",
			"ADD COLUMN IF NOT EXISTS upstream_source TEXT",
			"UNIQUE INDEX IF NOT EXISTS idx_" + table + "_upstream_tuple",
		} {
			if !strings.Contains(upSQL, fragment) {
				t.Errorf("up migration missing %q for %s", fragment, table)
			}
		}
		if !strings.Contains(downSQL, "DROP COLUMN IF EXISTS id") {
			t.Errorf("down migration should drop id column from catalog tables")
		}
	}

	for _, fragment := range []string{
		"idx_markets_raw_upstream_upstream_tuple",
		"markets_sync_checkpoints",
		"ADD COLUMN IF NOT EXISTS upstream_source TEXT",
		"item_kind IN ('event', 'market', 'wallet', 'tag', 'category')",
		"idx_markets_watchlists_one_default",
	} {
		if !strings.Contains(upSQL, fragment) {
			t.Errorf("up migration missing %q", fragment)
		}
	}

	for _, forbidden := range []string{
		"DOUBLE PRECISION",
		"double precision",
		" REAL ",
		" FLOAT ",
	} {
		if strings.Contains(upSQL, forbidden) {
			t.Errorf("up migration must not use %q", forbidden)
		}
	}
}

func TestMarketsV1MigrationBoundsRawPayloadRetention(t *testing.T) {
	t.Parallel()

	up, err := Files.ReadFile("000016_markets_v1_foundation.up.sql")
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
