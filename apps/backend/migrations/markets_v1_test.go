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

func TestMarketsV1WalletAccountsMigration(t *testing.T) {
	t.Parallel()

	up, err := Files.ReadFile("000020_markets_v1_wallet_accounts.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	down, err := Files.ReadFile("000020_markets_v1_wallet_accounts.down.sql")
	if err != nil {
		t.Fatal(err)
	}
	upSQL := string(up)
	downSQL := string(down)

	if !strings.Contains(upSQL, "CREATE TABLE IF NOT EXISTS markets_wallet_accounts") {
		t.Error("up migration does not create markets_wallet_accounts")
	}
	if !strings.Contains(downSQL, "DROP TABLE IF EXISTS markets_wallet_accounts") {
		t.Error("down migration does not drop markets_wallet_accounts")
	}

	for _, fragment := range []string{
		"user_id TEXT NOT NULL",
		"signer_address TEXT NOT NULL",
		"account_wallet TEXT NOT NULL",
		"wallet_type TEXT NOT NULL",
		"link_status TEXT NOT NULL",
		"is_primary BOOLEAN NOT NULL",
		"chain_id INT NOT NULL",
		"linkage_proof_hash TEXT",
		"UNIQUE (user_id, signer_address, account_wallet)",
		"idx_markets_wallet_accounts_signer",
		"idx_markets_wallet_accounts_one_primary",
		"WHERE is_primary = TRUE",
		"'EOA', 'POLY_PROXY', 'GNOSIS_SAFE', 'DEPOSIT_WALLET'",
		"'linked', 'pending_verification'",
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

func TestMarketsV1OrdersFillsPreviewsMigration(t *testing.T) {
	t.Parallel()

	up, err := Files.ReadFile("000021_markets_v1_orders_fills_previews.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	down, err := Files.ReadFile("000021_markets_v1_orders_fills_previews.down.sql")
	if err != nil {
		t.Fatal(err)
	}
	upSQL := string(up)
	downSQL := string(down)

	tables := []string{
		"markets_order_previews",
		"markets_user_orders",
		"markets_order_attempts",
		"markets_fills",
	}
	for _, table := range tables {
		if !strings.Contains(upSQL, "CREATE TABLE IF NOT EXISTS "+table) {
			t.Errorf("up migration does not create %s", table)
		}
		if !strings.Contains(downSQL, "DROP TABLE IF EXISTS "+table) {
			t.Errorf("down migration does not drop %s", table)
		}
	}

	for _, fragment := range []string{
		"'unknown'",
		"UNIQUE (idempotency_key)",
		"UNIQUE (upstream_source, upstream_id)",
		"REFERENCES markets_wallet_accounts",
		"REFERENCES markets_order_previews",
		"REFERENCES markets_user_orders",
		"attempt_status TEXT NOT NULL CHECK",
		"consumed_at TIMESTAMPTZ",
		"fee_amount BIGINT",
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
