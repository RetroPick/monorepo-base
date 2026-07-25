package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"sync/atomic"
	"syscall"
	"time"

	"retropick/apps/backend/internal/config"
	"retropick/apps/backend/internal/db"
	"retropick/apps/backend/internal/ethops"
	"retropick/apps/backend/internal/feedregistry"
	"retropick/apps/backend/internal/marketdata"
	"retropick/apps/backend/internal/metrics"
	"retropick/apps/backend/internal/priceworker"
	"retropick/apps/backend/internal/registry"
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
		MaxConns: cfg.DBMaxConns, MinConns: cfg.DBMinConns,
		MaxConnLifetime: cfg.DBMaxConnLifetime, HealthCheckInterval: cfg.DBHealthCheckInterval,
	})
	if err != nil {
		log.Error("db pool", "err", err)
		os.Exit(1)
	}
	defer pool.Close()

	feeds, err := feedregistry.Load()
	if err != nil {
		log.Error("feed registry", "err", err)
		os.Exit(1)
	}
	contracts, err := registry.LoadEmbedded()
	if err != nil {
		log.Error("contract registry", "err", err)
		os.Exit(1)
	}
	if err := priceworker.ValidateRegistryChain(contracts.ChainID, feeds.ChainID); err != nil {
		log.Error("feed registry", "err", err)
		os.Exit(1)
	}
	client := ethops.NewFailoverRPCClient(cfg.RPCURL, cfg.RPCFallbackURLs)
	defer client.Close()
	reader, err := priceworker.NewChainlinkReader(client)
	if err != nil {
		log.Error("chainlink reader", "err", err)
		os.Exit(1)
	}
	poller := priceworker.NewPoller(feeds.Feeds, reader, marketdata.NewService(pool, log), cfg.PriceHeartbeatInterval, log)

	var successfulRuns atomic.Uint64
	var failedRuns atomic.Uint64
	metrics.ServeIfConfigured(ctx, "price-worker", func() map[string]float64 {
		stats := poller.Stats()
		return map[string]float64{
			"retropick_price_worker_successful_runs_total":  float64(successfulRuns.Load()),
			"retropick_price_worker_failed_runs_total":      float64(failedRuns.Load()),
			"retropick_price_worker_successful_polls_total": float64(stats.SuccessfulPolls),
			"retropick_price_worker_failed_polls_total":     float64(stats.FailedPolls),
			"retropick_price_worker_ingested_ticks_total":   float64(stats.IngestedTicks),
		}
	}, log)

	ticker := time.NewTicker(cfg.PricePollInterval)
	defer ticker.Stop()
	for {
		runCtx, runCancel := context.WithTimeout(ctx, cfg.LiveRPCTimeout)
		err := poller.RunOnce(runCtx)
		runCancel()
		if err != nil {
			failedRuns.Add(1)
		} else {
			successfulRuns.Add(1)
		}
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}
