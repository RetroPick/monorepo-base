package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/config"
	"retropick/apps/backend/internal/db"
	"retropick/apps/backend/internal/domain"
	"retropick/apps/backend/internal/domain/impact"
)

func main() {
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	cfg, err := config.Load()
	if err != nil {
		log.Error("config", "err", err)
		os.Exit(1)
	}
	if !cfg.ImpactEnabled {
		log.Info("rewards-worker: IMPACT_ENABLED=0, exiting")
		return
	}

	if err := db.WaitForSchema(ctx, cfg.DatabaseURL, log); err != nil {
		log.Error("wait for schema", "err", err)
		os.Exit(1)
	}
	pool, err := db.NewPoolWithConfig(ctx, cfg.DatabaseURL, db.PoolConfig{
		MaxConns:            cfg.DBMaxConns,
		MinConns:            cfg.DBMinConns,
		MaxConnLifetime:     cfg.DBMaxConnLifetime,
		HealthCheckInterval: cfg.DBHealthCheckInterval,
	})
	if err != nil {
		log.Error("db pool", "err", err)
		os.Exit(1)
	}
	defer pool.Close()

	svc := impact.New(domain.Service{}, pool, true)
	interval := 24 * time.Hour
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	run := func() {
		if err := aggregateDaily(ctx, pool, svc); err != nil {
			log.Error("aggregate", "err", err)
		} else {
			log.Info("impact daily metrics aggregated")
		}
	}
	run()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			run()
		}
	}
}

func aggregateDaily(ctx context.Context, pool *pgxpool.Pool, svc *impact.Service) error {
	_, err := pool.Exec(ctx, `
INSERT INTO impact_daily_metrics (day, gusd_volume, gusd_fees, unique_users, verified_users, rewards_claimed, markets_resolved)
SELECT
  CURRENT_DATE,
  COALESCE((SELECT SUM(fee_amount) FROM fee_events WHERE created_at::date = CURRENT_DATE), 0),
  COALESCE((SELECT SUM(fee_amount) FROM fee_events WHERE created_at::date = CURRENT_DATE), 0),
  COALESCE((SELECT COUNT(DISTINCT trader_wallet) FROM fee_events WHERE created_at::date = CURRENT_DATE), 0),
  COALESCE((SELECT COUNT(*) FROM gooddollar_user_status WHERE goodid_verified = true), 0),
  COALESCE((SELECT SUM(amount) FROM referral_reward_events WHERE status = 'claimed' AND created_at::date = CURRENT_DATE), 0),
  COALESCE((SELECT COUNT(*) FROM epochs WHERE status = 'resolved' AND updated_at::date = CURRENT_DATE), 0)
ON CONFLICT (day) DO UPDATE SET
  gusd_volume = EXCLUDED.gusd_volume,
  gusd_fees = EXCLUDED.gusd_fees,
  unique_users = EXCLUDED.unique_users,
  verified_users = EXCLUDED.verified_users,
  rewards_claimed = EXCLUDED.rewards_claimed,
  markets_resolved = EXCLUDED.markets_resolved
`)
	if err != nil {
		return err
	}
	_, _ = svc.GetGoodDollarSummary(ctx)
	return nil
}
