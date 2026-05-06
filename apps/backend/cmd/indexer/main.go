package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/ethereum/go-ethereum/ethclient"

	"retropick/apps/backend/internal/config"
	"retropick/apps/backend/internal/db"
	"retropick/apps/backend/internal/indexer"
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
	reg, err := registry.LoadEmbedded()
	if err != nil {
		log.Error("registry", "err", err)
		os.Exit(1)
	}

	if err := db.WaitForSchema(ctx, cfg.DatabaseURL, log); err != nil {
		log.Error("wait for schema", "err", err)
		os.Exit(1)
	}

	pool, err := db.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Error("db pool", "err", err)
		os.Exit(1)
	}
	defer pool.Close()

	client, err := ethclient.DialContext(ctx, cfg.RPCURL)
	if err != nil {
		log.Error("eth client", "err", err)
		os.Exit(1)
	}
	defer client.Close()

	svc, err := indexer.NewService(pool, client, reg.Contracts.MarketEngineProxy, log)
	if err != nil {
		log.Error("indexer", "err", err)
		os.Exit(1)
	}

	maxBlocksPerTick := uint64(2000)
	if raw := strings.TrimSpace(os.Getenv("INDEXER_MAX_BLOCKS_PER_TICK")); raw != "" {
		if n, parseErr := strconv.ParseUint(raw, 10, 64); parseErr == nil && n > 0 {
			maxBlocksPerTick = n
		}
	}
	// Base Sepolia public RPC commonly caps eth_getLogs block span at 10k.
	if maxBlocksPerTick > 10_000 {
		maxBlocksPerTick = 10_000
	}
	tickInterval := 5 * time.Second
	if raw := strings.TrimSpace(os.Getenv("INDEXER_TICK_INTERVAL_MS")); raw != "" {
		if n, parseErr := strconv.ParseInt(raw, 10, 64); parseErr == nil && n > 0 {
			tickInterval = time.Duration(n) * time.Millisecond
		}
	}
	tick := time.NewTicker(tickInterval)
	defer tick.Stop()
	for {
		if err := svc.SyncOnce(ctx, maxBlocksPerTick); err != nil {
			log.Error("sync", "err", err)
		}
		select {
		case <-ctx.Done():
			return
		case <-tick.C:
		}
	}
}
