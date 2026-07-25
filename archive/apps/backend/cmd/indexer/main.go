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
	"retropick/apps/backend/internal/legacy/domain"
	"retropick/apps/backend/internal/legacy/domain/referrals"
	"retropick/apps/backend/internal/ethops"
	"retropick/apps/backend/internal/indexer"
	"retropick/apps/backend/internal/metrics"
	"retropick/apps/backend/internal/platform/bus"
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
	reg, err := registry.Load(cfg.RegistryPath)
	if err != nil {
		log.Error("registry", "err", err)
		os.Exit(1)
	}

	if err := db.WaitForSchema(ctx, cfg.DatabaseURL, log); err != nil {
		log.Error("wait for schema", "err", err)
		os.Exit(1)
	}

	client := ethops.NewFailoverRPCClient(cfg.RPCURL, cfg.RPCFallbackURLs)
	defer client.Close()

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

	svc, err := indexer.NewService(pool, client, reg.Contracts.MarketEngineProxy, indexer.Config{
		FinalityDepth:  cfg.IndexerFinalityDepth,
		StartBlock:     cfg.IndexerStartBlock,
		LookbackBlocks: cfg.IndexerLookbackBlocks,
	}, log)
	if err != nil {
		log.Error("indexer", "err", err)
		os.Exit(1)
	}
	eventBus := bus.New()
	svc.SetBus(eventBus)
	if cfg.ReferralsEnabled {
		refSvc := referrals.New(domain.Service{Bus: eventBus}, pool, true)
		svc.SetReferralsProcessor(refSvc)
	}
	feeRouterAddr := cfg.FeeRouterAddress
	if feeRouterAddr == "" {
		feeRouterAddr = os.Getenv("FEE_ROUTER_ADDRESS")
	}
	if err := svc.SetFeeRouterAddress(feeRouterAddr); err != nil {
		log.Error("fee router", "err", err)
		os.Exit(1)
	}
	svc.RegisterDefaultSubscribers()
	var successfulTicks atomic.Int64
	var failedTicks atomic.Int64
	metrics.ServeIfConfigured(ctx, "indexer", func() map[string]float64 {
		return map[string]float64{
			"retropick_indexer_successful_ticks_total": float64(successfulTicks.Load()),
			"retropick_indexer_failed_ticks_total":     float64(failedTicks.Load()),
		}
	}, log)

	maxBlocksPerTick := cfg.IndexerMaxBlocksPerTick
	// Base Sepolia public RPC commonly caps eth_getLogs block span at 10k.
	if maxBlocksPerTick > 10_000 {
		maxBlocksPerTick = 10_000
	}
	tickInterval := cfg.IndexerTickInterval
	tick := time.NewTicker(tickInterval)
	defer tick.Stop()
	for {
		syncCtx, syncCancel := context.WithTimeout(ctx, cfg.LiveRPCTimeout)
		err := svc.SyncOnce(syncCtx, maxBlocksPerTick)
		syncCancel()
		if err != nil {
			log.Error("sync", "err", err)
			failedTicks.Add(1)
		} else {
			successfulTicks.Add(1)
		}
		select {
		case <-ctx.Done():
			return
		case <-tick.C:
		}
	}
}
