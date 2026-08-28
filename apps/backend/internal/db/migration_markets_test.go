package db

import (
	"database/sql"
	"os"
	"testing"

	_ "github.com/lib/pq"
)

func TestMarketsMigrations(t *testing.T) {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DATABASE_URL not set")
	}

	if err := RunMigrations(databaseURL); err != nil {
		t.Fatalf("RunMigrations: %v", err)
	}

	sqlDB, err := sql.Open("postgres", databaseURL)
	if err != nil {
		t.Fatalf("sql open: %v", err)
	}
	defer sqlDB.Close()

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
		"markets_price_observations",
		"markets_liquidity_observations",
		"markets_realtime_recovery",
	}
	for _, table := range required {
		var exists bool
		err := sqlDB.QueryRow(
			`SELECT EXISTS (
				SELECT 1 FROM information_schema.tables
				WHERE table_schema = 'public' AND table_name = $1
			)`,
			table,
		).Scan(&exists)
		if err != nil {
			t.Fatalf("check table %s: %v", table, err)
		}
		if !exists {
			t.Fatalf("expected table %s after migrations", table)
		}
	}
}
