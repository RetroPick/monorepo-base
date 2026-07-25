package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"strings"
	"sync/atomic"
	"syscall"
	"time"

	"retropick/apps/backend/internal/config"
	"retropick/apps/backend/internal/db"
	"retropick/apps/backend/internal/keeper"
	"retropick/apps/backend/internal/metrics"
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
	if !cfg.KeeperEnabled {
		log.Info("keeper disabled; set KEEPER_ENABLED=1 to run automation")
		return
	}
	reg, err := registry.LoadEmbedded()
	if err != nil {
		log.Error("registry", "err", err)
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
		log.Error("db", "err", err)
		os.Exit(1)
	}
	defer pool.Close()

	privateKeyHex, err := readSecretFile(cfg.KeeperPrivateKeyFile)
	if err != nil {
		log.Error("keeper signer", "err", err)
		os.Exit(1)
	}
	executor, err := keeper.NewHotWalletExecutor(
		cfg.RPCURL,
		privateKeyHex,
		reg.Contracts.MarketEngineProxy,
		reg.ChainID,
		cfg.KeeperReceiptTimeout,
		3*time.Second,
		cfg.RPCFallbackURLs...,
	)
	if err != nil {
		log.Error("keeper executor", "err", err)
		os.Exit(1)
	}
	defer executor.Close()

	repo := keeper.NewPostgresRepository(pool)
	svc := keeper.NewService(repo, executor, keeper.Config{
		WorkerID:      hostnameOr("keeper"),
		RetryBackoff:  cfg.KeeperPollInterval,
		MaxRetryCount: cfg.KeeperMaxRetryCount,
	}, log)
	var processedCount atomic.Int64
	var errorCount atomic.Int64
	metrics.ServeIfConfigured(ctx, "keeper", func() map[string]float64 {
		return map[string]float64{
			"retropick_keeper_processed_jobs_total": float64(processedCount.Load()),
			"retropick_keeper_errors_total":         float64(errorCount.Load()),
		}
	}, log)

	log.Info("retropick-keeper started", "worker", hostnameOr("keeper"))
	tick := time.NewTicker(cfg.KeeperPollInterval)
	defer tick.Stop()
	for {
		processed, err := svc.RunOnce(ctx)
		if err != nil {
			log.Error("keeper run_once", "err", err)
			errorCount.Add(1)
		}
		if processed {
			processedCount.Add(1)
			continue
		}
		select {
		case <-ctx.Done():
			return
		case <-tick.C:
		}
	}
}

func readSecretFile(path string) (string, error) {
	if strings.TrimSpace(path) == "" {
		return "", fmt.Errorf("KEEPER_PRIVATE_KEY_FILE is required when KEEPER_ENABLED=1")
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(data)), nil
}

func hostnameOr(fallback string) string {
	host, err := os.Hostname()
	if err != nil || strings.TrimSpace(host) == "" {
		return fallback
	}
	return host
}
