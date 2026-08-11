package db

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"io/fs"
	"log/slog"
	"time"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/lib/pq"

	"retropick/apps/backend/migrations"
)

const waitSchemaTimeout = 5 * time.Minute

// maxEmbeddedVersion returns the highest migration version present in the embedded source.
func maxEmbeddedVersion(d source.Driver) (uint, error) {
	v, err := d.First()
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return 0, nil
		}
		return 0, err
	}
	for {
		next, err := d.Next(v)
		if err != nil {
			if errors.Is(err, fs.ErrNotExist) {
				return v, nil
			}
			return 0, err
		}
		v = next
	}
}

// RunMigrations applies embedded SQL migrations (used by the API as the schema authority).
// If the database version is already higher than the highest embedded version (e.g. an old
// binary with fewer migrations), it logs a warning and returns without error so services do
// not crash on version skew with the persistent volume. Retries on transient connect/DNS
// failures (e.g. Docker and WSL2 startup) until waitSchemaTimeout.
func RunMigrations(databaseURL string) error {
	deadline := time.Now().Add(waitSchemaTimeout)
	backoff := 500 * time.Millisecond
	const maxBackoff = 5 * time.Second
	var loggedWait bool
	var lastErr error
	for attempt := 0; ; attempt++ {
		if time.Now().After(deadline) {
			if lastErr != nil {
				return fmt.Errorf("migrations: timeout after %v waiting for database: last error: %w", waitSchemaTimeout, lastErr)
			}
			return fmt.Errorf("migrations: timeout after %v waiting for database", waitSchemaTimeout)
		}
		if attempt > 0 {
			if !loggedWait {
				slog.Default().Info("database not ready, retrying migrations", "backoff", backoff, "err", lastErr)
				loggedWait = true
			}
			time.Sleep(backoff)
			if nb := backoff * 2; nb <= maxBackoff {
				backoff = nb
			} else {
				backoff = maxBackoff
			}
		}

		err := runMigrationsOnce(databaseURL)
		if err == nil {
			return nil
		}
		lastErr = err
		if isPGAuthFailure(err) {
			return err
		}
		if isTransientDBReachabilityError(err) {
			continue
		}
		return err
	}
}

func runMigrationsOnce(databaseURL string) error {
	d, err := iofs.New(migrations.Files, ".")
	if err != nil {
		return fmt.Errorf("migration source: %w", err)
	}
	maxVer, err := maxEmbeddedVersion(d)
	if err != nil {
		_ = d.Close()
		return fmt.Errorf("migration source max version: %w", err)
	}
	sqlDB, err := sql.Open("postgres", databaseURL)
	if err != nil {
		_ = d.Close()
		return fmt.Errorf("sql open: %w", err)
	}
	defer sqlDB.Close()

	driver, err := postgres.WithInstance(sqlDB, &postgres.Config{})
	if err != nil {
		_ = d.Close()
		return fmt.Errorf("postgres migrate driver: %w", err)
	}
	m, err := migrate.NewWithInstance("iofs", d, "postgres", driver)
	if err != nil {
		_ = d.Close()
		return fmt.Errorf("migrate new: %w", err)
	}
	defer m.Close()

	dbVer, dirty, err := m.Version()
	if err != nil && !errors.Is(err, migrate.ErrNilVersion) {
		return err
	}
	if err == nil {
		if dirty {
			return fmt.Errorf("migration state is dirty at version %d", dbVer)
		}
		if maxVer > 0 && dbVer > maxVer {
			slog.Default().Warn("db ahead of embedded migrations", "dbVersion", dbVer, "embeddedMax", maxVer)
			return nil
		}
	}
	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return err
	}
	return nil
}

// WaitForSchema blocks until schema_migrations exists and the latest migration is not dirty
// (e.g. after the API has finished applying migrations). For fresh databases, it retries
// until the table is created and populated. Retries on transient connect/DNS failures the same
// as waiting for the table to exist.
func WaitForSchema(ctx context.Context, databaseURL string, log *slog.Logger) error {
	if log == nil {
		log = slog.Default()
	}
	sqlDB, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return fmt.Errorf("sql open: %w", err)
	}
	defer sqlDB.Close()

	deadline := time.Now().Add(waitSchemaTimeout)
	backoff := 500 * time.Millisecond
	const maxBackoff = 5 * time.Second
	var loggedTransient bool
	for attempt := 0; ; attempt++ {
		if time.Now().After(deadline) {
			return fmt.Errorf("wait for schema: timeout after %v", waitSchemaTimeout)
		}
		if attempt > 0 {
			if err := sleepOrCtx(ctx, backoff); err != nil {
				return err
			}
			if nb := backoff * 2; nb <= maxBackoff {
				backoff = nb
			} else {
				backoff = maxBackoff
			}
		}

		var version int
		var dirty bool
		err = sqlDB.QueryRowContext(ctx, `SELECT version, dirty FROM schema_migrations LIMIT 1`).Scan(&version, &dirty)
		if err != nil {
			if isPGAuthFailure(err) {
				return fmt.Errorf("wait for schema: %w", err)
			}
			if errors.Is(err, sql.ErrNoRows) {
				continue
			}
			var pqErr *pq.Error
			if errors.As(err, &pqErr) && pqErr.Code == "42P01" {
				continue
			}
			if isTransientDBReachabilityError(err) {
				if !loggedTransient {
					log.Info("database not ready, waiting for schema", "err", err)
					loggedTransient = true
				}
				continue
			}
			return fmt.Errorf("wait for schema: %w", err)
		}
		if !dirty {
			log.Info("schema ready", "version", version)
			return nil
		}
		log.Info("schema migration in progress (dirty), waiting", "version", version)
	}
}

func sleepOrCtx(ctx context.Context, d time.Duration) error {
	t := time.NewTimer(d)
	defer t.Stop()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-t.C:
		return nil
	}
}
