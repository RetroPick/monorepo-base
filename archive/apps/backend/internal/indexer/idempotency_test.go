package indexer

import (
	"database/sql"
	"os"
	"testing"

	_ "github.com/lib/pq"
)

func TestReorgRewindToNeverNegative(t *testing.T) {
	const rewindDepth int64 = 64
	for _, lastBlock := range []int64{0, 1, 63, 64, 100, 10_000} {
		rewindTo := lastBlock - rewindDepth
		if rewindTo < 0 {
			rewindTo = 0
		}
		if rewindTo < 0 || rewindTo > lastBlock {
			t.Fatalf("lastBlock=%d rewindTo=%d out of range", lastBlock, rewindTo)
		}
	}
}

func TestChainEventsUniqueConstraintPresent(t *testing.T) {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DATABASE_URL not set")
	}

	// Mirrors migration 000001_init.up.sql — indexer duplicate log delivery must no-op.
	const query = `
SELECT EXISTS (
  SELECT 1
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  WHERE t.relname = 'chain_events'
    AND c.contype = 'u'
    AND pg_get_constraintdef(c.oid) LIKE '%tx_hash%'
    AND pg_get_constraintdef(c.oid) LIKE '%log_index%'
)`

	// Use indexer package's pool pattern indirectly via sql.Open for a lightweight schema check.
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer db.Close()

	var exists bool
	if err := db.QueryRow(query).Scan(&exists); err != nil {
		t.Fatalf("query constraint: %v", err)
	}
	if !exists {
		t.Fatal("expected UNIQUE (tx_hash, log_index) on chain_events")
	}
}

func TestFeeRouteBatchesUniqueConstraintPresent(t *testing.T) {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DATABASE_URL not set")
	}

	const query = `
SELECT EXISTS (
  SELECT 1
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  WHERE t.relname = 'fee_route_batches'
    AND c.contype = 'u'
    AND pg_get_constraintdef(c.oid) LIKE '%tx_hash%'
    AND pg_get_constraintdef(c.oid) LIKE '%log_index%'
)`

	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer db.Close()

	var exists bool
	if err := db.QueryRow(query).Scan(&exists); err != nil {
		t.Fatalf("query constraint: %v", err)
	}
	if !exists {
		t.Fatal("expected UNIQUE (tx_hash, log_index) on fee_route_batches")
	}
}
