package migrations_test

import (
	"database/sql"
	"errors"
	"os"
	"testing"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	_ "github.com/lib/pq"

	"retropick/apps/backend/internal/db"
	migrationfiles "retropick/apps/backend/migrations"
)

func TestProjectionIntegrityMigrationRollbackAndReapply(t *testing.T) {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DATABASE_URL not set")
	}
	if err := db.RunMigrations(databaseURL); err != nil {
		t.Fatalf("apply migrations: %v", err)
	}

	source, err := iofs.New(migrationfiles.Files, ".")
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, err := sql.Open("postgres", databaseURL)
	if err != nil {
		t.Fatal(err)
	}
	driver, err := postgres.WithInstance(sqlDB, &postgres.Config{})
	if err != nil {
		t.Fatal(err)
	}
	m, err := migrate.NewWithInstance("iofs", source, "postgres", driver)
	if err != nil {
		t.Fatal(err)
	}
	defer m.Close()
	defer sqlDB.Close()

	if err := m.Steps(-1); err != nil {
		t.Fatalf("rollback 000024: %v", err)
	}
	version, dirty, err := m.Version()
	if err != nil || dirty || version != 23 {
		t.Fatalf("version after rollback = %d dirty=%v err=%v, want 23 clean", version, dirty, err)
	}
	if err := db.RunMigrations(databaseURL); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		t.Fatalf("reapply 000024: %v", err)
	}
	version, dirty, err = m.Version()
	if err != nil || dirty || version != 24 {
		t.Fatalf("version after reapply = %d dirty=%v err=%v, want 24 clean", version, dirty, err)
	}
}
