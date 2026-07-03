package main

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math/big"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/api"
	"retropick/apps/backend/internal/config"
	"retropick/apps/backend/internal/db"
	"retropick/apps/backend/internal/dbqueries"
	"retropick/apps/backend/internal/ethops"
	"retropick/apps/backend/internal/funding"
	"retropick/apps/backend/internal/launchboard"
	"retropick/apps/backend/internal/marketdata"
	"retropick/apps/backend/internal/pglisten"
	"retropick/apps/backend/internal/realtime"
	"retropick/apps/backend/internal/registry"
	"retropick/apps/backend/internal/wshub"
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
	boardCatalog, err := launchboard.Metadata()
	if err != nil {
		log.Error("launchboard", "err", err)
		os.Exit(1)
	}

	ethCaller, err := ethops.NewCaller(cfg.RPCURL, cfg.RPCFallbackURLs...)
	if err != nil {
		log.Error("ethops", "err", err)
		os.Exit(1)
	}
	ethCaller.SetGlobalCacheTTL(cfg.LiveRPCGlobalCacheTTL)
	defer ethCaller.Close()

	var faucetRelayer *ethops.FaucetRelayer
	if cfg.FaucetRelayEnabled {
		fr, err := ethops.NewFaucetRelayer(cfg.RPCURL, cfg.FaucetRelayPrivateKey, reg.ChainID, cfg.RPCFallbackURLs...)
		if err != nil {
			log.Error("faucet relayer", "err", err)
			os.Exit(1)
		}
		faucetRelayer = fr
		defer faucetRelayer.Close()
		log.Info("faucet relay enabled", "relayer", fr.RelayerAddress().Hex())
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

	hub := wshub.NewHub()
	allowlist := funding.Allowlist{
		Providers: map[string]struct{}{},
		Chains:    map[int64]struct{}{},
		Tokens:    map[string]struct{}{},
	}
	for _, p := range cfg.FundingAllowedProviders {
		allowlist.Providers[p] = struct{}{}
	}
	for _, c := range cfg.FundingAllowedChains {
		allowlist.Chains[c] = struct{}{}
	}
	for _, t := range cfg.FundingAllowedTokens {
		allowlist.Tokens[t] = struct{}{}
	}
	fundingSvc := funding.NewService(pool, funding.NewLifiProvider(cfg.LifiBaseURL, cfg.LifiTimeout), allowlist, log)
	marketDataSvc := marketdata.NewService(pool, log)
	_ = marketDataSvc
	go func() {
		if err := pglisten.RunWithCallback(ctx, cfg.DatabaseURL, pool, hub, func(env realtime.EventEnvelope) {
			if env.Channel == "global:markets" || strings.HasPrefix(env.Channel, "market:") {
				marketDataSvc.InvalidateProjections()
			}
		}, log); err != nil && ctx.Err() == nil {
			log.Error("pg listen stopped", "err", err)
		}
	}()

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
	// CORS: see internal/api/cors.go — non-strict mode allows any localhost / 127.0.0.1 http port
	// (ops may bind 3001–3030). Set CORS_STRICT=1 in production; use CORS_ALLOWED_ORIGINS for extra domains.
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
	}, cfg.FaucetRelayEnabled)
	r.Mount("/api/v1/auth", api.AuthRouter())

	r.Get("/api/v1/config/contracts", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		regBytes, err := json.Marshal(reg)
		if err != nil {
			http.Error(w, `{"error":"encode registry"}`, http.StatusInternalServerError)
			return
		}
		var contractsPayload map[string]any
		if err := json.Unmarshal(regBytes, &contractsPayload); err != nil {
			http.Error(w, `{"error":"encode registry"}`, http.StatusInternalServerError)
			return
		}
		contractsPayload["faucetRelayEnabled"] = cfg.FaucetRelayEnabled
		_ = json.NewEncoder(w).Encode(contractsPayload)
	})

	v3svc := api.NewV3Services(cfg, pool)
	r.Mount("/api/v1/gooddollar", api.GoodDollarRouter(v3svc))
	r.Mount("/api/v1/rewards", api.RewardsRouter(v3svc))
	r.Mount("/api/v1/referrals", api.ReferralsRouter(v3svc))
	r.Mount("/api/v1/impact", api.ImpactRouter(v3svc))
	r.Mount("/api/v1/reporter", api.ReporterRouter(v3svc))
	opsRouter := api.OpsRouter(pool, reg, ethCaller)
	opsRouter.Mount("/fee-router", api.FeeRouterOpsRouter(v3svc))
	r.Mount("/api/v1/ops", api.RequireOperator(opsRouter, cfg.AuthJWTSecret))
	r.Mount("/api/v1/tx", api.TxRouter(pool, ethCaller, reg))
	r.Mount("/api/v1/funding", api.FundingRouter(pool, reg, fundingSvc))
	r.Mount("/api/v1/me", api.MeRouter(pool, ethCaller, reg))
	r.Mount("/api/funding", api.FundingAbstractionRouter(pool, fundingSvc, api.FundingAPIConfig{
		SettlementChainID:      cfg.SettlementChainID,
		SettlementUSDCAddress:  cfg.SettlementUSDCAddress,
		SettlementReceiver:     cfg.SettlementReceiver,
		MinDepositUSDC:         cfg.MinDepositUSDC,
		SoftMaxDepositUSDC:     cfg.SoftMaxDepositUSDC,
		HardMaxDepositUSDC:     cfg.HardMaxDepositUSDC,
		SupportedSourceChains:  cfg.FundingAllowedChains,
		SupportedSourceTokens:  cfg.FundingAllowedTokens,
		SupportedProviderNames: cfg.FundingAllowedProviders,
		LifiWebhookSecret:      cfg.LifiWebhookSecret,
	}))

	r.Get("/api/v1/user/balance", api.UserBalanceHandler(pool))
	r.Get("/api/users/{address}/balance", api.UserBalanceV2Handler(pool))
	r.Post("/api/markets/{marketId}/enter", api.EnterMarketFromBalanceHandler(pool, cfg.MarketEntrySafetyBuffer))
	r.Get("/api/v1/user/positions", api.UserPositionsHandler(pool, ethCaller, reg))
	r.Get("/api/v1/user/claims", api.UserClaimsHandler(pool))
	r.Get("/api/v1/user/portfolio-summary", api.UserPortfolioSummaryHandler(pool, ethCaller, reg))
	r.Get("/api/v1/user/watchlist/nonce", api.UserWatchlistNonceHandler(pool))
	r.Get("/api/v1/user/watchlist", api.UserWatchlistListHandler(pool))
	r.Post("/api/v1/user/watchlist", api.UserWatchlistMutateHandler(pool))
	r.Get("/api/v1/user/faucet-state", api.UserFaucetStateHandler(ethCaller, reg))
	r.Post("/api/v1/user/faucet-relay", api.UserFaucetRelayHandler(cfg, faucetRelayer, reg))

	r.Get("/api/v1/markets", func(w http.ResponseWriter, r *http.Request) {
		q := dbqueries.New(pool)
		ctx := r.Context()
		rows, err := q.ListTemplatesWithLedger(ctx)
		if err != nil {
			http.Error(w, `{"error":"list markets"}`, http.StatusInternalServerError)
			return
		}
		hiddenRows, err := q.ListFrontendHidden(ctx)
		if err != nil {
			http.Error(w, `{"error":"list markets"}`, http.StatusInternalServerError)
			return
		}
		hidden := make(map[string]struct{}, len(hiddenRows))
		for _, h := range hiddenRows {
			hidden[hex.EncodeToString(h.TemplateID)] = struct{}{}
		}
		st, _ := q.GetIndexerState(ctx)

		projections, err := marketDataSvc.ListProjectionSnapshots(ctx)
		if err != nil {
			http.Error(w, `{"error":"list market projections"}`, http.StatusInternalServerError)
			return
		}

		out := make([]map[string]any, 0, len(rows))
		for _, row := range rows {
			tidKey := hex.EncodeToString(row.TemplateID)
			if _, ok := hidden[tidKey]; ok {
				continue
			}
			m := map[string]any{
				"templateId":        "0x" + hex.EncodeToString(row.TemplateID),
				"slug":              row.Slug,
				"marketType":        row.MarketType,
				"outcomeCount":      row.OutcomeCount,
				"initialized":       row.Initialized,
				"executionMode":     row.ExecutionMode,
				"rollingPhase":      row.RollingPhase,
				"rollingHaltReason": row.RollingHaltReason,
				"lastIndexedBlock":  st.LastBlock,
				"lastIndexedAt":     formatTime(st.LastIndexedAt),
				"published":         row.Initialized && row.ActiveEpochID.Valid,
			}
			if row.ActiveEpochID.Valid {
				m["activeEpochId"] = row.ActiveEpochID.Int64
			}
			if row.LastResolvedEpochID.Valid {
				m["lastResolvedEpochId"] = row.LastResolvedEpochID.Int64
			}
			if row.RollingNextEpochID.Valid {
				m["rollingNextEpochId"] = row.RollingNextEpochID.Int64
			}
			if row.HaltedAtEpochID.Valid {
				m["haltedAtEpochId"] = row.HaltedAtEpochID.Int64
			}
			if snap, ok := projections[tidKey]; ok {
				m["activeEpochId"] = snap.ActiveEpochID
				m["status"] = snap.Status
				m["epochStatus"] = snap.Status
				m["totalPool"] = snap.TotalPool
				m["volume"] = snap.Volume
				m["outcomeCount"] = snap.OutcomeCount
				m["outcomeViewBlock"] = snap.LastIndexedBlock
				m["lastIndexedBlock"] = snap.LastIndexedBlock
				m["lastIndexedAt"] = snap.UpdatedAt.UTC().Format(time.RFC3339)
				m["outcomes"] = snap.Outcomes
			}
			if meta, ok := boardCatalog.LookupTemplateBytes(row.TemplateID); ok {
				meta.Decorate(m)
				if outcomes, ok := m["outcomes"].([]map[string]any); ok {
					m["outcomes"] = launchboard.DecorateOutcomeRows(meta, outcomes)
				}
			}
			out = append(out, m)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"markets": out})
	})

	r.Get("/api/v1/markets/{templateId}", func(w http.ResponseWriter, r *http.Request) {
		raw := strings.TrimPrefix(chi.URLParam(r, "templateId"), "0x")
		b, err := hex.DecodeString(raw)
		if err != nil || len(b) != 32 {
			http.Error(w, `{"error":"invalid templateId"}`, http.StatusBadRequest)
			return
		}
		q := dbqueries.New(pool)
		ctx := r.Context()
		isHid, err := q.IsTemplateFrontendHidden(ctx, b)
		if err != nil {
			http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
			return
		}
		if isHid {
			http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
			return
		}
		row, err := q.GetTemplateLedgerEpoch(ctx, b)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
				return
			}
			http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
			return
		}
		st, _ := q.GetIndexerState(ctx)
		resp := map[string]any{
			"templateId":        "0x" + hex.EncodeToString(row.TemplateID),
			"slug":              row.Slug,
			"marketType":        row.MarketType,
			"outcomeCount":      row.OutcomeCount,
			"initialized":       row.Initialized,
			"executionMode":     row.ExecutionMode,
			"rollingPhase":      row.RollingPhase,
			"rollingHaltReason": row.RollingHaltReason,
			"lastIndexedBlock":  st.LastBlock,
			"lastIndexedAt":     formatTime(st.LastIndexedAt),
			"dataFreshness": map[string]any{
				"lastSyncAt":       formatTime(st.LastIndexedAt),
				"lastIndexedBlock": st.LastBlock,
			},
		}
		if row.ActiveEpochID.Valid {
			resp["activeEpochId"] = row.ActiveEpochID.Int64
			ep, err := q.GetEpoch(ctx, dbqueries.GetEpochParams{
				TemplateID: row.TemplateID,
				EpochID:    row.ActiveEpochID.Int64,
			})
			if err == nil {
				ae := map[string]any{
					"epochId":   ep.EpochID,
					"status":    ep.Status,
					"claimable": ep.Claimable,
					"refMode":   ep.RefMode,
				}
				if ep.OpenAt.Valid {
					ae["openAt"] = ep.OpenAt.Time.UTC().Format(time.RFC3339)
				}
				if ep.LockAt.Valid {
					ae["lockAt"] = ep.LockAt.Time.UTC().Format(time.RFC3339)
				}
				if ep.ResolveAt.Valid {
					ae["resolveAt"] = ep.ResolveAt.Time.UTC().Format(time.RFC3339)
				}
				if ep.WinningOutcomeMask.Valid {
					ae["winningOutcomeMask"] = ep.WinningOutcomeMask.Int32
				}
				resp["activeEpoch"] = ae
			}
			if snap, err := marketDataSvc.GetProjectionSnapshot(ctx, row.TemplateID); err == nil {
				resp["activeEpochId"] = snap.ActiveEpochID
				resp["status"] = snap.Status
				resp["epochStatus"] = snap.Status
				resp["totalPool"] = snap.TotalPool
				resp["volume"] = snap.Volume
				resp["outcomeCount"] = snap.OutcomeCount
				resp["outcomes"] = snap.Outcomes
				resp["outcomeViewBlock"] = snap.LastIndexedBlock
				resp["lastIndexedBlock"] = snap.LastIndexedBlock
				resp["lastIndexedAt"] = snap.UpdatedAt.UTC().Format(time.RFC3339)
				resp["dataFreshness"] = map[string]any{
					"lastSyncAt":       snap.UpdatedAt.UTC().Format(time.RFC3339),
					"lastIndexedBlock": snap.LastIndexedBlock,
				}
				if outcomes, ok := resp["outcomes"].([]map[string]any); ok {
					if meta, ok := boardCatalog.LookupTemplateBytes(row.TemplateID); ok {
						resp["outcomes"] = launchboard.DecorateOutcomeRows(meta, outcomes)
					}
				}
			} else if !errors.Is(err, pgx.ErrNoRows) {
				http.Error(w, `{"error":"market projection"}`, http.StatusInternalServerError)
				return
			}
		}
		if row.LastResolvedEpochID.Valid {
			resp["lastResolvedEpochId"] = row.LastResolvedEpochID.Int64
		}
		if meta, ok := boardCatalog.LookupTemplateBytes(row.TemplateID); ok {
			meta.Decorate(resp)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	})

	r.Get("/api/v1/markets/{templateId}/chart", api.ChartHandler(pool))

	r.Get("/api/v1/markets/{templateId}/epochs", func(w http.ResponseWriter, r *http.Request) {
		raw := strings.TrimPrefix(chi.URLParam(r, "templateId"), "0x")
		b, err := hex.DecodeString(raw)
		if err != nil || len(b) != 32 {
			http.Error(w, `{"error":"invalid templateId"}`, http.StatusBadRequest)
			return
		}
		q := dbqueries.New(pool)
		ctx := r.Context()
		isHid, err := q.IsTemplateFrontendHidden(ctx, b)
		if err != nil {
			http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
			return
		}
		if isHid {
			http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
			return
		}
		limit := int32(100)
		if ls := r.URL.Query().Get("limit"); ls != "" {
			if n, err := strconv.ParseInt(ls, 10, 32); err == nil && n > 0 && n <= 500 {
				limit = int32(n)
			}
		}
		rows, err := q.ListEpochsByTemplate(ctx, dbqueries.ListEpochsByTemplateParams{
			TemplateID: b,
			Limit:      limit,
		})
		if err != nil {
			http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
			return
		}
		out := make([]map[string]any, 0, len(rows))
		for _, row := range rows {
			m := map[string]any{
				"templateId": "0x" + hex.EncodeToString(row.TemplateID),
				"epochId":    row.EpochID,
				"status":     row.Status,
				"claimable":  row.Claimable,
				"refMode":    row.RefMode,
				"updatedAt":  formatTime(row.UpdatedAt),
			}
			if row.OpenAt.Valid {
				m["openAt"] = row.OpenAt.Time.UTC().Format(time.RFC3339)
			}
			if row.LockAt.Valid {
				m["lockAt"] = row.LockAt.Time.UTC().Format(time.RFC3339)
			}
			if row.ResolveAt.Valid {
				m["resolveAt"] = row.ResolveAt.Time.UTC().Format(time.RFC3339)
			}
			if row.WinningOutcomeMask.Valid {
				m["winningOutcomeMask"] = row.WinningOutcomeMask.Int32
			}
			out = append(out, m)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"epochs": out})
	})

	r.Get("/api/v1/markets/{templateId}/epochs/{epochId}/outcomes", func(w http.ResponseWriter, r *http.Request) {
		raw := strings.TrimPrefix(chi.URLParam(r, "templateId"), "0x")
		b, err := hex.DecodeString(raw)
		if err != nil || len(b) != 32 {
			http.Error(w, `{"error":"invalid templateId"}`, http.StatusBadRequest)
			return
		}
		eid, err := strconv.ParseUint(chi.URLParam(r, "epochId"), 10, 64)
		if err != nil {
			http.Error(w, `{"error":"invalid epochId"}`, http.StatusBadRequest)
			return
		}
		q := dbqueries.New(pool)
		isHid, err := q.IsTemplateFrontendHidden(r.Context(), b)
		if err != nil {
			http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
			return
		}
		if isHid {
			http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
			return
		}
		if r.URL.Query().Get("source") != "live" {
			outcomes, blockNum, err := marketDataSvc.LoadProjectionOutcomes(r.Context(), b, int64(eid))
			if err != nil {
				http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			if meta, ok := boardCatalog.LookupTemplateBytes(b); ok {
				outcomes = launchboard.DecorateOutcomeRows(meta, outcomes)
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"source":      "projection",
				"templateId":  "0x" + hex.EncodeToString(b),
				"epochId":     eid,
				"blockNumber": blockNum,
				"outcomes":    outcomes,
			})
			return
		}
		if ethCaller == nil {
			http.Error(w, `{"error":"eth client unavailable"}`, http.StatusServiceUnavailable)
			return
		}
		ctx, cancel := apiLiveRPCContext(r)
		defer cancel()
		outcomes, blockNum, err := ethCaller.GetOutcomeViews(
			ctx,
			common.HexToAddress(reg.Contracts.MarketEngineProxy),
			common.BytesToHash(b),
			eid,
		)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadGateway)
			_ = json.NewEncoder(w).Encode(map[string]any{"error": "live_rpc_call_failed", "message": err.Error()})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		if meta, ok := boardCatalog.LookupTemplateBytes(b); ok {
			outcomes = launchboard.DecorateOutcomeRows(meta, outcomes)
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"source":            "live",
			"chainId":           reg.ChainID,
			"blockNumber":       blockNum,
			"marketEngineProxy": reg.Contracts.MarketEngineProxy,
			"templateId":        "0x" + hex.EncodeToString(b),
			"epochId":           eid,
			"outcomes":          outcomes,
		})
	})

	r.Get("/api/v1/markets/{templateId}/probability-history", func(w http.ResponseWriter, r *http.Request) {
		raw := strings.TrimPrefix(chi.URLParam(r, "templateId"), "0x")
		b, err := hex.DecodeString(raw)
		if err != nil || len(b) != 32 {
			http.Error(w, `{"error":"invalid templateId"}`, http.StatusBadRequest)
			return
		}
		q := dbqueries.New(pool)
		row, err := q.GetTemplateLedgerEpoch(r.Context(), b)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
				return
			}
			http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
			return
		}
		epochID := row.ActiveEpochID.Int64
		if es := r.URL.Query().Get("epochId"); es != "" {
			if parsed, err := strconv.ParseInt(es, 10, 64); err == nil && parsed >= 0 {
				epochID = parsed
			} else {
				http.Error(w, `{"error":"invalid epochId"}`, http.StatusBadRequest)
				return
			}
		}
		if epochID <= 0 {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]any{
				"templateId": "0x" + hex.EncodeToString(b),
				"epochId":    epochID,
				"points":     []any{},
				"source":     "indexed-events",
			})
			return
		}
		maxEvents := int32(5000)
		if me := r.URL.Query().Get("maxEvents"); me != "" {
			if n, err := strconv.ParseInt(me, 10, 32); err == nil && n > 0 && n <= 10000 {
				maxEvents = int32(n)
			} else {
				http.Error(w, `{"error":"invalid maxEvents"}`, http.StatusBadRequest)
				return
			}
		} else if ls := r.URL.Query().Get("limit"); ls != "" {
			if n, err := strconv.ParseInt(ls, 10, 32); err == nil && n > 0 && n <= 1000 {
				maxEvents = int32(n)
			}
		}
		var minIndexedAt *time.Time
		if ms := r.URL.Query().Get("minIndexedAt"); ms != "" {
			tm, err := time.Parse(time.RFC3339, ms)
			if err != nil {
				http.Error(w, `{"error":"invalid minIndexedAt"}`, http.StatusBadRequest)
				return
			}
			u := tm.UTC()
			minIndexedAt = &u
		}
		phr, err := probabilityHistoryFromPoints(r.Context(), pool, b, epochID, maxEvents, minIndexedAt)
		if err != nil {
			http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"templateId":   "0x" + hex.EncodeToString(b),
			"epochId":      epochID,
			"outcomeCount": row.OutcomeCount,
			"points":       phr.Points,
			"source":       "probability_points",
			"truncated":    phr.Truncated,
			"eventCount":   phr.EventCount,
			"maxEvents":    maxEvents,
		})
	})

	r.Get("/api/v1/user/{address}/events", func(w http.ResponseWriter, r *http.Request) {
		addr := chi.URLParam(r, "address")
		if !strings.HasPrefix(addr, "0x") || len(addr) != 42 {
			http.Error(w, `{"error":"invalid address"}`, http.StatusBadRequest)
			return
		}
		if !api.WalletAuthorized(r, addr, cfg.AuthJWTSecret) {
			api.WriteAPIError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "sign in required", nil)
			return
		}
		limit := int32(100)
		if ls := r.URL.Query().Get("limit"); ls != "" {
			if n, err := strconv.ParseInt(ls, 10, 32); err == nil && n > 0 && n <= 500 {
				limit = int32(n)
			}
		}
		rows, err := dbqueries.New(pool).ListUserChainEvents(r.Context(), dbqueries.ListUserChainEventsParams{
			UserAddress: addr,
			RowLimit:    limit,
		})
		if err != nil {
			http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
			return
		}
		api.WriteUserEventsResponse(w, rows)
	})

	r.Get("/ws", func(w http.ResponseWriter, r *http.Request) {
		upgrader := newWSUpgrader(cfg.WSAllowedOrigins)
		c, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		defer c.Close()
		c.SetReadLimit(4096)
		client := hub.Subscribe()
		defer hub.Unsubscribe(client)
		var writeMu sync.Mutex
		principal, principalErr := api.PrincipalFromRequest(r, cfg.AuthJWTSecret)
		isAuthed := principalErr == nil && principal != nil

		lastSeq := int64(0)
		if raw := r.URL.Query().Get("lastSeq"); raw != "" {
			if n, err := strconv.ParseInt(raw, 10, 64); err == nil && n > 0 {
				lastSeq = n
			}
		}
		writeMu.Lock()
		_ = c.WriteJSON(map[string]any{"type": "hello", "channel": "system", "ts": time.Now().UTC().Format(time.RFC3339)})
		writeMu.Unlock()
		done := make(chan struct{})
		go func() {
			defer close(done)
			subscribeCount := 0
			subscribeWindowStart := time.Now()
			for {
				var msg struct {
					Type            string           `json:"type"`
					Channels        []string         `json:"channels"`
					LastSeq         int64            `json:"lastSeq"`
					CursorByChannel map[string]int64 `json:"cursorByChannel"`
				}
				if err := c.ReadJSON(&msg); err != nil {
					return
				}
				switch msg.Type {
				case "subscribe":
					now := time.Now()
					if now.Sub(subscribeWindowStart) >= time.Minute {
						subscribeWindowStart = now
						subscribeCount = 0
					}
					subscribeCount++
					if subscribeCount > 30 {
						writeMu.Lock()
						_ = c.WriteJSON(map[string]any{"type": "error", "error": map[string]any{"code": "RATE_LIMITED", "message": "too many subscribe messages"}})
						writeMu.Unlock()
						return
					}
					if len(client.Subscriptions())+len(msg.Channels) > 50 {
						writeMu.Lock()
						_ = c.WriteJSON(map[string]any{"type": "error", "error": map[string]any{"code": "CHANNEL_LIMIT", "message": "max 50 channels"}})
						writeMu.Unlock()
						continue
					}
					accepted := make([]string, 0, len(msg.Channels))
					for _, channel := range msg.Channels {
						if websocketChannelAllowed(r.Context(), pool, channel, principal, isAuthed) {
							client.Subscribe(channel)
							accepted = append(accepted, channel)
						}
					}
					if lastSeq > 0 && len(accepted) > 0 {
						writeMu.Lock()
						err := replayRealtimeEvents(r.Context(), pool, c, lastSeq, 500, accepted)
						writeMu.Unlock()
						if err != nil {
							writeMu.Lock()
							_ = c.WriteJSON(map[string]any{"type": "resync_required", "channel": "system", "lastSeq": lastSeq})
							writeMu.Unlock()
						}
					}
					for _, channel := range accepted {
						afterSeq := msg.CursorByChannel[channel]
						if afterSeq <= 0 {
							continue
						}
						writeMu.Lock()
						err := replayRealtimeEvents(r.Context(), pool, c, afterSeq, 500, []string{channel})
						writeMu.Unlock()
						if err != nil {
							writeMu.Lock()
							_ = c.WriteJSON(map[string]any{"type": "resync_required", "channel": channel, "lastSeq": afterSeq})
							writeMu.Unlock()
						}
					}
					writeMu.Lock()
					_ = c.WriteJSON(map[string]any{"type": "subscribed", "channels": accepted})
					writeMu.Unlock()
				case "unsubscribe":
					for _, channel := range msg.Channels {
						client.Unsubscribe(channel)
					}
					writeMu.Lock()
					_ = c.WriteJSON(map[string]any{"type": "unsubscribed", "channels": msg.Channels})
					writeMu.Unlock()
				case "resume":
					if msg.LastSeq > 0 {
						channels := client.Subscriptions()
						writeMu.Lock()
						err := replayRealtimeEvents(r.Context(), pool, c, msg.LastSeq, 500, channels)
						writeMu.Unlock()
						if err != nil {
							writeMu.Lock()
							_ = c.WriteJSON(map[string]any{"type": "resync_required", "channel": "global", "reason": "SEQUENCE_GAP"})
							writeMu.Unlock()
						}
					}
					for channel, seq := range msg.CursorByChannel {
						if seq <= 0 {
							continue
						}
						writeMu.Lock()
						err := replayRealtimeEvents(r.Context(), pool, c, seq, 500, []string{channel})
						writeMu.Unlock()
						if err != nil {
							writeMu.Lock()
							_ = c.WriteJSON(map[string]any{"type": "resync_required", "channel": channel, "reason": "SEQUENCE_GAP"})
							writeMu.Unlock()
						}
					}
				case "ping":
					writeMu.Lock()
					_ = c.WriteJSON(map[string]any{"type": "pong", "ts": time.Now().UTC().Format(time.RFC3339)})
					writeMu.Unlock()
				}
			}
		}()

		ticker := time.NewTicker(25 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-done:
				return
			case <-ticker.C:
				writeMu.Lock()
				if err := c.WriteControl(websocket.PingMessage, []byte("ping"), time.Now().Add(5*time.Second)); err != nil {
					writeMu.Unlock()
					return
				}
				writeMu.Unlock()
			case msg, ok := <-client.C:
				if !ok {
					return
				}
				writeMu.Lock()
				if err := c.WriteMessage(websocket.TextMessage, msg); err != nil {
					writeMu.Unlock()
					return
				}
				writeMu.Unlock()
			}
		}
	})

	srv := &http.Server{Addr: fmt.Sprintf(":%d", cfg.HTTPPort), Handler: r}
	go func() {
		log.Info("api listening", "addr", srv.Addr)
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

func formatTime(t pgtype.Timestamptz) any {
	if !t.Valid {
		return nil
	}
	return t.Time.UTC().Format(time.RFC3339)
}

type marketProjectionSnapshot struct {
	TemplateID       []byte
	ActiveEpochID    int64
	Status           string
	TotalPool        string
	Volume           string
	OutcomeCount     int16
	LastIndexedBlock int64
	UpdatedAt        time.Time
	Outcomes         []map[string]any
}

func loadMarketSnapshots(ctx context.Context, pool *pgxpool.Pool) (map[string]marketProjectionSnapshot, error) {
	rows, err := pool.Query(ctx, `
SELECT template_id, active_epoch_id, status, total_pool::text, volume::text, outcome_count, last_indexed_block, updated_at
FROM market_snapshots
`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]marketProjectionSnapshot{}
	for rows.Next() {
		var snap marketProjectionSnapshot
		if err := rows.Scan(&snap.TemplateID, &snap.ActiveEpochID, &snap.Status, &snap.TotalPool, &snap.Volume, &snap.OutcomeCount, &snap.LastIndexedBlock, &snap.UpdatedAt); err != nil {
			return nil, err
		}
		outcomes, _, err := loadMarketOutcomes(ctx, pool, snap.TemplateID, snap.ActiveEpochID)
		if err != nil {
			return nil, err
		}
		snap.Outcomes = outcomes
		out[hex.EncodeToString(snap.TemplateID)] = snap
	}
	return out, rows.Err()
}

func loadMarketSnapshot(ctx context.Context, pool *pgxpool.Pool, templateID []byte) (marketProjectionSnapshot, error) {
	var snap marketProjectionSnapshot
	err := pool.QueryRow(ctx, `
SELECT template_id, active_epoch_id, status, total_pool::text, volume::text, outcome_count, last_indexed_block, updated_at
FROM market_snapshots
WHERE template_id = $1
`, templateID).Scan(&snap.TemplateID, &snap.ActiveEpochID, &snap.Status, &snap.TotalPool, &snap.Volume, &snap.OutcomeCount, &snap.LastIndexedBlock, &snap.UpdatedAt)
	if err != nil {
		return snap, err
	}
	outcomes, _, err := loadMarketOutcomes(ctx, pool, snap.TemplateID, snap.ActiveEpochID)
	if err != nil {
		return snap, err
	}
	snap.Outcomes = outcomes
	return snap, nil
}

func loadMarketOutcomes(ctx context.Context, pool *pgxpool.Pool, templateID []byte, epochID int64) ([]map[string]any, int64, error) {
	rows, err := pool.Query(ctx, `
SELECT outcome_index, pool_amount::text, probability_bps, multiplier_bps, updated_block
FROM market_epoch_outcomes
WHERE template_id = $1 AND epoch_id = $2
ORDER BY outcome_index
`, templateID, epochID)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	outcomes := []map[string]any{}
	var maxBlock int64
	for rows.Next() {
		var idx int16
		var amount string
		var prob, mult int32
		var updatedBlock int64
		if err := rows.Scan(&idx, &amount, &prob, &mult, &updatedBlock); err != nil {
			return nil, 0, err
		}
		if updatedBlock > maxBlock {
			maxBlock = updatedBlock
		}
		outcomes = append(outcomes, map[string]any{
			"outcomeIndex":         idx,
			"poolSize":             amount,
			"impliedProbabilityE6": fmt.Sprintf("%d", prob*100),
			"displayPercentE4":     fmt.Sprintf("%d", prob),
			"multiplierBps":        fmt.Sprintf("%d", mult),
			"grossPayoutXe6":       fmt.Sprintf("%d", mult*100),
			"updatedBlock":         updatedBlock,
		})
	}
	return outcomes, maxBlock, rows.Err()
}

func replayRealtimeEvents(ctx context.Context, pool *pgxpool.Pool, c *websocket.Conn, afterSeq int64, limit int32, allowedChannels []string) error {
	events, err := realtime.LoadEnvelopesAfter(ctx, pool, afterSeq, limit, allowedChannels)
	if err != nil {
		return err
	}
	for _, env := range events {
		msg, err := json.Marshal(env)
		if err != nil {
			return err
		}
		if err := c.WriteMessage(websocket.TextMessage, msg); err != nil {
			return err
		}
	}
	return nil
}

func websocketChannelAllowed(ctx context.Context, pool *pgxpool.Pool, channel string, principal *api.Principal, isAuthed bool) bool {
	channel = strings.ToLower(strings.TrimSpace(channel))
	switch {
	case channel == "global:markets":
		return true
	case strings.HasPrefix(channel, "market:"):
		return true
	case strings.HasPrefix(channel, "epoch:"):
		return true
	case strings.HasPrefix(channel, "oracle:"):
		return true
	case strings.HasPrefix(channel, "chart:"):
		return true
	case strings.HasPrefix(channel, "user:"):
		if !isAuthed || principal == nil {
			return false
		}
		return channel == "user:"+strings.ToLower(strings.TrimSpace(principal.Wallet))
	case strings.HasPrefix(channel, "deposit:"):
		if !isAuthed || principal == nil {
			return false
		}
		intentID := strings.TrimPrefix(channel, "deposit:")
		var owner string
		err := pool.QueryRow(ctx, `SELECT user_address FROM funding_intents WHERE id::text = $1`, intentID).Scan(&owner)
		return err == nil && strings.EqualFold(owner, principal.Wallet)
	case strings.HasPrefix(channel, "ops:"):
		return isAuthed && principal != nil && principal.IsOperator
	case strings.HasPrefix(channel, "reward:"):
		if !isAuthed || principal == nil {
			return false
		}
		return channel == "reward:"+strings.ToLower(strings.TrimSpace(principal.Wallet))
	case strings.HasPrefix(channel, "referral:"):
		if !isAuthed || principal == nil {
			return false
		}
		return channel == "referral:"+strings.ToLower(strings.TrimSpace(principal.Wallet))
	case channel == "impact:gooddollar":
		return true
	default:
		return false
	}
}

func newWSUpgrader(allowed []string) websocket.Upgrader {
	return websocket.Upgrader{
		CheckOrigin: buildWSOriginChecker(allowed),
	}
}

func buildWSOriginChecker(allowed []string) func(r *http.Request) bool {
	allowedSet := map[string]struct{}{}
	for _, origin := range allowed {
		o := strings.TrimSpace(strings.ToLower(origin))
		if o != "" {
			allowedSet[o] = struct{}{}
		}
	}
	return func(r *http.Request) bool {
		origin := strings.ToLower(strings.TrimSpace(r.Header.Get("Origin")))
		if origin == "" {
			return false
		}
		if len(allowedSet) == 0 {
			u, err := url.Parse(origin)
			if err != nil {
				return false
			}
			switch strings.ToLower(strings.TrimSpace(u.Hostname())) {
			case "localhost", "127.0.0.1", "::1":
				return true
			default:
				return false
			}
		}
		_, ok := allowedSet[origin]
		return ok
	}
}

func apiLiveRPCContext(r *http.Request) (context.Context, context.CancelFunc) {
	return context.WithTimeout(r.Context(), 12*time.Second)
}

type probabilityHistoryReplayResult struct {
	Points     []map[string]any
	Truncated  bool
	EventCount int64
}

var probabilityHistoryEventNames = []string{
	"EpochOpened",
	"PositionDeposited",
	"SideSwitched",
	"EpochLocked",
	"EpochResolved",
	"EpochResolvedV2",
	"EpochCancelled",
}

func probabilityHistoryFromEvents(
	ctx context.Context,
	pool interface {
		Query(context.Context, string, ...interface{}) (pgx.Rows, error)
		QueryRow(context.Context, string, ...interface{}) pgx.Row
	},
	templateID []byte,
	epochID int64,
	outcomeCount int,
	maxEvents int32,
	minIndexedAt *time.Time,
) (probabilityHistoryReplayResult, error) {
	empty := probabilityHistoryReplayResult{Points: []map[string]any{}}
	if outcomeCount < 2 {
		outcomeCount = 2
	}
	if outcomeCount > 8 {
		outcomeCount = 8
	}
	if maxEvents < 1 {
		maxEvents = 1
	}

	var eventCount int64
	err := pool.QueryRow(ctx, `
SELECT COUNT(*)::bigint
FROM chain_events
WHERE template_id = $1
  AND epoch_id = $2
  AND event_name = ANY($3)
`, templateID, epochID, probabilityHistoryEventNames).Scan(&eventCount)
	if err != nil {
		return empty, err
	}

	skip := int64(0)
	truncated := false
	if eventCount > int64(maxEvents) {
		skip = eventCount - int64(maxEvents)
		truncated = true
	}

	rows, err := pool.Query(ctx, `
SELECT block_number, tx_hash, log_index, event_name, payload, indexed_at
FROM chain_events
WHERE template_id = $1
  AND epoch_id = $2
  AND event_name = ANY($3)
ORDER BY block_number ASC, log_index ASC
`, templateID, epochID, probabilityHistoryEventNames)
	if err != nil {
		return empty, err
	}
	defer rows.Close()

	pools := make([]*big.Int, outcomeCount)
	for i := range pools {
		pools[i] = new(big.Int)
	}
	outcomeCountLimit := int64(outcomeCount)
	points := make([]map[string]any, 0, maxEvents)
	var seen int64
	for rows.Next() {
		var blockNumber int64
		var txHash string
		var logIndex int32
		var eventName string
		var payloadBytes []byte
		var indexedAt pgtype.Timestamptz
		if err := rows.Scan(&blockNumber, &txHash, &logIndex, &eventName, &payloadBytes, &indexedAt); err != nil {
			return empty, err
		}
		var payload map[string]any
		_ = json.Unmarshal(payloadBytes, &payload)

		switch eventName {
		case "PositionDeposited":
			oi, ok0 := jsonInt(payload["outcomeIndex"])
			amount, ok1 := jsonBig(payload["amount"])
			if ok0 && ok1 && oi >= 0 && oi < outcomeCountLimit {
				idx := int(oi)
				pools[idx].Add(pools[idx], amount)
			}
		case "SideSwitched":
			from, ok0 := jsonInt(payload["fromOutcome"])
			to, ok1 := jsonInt(payload["toOutcome"])
			gross, ok2 := jsonBig(payload["grossAmount"])
			net, ok3 := jsonBig(payload["netAmount"])
			if ok0 && ok1 && ok2 && ok3 && from >= 0 && from < outcomeCountLimit && to >= 0 && to < outcomeCountLimit {
				fromIdx := int(from)
				toIdx := int(to)
				pools[fromIdx].Sub(pools[fromIdx], gross)
				if pools[fromIdx].Sign() < 0 {
					pools[fromIdx].SetInt64(0)
				}
				pools[toIdx].Add(pools[toIdx], net)
			}
		}

		seen++
		emit := seen > skip
		if emit && minIndexedAt != nil {
			if !indexedAt.Valid || indexedAt.Time.Before(*minIndexedAt) {
				emit = false
			}
		}
		if !emit {
			continue
		}

		total := new(big.Int)
		for _, p := range pools {
			total.Add(total, p)
		}
		probs := make([]map[string]any, outcomeCount)
		for i, p := range pools {
			probE6 := new(big.Int)
			if total.Sign() > 0 && p.Sign() > 0 {
				probE6.Mul(p, big.NewInt(1_000_000))
				probE6.Div(probE6, total)
			}
			probs[i] = map[string]any{
				"outcomeIndex":         i,
				"poolSize":             p.String(),
				"impliedProbabilityE6": probE6.String(),
			}
		}
		points = append(points, map[string]any{
			"blockNumber": blockNumber,
			"txHash":      txHash,
			"logIndex":    logIndex,
			"eventName":   eventName,
			"indexedAt":   formatTime(indexedAt),
			"totalPool":   total.String(),
			"outcomes":    probs,
		})
	}
	if err := rows.Err(); err != nil {
		return empty, err
	}
	return probabilityHistoryReplayResult{
		Points:     points,
		Truncated:  truncated,
		EventCount: eventCount,
	}, nil
}

func probabilityHistoryFromPoints(
	ctx context.Context,
	pool interface {
		Query(context.Context, string, ...interface{}) (pgx.Rows, error)
		QueryRow(context.Context, string, ...interface{}) pgx.Row
	},
	templateID []byte,
	epochID int64,
	maxEvents int32,
	minIndexedAt *time.Time,
) (probabilityHistoryReplayResult, error) {
	empty := probabilityHistoryReplayResult{Points: []map[string]any{}}
	if maxEvents < 1 {
		maxEvents = 1
	}

	var eventCount int64
	err := pool.QueryRow(ctx, `
SELECT COUNT(DISTINCT seq)::bigint
FROM probability_points
WHERE template_id = $1
  AND epoch_id = $2
`, templateID, epochID).Scan(&eventCount)
	if err != nil {
		return empty, err
	}

	skip := int64(0)
	truncated := false
	if eventCount > int64(maxEvents) {
		skip = eventCount - int64(maxEvents)
		truncated = true
	}

	rows, err := pool.Query(ctx, `
SELECT seq, outcome_index, block_number, tx_hash, log_index, probability_bps, pool_amount::text, total_pool::text, indexed_at
FROM probability_points
WHERE template_id = $1
  AND epoch_id = $2
ORDER BY seq ASC, outcome_index ASC
`, templateID, epochID)
	if err != nil {
		return empty, err
	}
	defer rows.Close()

	points := make([]map[string]any, 0, maxEvents)
	var currentSeq int64 = -1
	var current map[string]any
	var currentOutcomes []map[string]any
	var seen int64
	flush := func() {
		if current == nil {
			return
		}
		current["outcomes"] = currentOutcomes
		points = append(points, current)
	}

	for rows.Next() {
		var seq int64
		var outcomeIndex int16
		var blockNumber int64
		var txHash pgtype.Text
		var logIndex pgtype.Int4
		var probabilityBps int32
		var poolAmount, totalPool string
		var indexedAt pgtype.Timestamptz
		if err := rows.Scan(&seq, &outcomeIndex, &blockNumber, &txHash, &logIndex, &probabilityBps, &poolAmount, &totalPool, &indexedAt); err != nil {
			return empty, err
		}
		if seq != currentSeq {
			if current != nil {
				flush()
			}
			seen++
			currentSeq = seq
			current = nil
			currentOutcomes = nil
			if seen <= skip {
				continue
			}
			if minIndexedAt != nil && indexedAt.Valid && indexedAt.Time.Before(*minIndexedAt) {
				continue
			}
			current = map[string]any{
				"blockNumber": blockNumber,
				"txHash":      txHash.String,
				"logIndex":    logIndex.Int32,
				"eventName":   "probability_update",
				"indexedAt":   formatTime(indexedAt),
				"totalPool":   totalPool,
			}
		}
		if current == nil {
			continue
		}
		currentOutcomes = append(currentOutcomes, map[string]any{
			"outcomeIndex":         outcomeIndex,
			"poolSize":             poolAmount,
			"impliedProbabilityE6": fmt.Sprintf("%d", probabilityBps*100),
		})
	}
	if err := rows.Err(); err != nil {
		return empty, err
	}
	if current != nil {
		flush()
	}
	return probabilityHistoryReplayResult{
		Points:     points,
		Truncated:  truncated,
		EventCount: eventCount,
	}, nil
}

func jsonBig(v any) (*big.Int, bool) {
	switch x := v.(type) {
	case string:
		n, ok := new(big.Int).SetString(x, 10)
		return n, ok
	case float64:
		if x < 0 {
			return nil, false
		}
		return big.NewInt(int64(x)), true
	case json.Number:
		n, ok := new(big.Int).SetString(x.String(), 10)
		return n, ok
	default:
		return nil, false
	}
}

func jsonInt(v any) (int64, bool) {
	switch x := v.(type) {
	case float64:
		return int64(x), true
	case string:
		n, err := strconv.ParseInt(x, 10, 64)
		return n, err == nil
	case json.Number:
		n, err := x.Int64()
		return n, err == nil
	default:
		return 0, false
	}
}
