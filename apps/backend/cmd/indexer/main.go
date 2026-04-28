package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
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

	tick := time.NewTicker(5 * time.Second)
	defer tick.Stop()
	for {
		if err := svc.SyncOnce(ctx, 2000); err != nil {
			log.Error("sync", "err", err)
		}
		select {
		case <-ctx.Done():
			return
		case <-tick.C:
		}
	}
}
