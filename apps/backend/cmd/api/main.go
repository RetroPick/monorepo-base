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

	"retropick/apps/backend/internal/api"
	"retropick/apps/backend/internal/config"
	"retropick/apps/backend/internal/db"
	"retropick/apps/backend/internal/ethops"
	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/clob"
	"retropick/apps/backend/internal/markets/gamma"
	"retropick/apps/backend/internal/markets/marketdata"
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

	ethCaller, err := ethops.NewCaller(cfg.RPCURL, cfg.RPCFallbackURLs...)
	if err != nil {
		log.Error("ethops", "err", err)
		os.Exit(1)
	}
	ethCaller.SetGlobalCacheTTL(cfg.LiveRPCGlobalCacheTTL)
	defer ethCaller.Close()

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

	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			next.ServeHTTP(w, api.WithAuthConfig(r, api.AuthConfig{
				JWTSecret:      cfg.AuthJWTSecret,
				SessionSecret:  cfg.AuthSessionSecret,
				SessionTTL:     cfg.AuthSessionTTL,
				NonceTTL:       cfg.AuthNonceTTL,
				CookieDomain:   cfg.AuthCookieDomain,
				CookieSecure:   cfg.AuthCookieSecure,
				CookieSameSite: cfg.AuthCookieSameSite,
			}))
		})
	})
	r.Use(cors.Handler(cors.Options{
		AllowOriginFunc:  api.BuildCORSAllowOriginFunc(),
		AllowedMethods:   []string{"GET", "HEAD", "OPTIONS", "POST"},
		AllowedHeaders:   []string{"Accept", "Content-Type", "Authorization", "X-CSRF-Token"},
		AllowCredentials: true,
	}))
	r.Use(middleware.RequestID, middleware.Logger, middleware.Recoverer, middleware.Timeout(60*time.Second))
	r.Use(func(next http.Handler) http.Handler {
		return api.RateLimitMiddleware(next, api.RateLimitOptions{
			TrustForwardedFor: len(cfg.TrustedProxyCIDRs) > 0,
			TrustedProxyCIDRs: cfg.TrustedProxyCIDRs,
		})
	})

	api.RegisterHealthRoutes(r, pool, ethCaller, reg, api.BuildInfo{
		Version: cfg.BuildVersion,
		Commit:  cfg.BuildCommit,
		Time:    cfg.BuildTime,
		ABIHash: api.ABIHash(),
	}, false)

	r.Mount("/api/v1/auth", api.AuthRouter())

	marketsSvc := markets.NewService(markets.ServiceConfig{
		Catalog:           gamma.NewClient(cfg.MarketsGammaAPIURL),
		CatalogEnabled:    cfg.MarketsCatalogEnabled,
		MarketData:        clob.NewClient(cfg.MarketsCLOBAPIURL),
		MarketProcessor:   marketdata.Processor{},
		MarketDataEnabled: cfg.MarketsMarketDataEnabled,
		BookMaxAge:        cfg.MarketsBookMaxAge,
	})
	markets.RegisterRoutes(r, markets.NewHandler(marketsSvc))

	srv := &http.Server{Addr: fmt.Sprintf(":%d", cfg.HTTPPort), Handler: r}
	go func() {
		log.Info("api listening", "addr", srv.Addr, "mode", "markets-bff")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Error("http", "err", err)
			cancel()
		}
	}()
	<-ctx.Done()
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	_ = srv.Shutdown(shutdownCtx)
}
