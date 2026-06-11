package main

import (
	"context"
	"errors"
	"log/slog"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"retropick/apps/backend/internal/config"
	"retropick/apps/backend/internal/db"
	"retropick/apps/backend/internal/funding"
	"retropick/apps/backend/internal/metrics"
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

	creditWorker := funding.NewCreditWorker(pool, log, 2*time.Second)
	matcherWorker := funding.NewMatcherWorker(pool, log, cfg.MatcherPollInterval)
	destinationPoller, err := funding.NewDestinationPoller(
		pool,
		cfg.RPCURL,
		cfg.RPCFallbackURLs,
		cfg.SettlementChainID,
		cfg.SettlementUSDCAddress,
		cfg.SettlementReceiver,
		cfg.DestinationPollInterval,
		log,
	)
	if err != nil {
		log.Error("destination poller", "err", err)
		os.Exit(1)
	}
	defer destinationPoller.Close()

	metrics.ServeIfConfigured(ctx, "funding-worker", func() map[string]float64 {
		return map[string]float64{}
	}, log)

	var wg sync.WaitGroup
	start := func(name string, run func(context.Context) error) {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if err := run(ctx); err != nil && !errors.Is(err, context.Canceled) {
				log.Error(name+" stopped", "err", err)
				cancel()
			}
		}()
	}

	start("credit worker", creditWorker.Run)
	start("matcher worker", matcherWorker.Run)
	start("destination poller", destinationPoller.Run)

	<-ctx.Done()
	wg.Wait()
}
