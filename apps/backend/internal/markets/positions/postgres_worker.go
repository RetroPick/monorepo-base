package positions

import (
	"context"
	"fmt"
	"time"
)

// PostgresWorker reconciles durable position projections using venue truth.
// It never treats a missing upstream row as a zero balance.
type PostgresWorkerConfig struct {
	Store    *PostgresStore
	Venue    VenuePositionReader
	Interval time.Duration
}

type PostgresWorker struct {
	store    *PostgresStore
	venue    VenuePositionReader
	interval time.Duration
}

func NewPostgresWorker(cfg PostgresWorkerConfig) *PostgresWorker {
	interval := cfg.Interval
	if interval <= 0 {
		interval = defaultReconcileInterval
	}
	return &PostgresWorker{store: cfg.Store, venue: cfg.Venue, interval: interval}
}

// Run executes a durable reconciliation pass at the configured interval.
func (w *PostgresWorker) Run(ctx context.Context) error {
	if err := w.RunOnce(ctx); err != nil {
		return err
	}
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			if err := w.RunOnce(ctx); err != nil {
				return err
			}
		}
	}
}

func (w *PostgresWorker) RunOnce(ctx context.Context) error {
	if w == nil || w.store == nil || w.venue == nil {
		return fmt.Errorf("durable position worker: unavailable")
	}
	accounts, err := w.store.ListUserAccounts(ctx)
	if err != nil {
		return err
	}
	for _, account := range accounts {
		rows, observedAt, err := w.venue.ListPositions(ctx, VenuePositionRequest{AccountWallet: account.AccountWallet})
		if err != nil {
			return fmt.Errorf("load venue positions for user %q: %w", account.UserID, err)
		}
		if _, err := w.store.ApplyVenueRebuild(ctx, account.UserID, account.AccountWallet, rows, observedAt); err != nil {
			return err
		}
	}
	return nil
}
