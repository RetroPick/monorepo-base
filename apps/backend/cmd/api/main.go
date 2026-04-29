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
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"retropick/apps/backend/internal/api"
	"retropick/apps/backend/internal/config"
	"retropick/apps/backend/internal/db"
	"retropick/apps/backend/internal/dbqueries"
	"retropick/apps/backend/internal/ethops"
	"retropick/apps/backend/internal/pglisten"
	"retropick/apps/backend/internal/registry"
	"retropick/apps/backend/internal/wshub"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

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

	ethCaller, err := ethops.NewCaller(cfg.RPCURL)
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

	hub := wshub.NewHub()
	go func() {
		if err := pglisten.Run(ctx, cfg.DatabaseURL, hub, log); err != nil && ctx.Err() == nil {
			log.Error("pg listen stopped", "err", err)
		}
	}()

	r := chi.NewRouter()
	// CORS: see internal/api/cors.go — non-strict mode allows any localhost / 127.0.0.1 http port
	// (ops may bind 3001–3030). Set CORS_STRICT=1 in production; use CORS_ALLOWED_ORIGINS for extra domains.
	r.Use(cors.Handler(cors.Options{
		AllowOriginFunc:  api.BuildCORSAllowOriginFunc(),
		AllowedMethods:   []string{"GET", "HEAD", "OPTIONS", "POST"},
		AllowedHeaders:   []string{"Accept", "Content-Type"},
		AllowCredentials: false,
	}))
	r.Use(middleware.RequestID, middleware.RealIP, middleware.Logger, middleware.Recoverer, middleware.Timeout(60*time.Second))

	api.RegisterHealthRoutes(r, pool, ethCaller, reg, api.BuildInfo{
		Version: cfg.BuildVersion,
		Commit:  cfg.BuildCommit,
		Time:    cfg.BuildTime,
		ABIHash: api.ABIHash(),
	})

	r.Get("/api/v1/config/contracts", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(reg)
	})

	r.Mount("/api/v1/ops", api.OpsRouter(pool, reg, ethCaller))

	r.Get("/api/v1/user/positions", api.UserPositionsHandler(pool, ethCaller, reg))
	r.Get("/api/v1/user/claims", api.UserClaimsHandler(pool))
	r.Get("/api/v1/user/faucet-state", api.UserFaucetStateHandler(ethCaller, reg))

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
		out := make([]map[string]any, 0, len(rows))
		for _, row := range rows {
			if _, ok := hidden[hex.EncodeToString(row.TemplateID)]; ok {
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
			if ethCaller != nil {
				tid := common.BytesToHash(row.TemplateID)
				proxy := common.HexToAddress(reg.Contracts.MarketEngineProxy)
				rpcCtx, cancel := apiLiveRPCContext(r)
				outcomes, blockNum, err := ethCaller.GetOutcomeViews(rpcCtx, proxy, tid, uint64(row.ActiveEpochID.Int64))
				cancel()
				if err == nil {
					resp["outcomes"] = outcomes
					resp["outcomeViewBlock"] = blockNum
				} else {
					resp["outcomesError"] = err.Error()
				}
			}
		}
		if row.LastResolvedEpochID.Valid {
			resp["lastResolvedEpochId"] = row.LastResolvedEpochID.Int64
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	})

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
		if ethCaller == nil {
			http.Error(w, `{"error":"eth client unavailable"}`, http.StatusServiceUnavailable)
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
		limit := int32(200)
		if ls := r.URL.Query().Get("limit"); ls != "" {
			if n, err := strconv.ParseInt(ls, 10, 32); err == nil && n > 0 && n <= 1000 {
				limit = int32(n)
			}
		}
		points, err := probabilityHistoryFromEvents(r.Context(), pool, b, epochID, int(row.OutcomeCount), limit)
		if err != nil {
			http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"templateId":   "0x" + hex.EncodeToString(b),
			"epochId":      epochID,
			"outcomeCount": row.OutcomeCount,
			"points":       points,
			"source":       "indexed-events",
		})
	})

	r.Get("/api/v1/user/{address}/events", func(w http.ResponseWriter, r *http.Request) {
		addr := chi.URLParam(r, "address")
		if !strings.HasPrefix(addr, "0x") || len(addr) != 42 {
			http.Error(w, `{"error":"invalid address"}`, http.StatusBadRequest)
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
			Limit:       limit,
		})
		if err != nil {
			http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
			return
		}
		out := make([]map[string]any, 0, len(rows))
		for _, row := range rows {
			m := map[string]any{
				"id":           row.ID,
				"blockNumber":  row.BlockNumber,
				"txHash":       row.TxHash,
				"logIndex":     row.LogIndex,
				"contractAddr": row.ContractAddr,
				"eventName":    row.EventName,
				"indexedAt":    formatTime(row.IndexedAt),
			}
			if len(row.TemplateID) == 32 {
				m["templateId"] = "0x" + hex.EncodeToString(row.TemplateID)
			}
			if row.EpochID.Valid {
				m["epochId"] = row.EpochID.Int64
			}
			if row.UserAddress.Valid {
				m["userAddress"] = row.UserAddress.String
			}
			if len(row.Payload) > 0 {
				var payload any
				if err := json.Unmarshal(row.Payload, &payload); err == nil {
					m["payload"] = payload
				}
			}
			out = append(out, m)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"events": out})
	})

	r.Get("/ws", func(w http.ResponseWriter, r *http.Request) {
		c, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		defer c.Close()
		ch := hub.Subscribe()
		defer hub.Unsubscribe(ch)
		_ = c.WriteJSON(map[string]any{"type": "hello", "ts": time.Now().UTC().Format(time.RFC3339)})
		for {
			select {
			case <-ctx.Done():
				return
			case msg, ok := <-ch:
				if !ok {
					return
				}
				if err := c.WriteMessage(websocket.TextMessage, msg); err != nil {
					return
				}
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

func apiLiveRPCContext(r *http.Request) (context.Context, context.CancelFunc) {
	return context.WithTimeout(r.Context(), 12*time.Second)
}

func probabilityHistoryFromEvents(
	ctx context.Context,
	pool interface {
		Query(context.Context, string, ...interface{}) (pgx.Rows, error)
	},
	templateID []byte,
	epochID int64,
	outcomeCount int,
	limit int32,
) ([]map[string]any, error) {
	if outcomeCount < 2 {
		outcomeCount = 2
	}
	if outcomeCount > 8 {
		outcomeCount = 8
	}
	rows, err := pool.Query(ctx, `
SELECT block_number, tx_hash, log_index, event_name, payload, indexed_at
FROM chain_events
WHERE template_id = $1
  AND epoch_id = $2
  AND event_name IN ('EpochOpened', 'PositionDeposited', 'SideSwitched', 'EpochLocked', 'EpochResolved', 'EpochResolvedV2', 'EpochCancelled')
ORDER BY block_number ASC, log_index ASC
LIMIT $3
`, templateID, epochID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	pools := make([]*big.Int, outcomeCount)
	for i := range pools {
		pools[i] = new(big.Int)
	}
	outcomeCountLimit := int64(outcomeCount)
	points := make([]map[string]any, 0)
	for rows.Next() {
		var blockNumber int64
		var txHash string
		var logIndex int32
		var eventName string
		var payloadBytes []byte
		var indexedAt pgtype.Timestamptz
		if err := rows.Scan(&blockNumber, &txHash, &logIndex, &eventName, &payloadBytes, &indexedAt); err != nil {
			return nil, err
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
		return nil, err
	}
	return points, nil
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
