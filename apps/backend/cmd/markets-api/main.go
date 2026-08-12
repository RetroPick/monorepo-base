package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"retropick/apps/backend/internal/db"
	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/auth"
	"retropick/apps/backend/internal/markets/balances"
	"retropick/apps/backend/internal/markets/catalog"
	"retropick/apps/backend/internal/markets/clob"
	marketsconfig "retropick/apps/backend/internal/markets/config"
	"retropick/apps/backend/internal/markets/devseed"
	"retropick/apps/backend/internal/markets/eligibility"
	"retropick/apps/backend/internal/markets/gamma"
	"retropick/apps/backend/internal/markets/intelligence"
	"retropick/apps/backend/internal/markets/marketdata"
	"retropick/apps/backend/internal/markets/orders"
	"retropick/apps/backend/internal/markets/positions"
	"retropick/apps/backend/internal/markets/postgres"
	"retropick/apps/backend/internal/markets/realtime"
	"retropick/apps/backend/internal/markets/reconcile"
	"retropick/apps/backend/internal/markets/signals"
	"retropick/apps/backend/internal/markets/syncworker"
	"retropick/apps/backend/internal/markets/wallet"
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

	bootstrapDev := os.Getenv("MARKETS_BOOTSTRAP") == "migrate-and-seed"
	if bootstrapDev {
		if err := db.RunMigrations(cfg.DatabaseURL); err != nil {
			log.Error("RunMigrations", "err", err)
			os.Exit(1)
		}
	} else if err := db.WaitForSchema(ctx, cfg.DatabaseURL, log); err != nil {
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

	if bootstrapDev {
		scenario := os.Getenv("MARKETS_DEV_SEED_SCENARIO")
		if scenario == "" {
			scenario = "populated"
		}
		if err := devseed.Apply(ctx, pool, scenario); err != nil {
			log.Error("dev seed", "err", err, "scenario", scenario)
			os.Exit(1)
		}
		log.Info("dev seed complete", "scenario", scenario)
	}

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
		Source: gamma.NewResilientClient(cfg.GammaAPIURL, gamma.ResilientConfig{}),
		Store:  store,
	})
	if err != nil {
		log.Error("catalog syncer", "err", err)
		os.Exit(1)
	}

	metrics := markets.NewMetrics()
	eligibilityEval := markets.ProductionEligibilityEvaluator(metrics)
	clobClient := clob.NewClient(cfg.CLOBAPIURL)
	var rtRuntime *realtime.Runtime
	var tokenRegistry *postgres.CatalogTokenRegistry

	if cfg.RealtimeEnabled {
		tokenRegistry, err = postgres.NewCatalogTokenRegistry(pool)
		if err != nil {
			log.Error("token registry", "err", err)
			os.Exit(1)
		}
		if err := tokenRegistry.Bootstrap(ctx, 10000); err != nil {
			log.Warn("token registry bootstrap", "err", err)
		}
		if !tokenRegistry.Ready() {
			log.Warn("realtime registry empty; catalog read API continues, realtime subscriptions unavailable until catalog sync")
		}
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
		MaxStaleAge:   cfg.CatalogMaxStaleAge,
		Backoff:       cfg.CatalogBackoff,
		ShutdownGrace: cfg.ShutdownTimeout,
		Metrics:       metrics,
		OnCatalogSynced: func(ctx context.Context) error {
			if tokenRegistry == nil {
				return nil
			}
			if err := tokenRegistry.Refresh(ctx); err != nil {
				return err
			}
			if rtRuntime != nil {
				rtRuntime.SetRegistryReady(tokenRegistry.Ready())
			}
			return nil
		},
	})
	if err != nil {
		log.Error("catalog worker", "err", err)
		os.Exit(1)
	}
	if err := worker.Bootstrap(ctx); err != nil {
		log.Warn("catalog bootstrap", "err", err)
	}

	if cfg.RealtimeEnabled && tokenRegistry != nil {
		committer, err := postgres.NewLiveSignalCommitter(pool, signalEngine, time.Minute, nil)
		if err != nil {
			log.Error("live signal committer", "err", err)
			os.Exit(1)
		}
		rtRuntime, err = realtime.NewRuntime(realtime.RuntimeConfig{
			Config:    cfg,
			REST:      clobClient,
			Registry:  tokenRegistry,
			Validator: tokenRegistry,
			Logger:    log,
		})
		if err != nil {
			log.Error("realtime runtime", "err", err)
			os.Exit(1)
		}
		rtRuntime.SetRegistryReady(tokenRegistry.Ready())
		pipeline := realtime.NewSignalPipeline(realtime.SignalPipelineConfig{
			Committer: committer,
			Publisher: rtRuntime.Producer,
			Logger:    log,
		})
		rtRuntime.Producer.AttachSignals(pipeline)
		rtRuntime.Signals = pipeline
	}

	intelMod, err := intelligence.NewModule(intelligence.Config{
		Enabled: cfg.IntelligenceWhaleFeedEnabled,
	})
	if err != nil {
		log.Error("intelligence module", "err", err)
		os.Exit(1)
	}

	marketsSvc := markets.NewService(markets.ServiceConfig{
		CatalogProjection:            projection,
		CatalogWorker:                worker,
		CatalogEnabled:               cfg.CatalogEnabled,
		CatalogMaxStale:              cfg.CatalogMaxStaleAge,
		MarketData:                   clobClient,
		MarketProcessor:              marketdata.Processor{},
		MarketDataEnabled:            cfg.MarketDataEnabled,
		Signals:                      signalStore,
		SignalsOperational:           store.SignalsOperational(),
		IntelligenceWhaleFeedEnabled: cfg.IntelligenceWhaleFeedEnabled,
		RealtimeState:                rtRuntime,
		Metrics:                      metrics,
		Eligibility:                  eligibilityEval,
		BookMaxAge:                   cfg.BookMaxAge,
		IPTrust: eligibility.IPTrustOptions{
			TrustForwardedFor: len(cfg.TrustedProxyCIDRs) > 0,
			TrustedProxyCIDRs: cfg.TrustedProxyCIDRs,
		},
	})

	posMetrics := positions.NewRecorder()

	authCfg, err := auth.LoadConfig()
	if err != nil {
		log.Error("auth config", "err", err)
		os.Exit(1)
	}
	authMod := auth.NewModule(auth.ModuleConfig{
		Config:    authCfg,
		Evaluator: eligibilityEval,
		IPTrust: eligibility.IPTrustOptions{
			TrustForwardedFor: len(cfg.TrustedProxyCIDRs) > 0,
			TrustedProxyCIDRs: cfg.TrustedProxyCIDRs,
		},
	})

	r := chi.NewRouter()
	r.Use(middleware.RequestID, middleware.Logger, middleware.Recoverer, middleware.Timeout(60*time.Second))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   auth.ParseCORSOrigins(os.Getenv("MARKETS_CORS_ALLOWED_ORIGINS")),
		AllowedMethods:   []string{"GET", "HEAD", "OPTIONS", "POST"},
		AllowedHeaders:   []string{"Accept", "Content-Type", "Authorization", "If-None-Match", "X-CSRF-Token"},
		AllowCredentials: true,
	}))

	markets.RegisterHealthRoutes(r, markets.HealthChecker{
		Pool:                  pool,
		Service:               marketsSvc,
		Worker:                worker,
		SignalsOperational:    store.SignalsOperational(),
		MarketDataOperational: marketsSvc.MarketDataOperational(),
		RealtimeState:         rtRuntime,
		ServiceName:           "retropick-markets-api",
	})
	r.Get("/metrics", func(w http.ResponseWriter, req *http.Request) {
		w.Header().Set("Content-Type", "text/plain; version=0.0.4")
		_, _ = fmt.Fprint(w, metrics.Prometheus())
		_, _ = fmt.Fprint(w, posMetrics.Prometheus())
	})
	walletCfg := wallet.HandlerConfigFromPool(pool)
	posCfg := positions.ProductionConfig{
		Discoverer: walletCfg.Discoverer,
		DataAPIURL: cfg.DataAPIURL,
		Store:      positions.NewProjectionStore(),
		Metrics:    posMetrics,
	}
	ordersHandlerCfg := orders.NewProductionHandlerConfig(orders.ProductionConfig{
		Discoverer:    walletCfg.Discoverer,
		Pool:          pool,
		Catalog:       projection,
		CLOBURL:       cfg.CLOBAPIURL,
		Metrics:       metrics,
		SubmitMetrics: metrics,
	})
	routeDeps := markets.RouteDeps{Wallet: walletCfg}
	if intelMod != nil {
		routeDeps.Intelligence = intelMod.RegisterRoutes
	}
	markets.RegisterRoutesWithDepsAndMarketRoutes(
		r,
		markets.NewHandler(marketsSvc),
		authMod,
		routeDeps,
		[]markets.EligibleMeRouteRegistrar{
			func(r chi.Router) {
				// Portfolio read surface (OpenAPI v1.4.0: /markets/me/positions,
				// /markets/me/activity, /markets/me/portfolio/summary) sits behind the
				// portfolio_read capability gate — 503 capability_disabled until QA green.
				r.Group(func(r chi.Router) {
					r.Use(markets.PortfolioReadGate(marketsSvc))
					positions.RegisterMeRoutes(r, positions.NewProductionHandlerConfig(posCfg))
					r.Get("/activity", markets.PortfolioNotImplementedHandler())
					r.Route("/portfolio", func(r chi.Router) {
						r.Get("/summary", markets.PortfolioNotImplementedHandler())
					})
				})
				balances.RegisterRoutes(r, balances.NewProductionHandlerConfig(balances.ProductionConfig{
					Discoverer: walletCfg.Discoverer,
					CLOBURL:    cfg.CLOBAPIURL,
					L2Store:    balances.UnwiredL2CredentialStore{},
				}))
				orders.RegisterMeRoutes(r, ordersHandlerCfg)
			},
		},
		[]markets.EligibleMarketRouteRegistrar{
			func(r chi.Router) {
				orders.RegisterRoutes(r, ordersHandlerCfg)
			},
		},
	)
	if rtRuntime != nil {
		rtRuntime.Handler.RegisterRoutes(r)
	}

	workerCtx, workerCancel := context.WithCancel(ctx)
	defer workerCancel()
	if bootstrapDev {
		refreshInterval, refreshErr := devSeedRefreshInterval()
		if refreshErr != nil {
			log.Error("dev seed refresh config", "err", refreshErr)
			os.Exit(1)
		}
		if refreshInterval > 0 {
			scenario := os.Getenv("MARKETS_DEV_SEED_SCENARIO")
			if scenario == "" {
				scenario = "populated"
			}
			go func() {
				err := devseed.Refresh(workerCtx, refreshInterval, func(refreshCtx context.Context) error {
					return devseed.Apply(refreshCtx, pool, scenario)
				})
				if err != nil && err != context.Canceled {
					log.Error("dev seed refresh stopped", "err", err)
				}
			}()
		}
	}
	go func() {
		if err := worker.Run(workerCtx); err != nil && err != context.Canceled {
			log.Error("catalog worker stopped", "err", err)
		}
	}()
	if cfg.CLOBAPIURL != "" && marketsReconcileEnabled() {
		tradingClient := clob.NewTradingClient(clob.TradingClientConfig{
			BaseURL: cfg.CLOBAPIURL,
			Creds:   clob.UnwiredCredentialProvider{},
		})
		reconcileWorker := reconcile.NewWorker(reconcile.WorkerConfig{
			Store:        ordersHandlerCfg.Service.Projections(),
			Journal:      orders.NewPostgresMutationJournal(pool),
			Venue:        reconcile.NewCLOBVenueReader(tradingClient),
			Metrics:      metrics,
			Interval:     10 * time.Second,
			UnknownGrace: 90 * time.Second,
		})
		go func() {
			if err := reconcileWorker.Run(workerCtx); err != nil && err != context.Canceled {
				log.Error("reconcile worker stopped", "err", err)
			}
		}()
	}
	if positions.PositionReconcileEnabled() {
		go func() {
			if err := positions.NewProductionWorker(posCfg).Run(workerCtx); err != nil && err != context.Canceled {
				log.Error("position reconcile worker stopped", "err", err)
			}
		}()
	}
	if rtRuntime != nil {
		rtRuntime.Start(workerCtx)
		defer rtRuntime.Stop()
	}

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

func marketsReconcileEnabled() bool {
	switch strings.TrimSpace(strings.ToLower(os.Getenv("MARKETS_RECONCILE_ENABLED"))) {
	case "false", "0", "off":
		return false
	default:
		return true
	}
}

func devSeedRefreshInterval() (time.Duration, error) {
	raw := strings.TrimSpace(os.Getenv("MARKETS_DEV_SEED_REFRESH_INTERVAL"))
	if raw == "" {
		return 0, nil
	}
	interval, err := time.ParseDuration(raw)
	if err != nil || interval <= 0 {
		return 0, fmt.Errorf("MARKETS_DEV_SEED_REFRESH_INTERVAL must be a positive duration")
	}
	return interval, nil
}
