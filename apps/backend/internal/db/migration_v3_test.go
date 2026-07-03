package db

import (
	"database/sql"
	"os"
	"testing"

	_ "github.com/lib/pq"
)

func TestMigrationV3(t *testing.T) {
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
		"indexer_blocks",
		"fee_events",
		"fee_route_batches",
		"reporter_submissions",
		"referral_bindings",
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
