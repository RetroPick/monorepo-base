package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"retropick/apps/backend/internal/db"
	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/catalog"
	"retropick/apps/backend/internal/markets/syncworker"
	"retropick/apps/backend/internal/markets/clob"
	marketsconfig "retropick/apps/backend/internal/markets/config"
	"retropick/apps/backend/internal/markets/gamma"
	"retropick/apps/backend/internal/markets/marketdata"
	"retropick/apps/backend/internal/markets/postgres"
	"retropick/apps/backend/internal/markets/signals"
)

func main() {
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

	cfg, err := marketsconfig.Load()
	if err != nil {
		log.Error("config", "err", err)
		os.Exit(1)
	}

	if err := db.WaitForSchema(ctx, cfg.DatabaseURL, log); err != nil {
		log.Error("wait for schema", "err", err)
		os.Exit(1)
	}

	pool, err := db.NewPoolWithConfig(ctx, cfg.DatabaseURL, db.PoolConfig{
		MaxConns: cfg.DBMaxConns,
		MinConns: cfg.DBMinConns,
	})
	if err != nil {
		log.Error("db pool", "err", err)
		os.Exit(1)
	}
	defer pool.Close()

	store, err := postgres.New(pool)
	if err != nil {
		log.Error("markets store", "err", err)
		os.Exit(1)
	}
	reader, err := postgres.NewCatalogReader(pool)
	if err != nil {
		log.Error("catalog reader", "err", err)
		os.Exit(1)
	}
	projection := postgres.NewProjectionAdapter(reader)

	signalStore, err := postgres.NewSignalStore(pool)
	if err != nil {
		log.Error("signal store", "err", err)
		os.Exit(1)
	}
	signalEngine := signals.NewEngine(signals.EngineConfig{})
	signalProducer := postgres.NewCatalogSignalProducer(signalEngine)
	store.ConfigureSignals(cfg.SignalsEnabled, signalProducer)

	locker, err := postgres.NewCatalogLocker(pool)
	if err != nil {
		log.Error("catalog locker", "err", err)
		os.Exit(1)
	}

	syncer, err := catalog.NewSyncer(catalog.SyncerConfig{
		Source: gamma.NewClient(cfg.GammaAPIURL),
		Store:  store,
	})
	if err != nil {
		log.Error("catalog syncer", "err", err)
		os.Exit(1)
	}

	worker, err := syncworker.NewCatalogWorker(syncworker.Config{
		Syncer:        syncer,
		Reader:        reader,
		Store:         store,
		Locker:        locker,
		Logger:        log,
		Interval:      cfg.CatalogSyncInterval,
		PageSize:      cfg.CatalogPageSize,
		MaxPages:      cfg.CatalogMaxPagesPerRun,
		Backoff:       cfg.CatalogBackoff,
		ShutdownGrace: cfg.ShutdownTimeout,
	})
	if err != nil {
		log.Error("catalog worker", "err", err)
		os.Exit(1)
	}

	metrics := markets.NewMetrics()
	marketsSvc := markets.NewService(markets.ServiceConfig{
		CatalogProjection:   projection,
		CatalogWorker:       worker,
		CatalogEnabled:      cfg.CatalogEnabled,
		CatalogMaxStale:     cfg.CatalogMaxStaleAge,
		MarketData:          clob.NewClient(cfg.CLOBAPIURL),
		MarketProcessor:     marketdata.Processor{},
		MarketDataEnabled:   cfg.MarketDataEnabled,
		Signals:             signalStore,
		SignalsOperational:  store.SignalsOperational(),
		Metrics:             metrics,
		BookMaxAge:          cfg.BookMaxAge,
	})

	r := chi.NewRouter()
	r.Use(middleware.RequestID, middleware.Logger, middleware.Recoverer, middleware.Timeout(60*time.Second))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "HEAD", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Content-Type", "Authorization", "If-None-Match"},
		AllowCredentials: false,
	}))

	markets.RegisterHealthRoutes(r, markets.HealthChecker{
		Pool:                  pool,
		Service:               marketsSvc,
		Worker:                worker,
		SignalsOperational:    store.SignalsOperational(),
		MarketDataOperational: marketsSvc.MarketDataOperational(),
		RealtimeState:         "disabled",
		ServiceName:           "retropick-markets-api",
	})
	markets.RegisterRoutes(r, markets.NewHandler(marketsSvc))

	workerCtx, workerCancel := context.WithCancel(ctx)
	defer workerCancel()
	go func() {
		if err := worker.Run(workerCtx); err != nil && err != context.Canceled {
			log.Error("catalog worker stopped", "err", err)
		}
	}()

	srv := &http.Server{Addr: fmt.Sprintf(":%d", cfg.HTTPPort), Handler: r}
	go func() {
		log.Info("markets-api listening", "addr", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Error("http", "err", err)
			cancel()
		}
	}()

	<-ctx.Done()
	workerCancel()
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer shutdownCancel()
	_ = srv.Shutdown(shutdownCtx)
}
