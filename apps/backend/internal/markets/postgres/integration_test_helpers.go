package postgres

import (
	"context"
	"os"
	"path/filepath"
	"syscall"

	"github.com/jackc/pgx/v5/pgxpool"
)

func integrationLockPath() string {
	return filepath.Join(os.TempDir(), "retropick-markets-integration.lock")
}

// LockIntegrationDB serializes DATABASE_URL integration tests across packages/processes.
func LockIntegrationDB() func() {
	f, err := os.OpenFile(integrationLockPath(), os.O_CREATE|os.O_RDWR, 0o600)
	if err != nil {
		panic(err)
	}
	if err := syscall.Flock(int(f.Fd()), syscall.LOCK_EX); err != nil {
		_ = f.Close()
		panic(err)
	}
	return func() {
		_ = syscall.Flock(int(f.Fd()), syscall.LOCK_UN)
		_ = f.Close()
	}
}

// ResetIntegrationMarketsDB clears markets v1 tables so integration tests do not leak state.
func ResetIntegrationMarketsDB(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, `
TRUNCATE TABLE
	markets_signal_retractions,
	markets_signal_evidence,
	markets_market_signals,
	markets_realtime_recovery,
	markets_liquidity_observations,
	markets_price_observations,
	markets_market_health_snapshots,
	markets_market_data_latest,
	markets_market_data_history,
	markets_catalog_rules,
	markets_catalog_outcomes,
	markets_catalog_markets,
	markets_raw_upstream_events,
	markets_sync_checkpoints,
	markets_catalog_events
RESTART IDENTITY CASCADE`)
	return err
}
