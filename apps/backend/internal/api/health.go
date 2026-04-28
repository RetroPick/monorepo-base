package api

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/dbqueries"
	"retropick/apps/backend/internal/ethops"
	"retropick/apps/backend/internal/registry"
)

type BuildInfo struct {
	Version string `json:"version"`
	Commit  string `json:"commit"`
	Time    string `json:"time"`
	ABIHash string `json:"abiHash"`
}

func RegisterHealthRoutes(r interface {
	Get(pattern string, h http.HandlerFunc)
}, pool *pgxpool.Pool, eth *ethops.Caller, reg *registry.Registry, build BuildInfo) {
	r.Get("/api/v1/livez", func(w http.ResponseWriter, req *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{
			"ok":          true,
			"service":     "retropick-api",
			"environment": reg.Environment,
			"chainId":     reg.ChainID,
			"build":       build,
		})
	})

	r.Get("/api/v1/health", func(w http.ResponseWriter, req *http.Request) {
		st, err := dbqueries.New(pool).GetIndexerState(req.Context())
		if err != nil {
			writeJSON(w, http.StatusServiceUnavailable, map[string]any{
				"ok":    false,
				"error": "db",
				"build": build,
			})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"ok":               true,
			"lastIndexedBlock": st.LastBlock,
			"lastBlockHash":    nullableText(st.LastBlockHash.Valid, st.LastBlockHash.String),
			"lastSyncAt":       nullableTime(st.LastIndexedAt.Valid, st.LastIndexedAt.Time),
			"build":            build,
		})
	})

	r.Get("/api/v1/readyz", func(w http.ResponseWriter, req *http.Request) {
		ctx, cancel := context.WithTimeout(req.Context(), 3*time.Second)
		defer cancel()

		status := http.StatusOK
		dbOK := true
		rpcOK := true
		checks := map[string]any{}
		if err := pool.Ping(ctx); err != nil {
			dbOK = false
			status = http.StatusServiceUnavailable
			checks["dbError"] = err.Error()
		}
		if _, err := dbqueries.New(pool).GetIndexerState(ctx); err != nil {
			dbOK = false
			status = http.StatusServiceUnavailable
			checks["schemaError"] = err.Error()
		}
		if eth != nil {
			rpcCtx, rpcCancel := context.WithTimeout(req.Context(), 5*time.Second)
			block, err := eth.BlockNumber(rpcCtx)
			rpcCancel()
			if err != nil {
				rpcOK = false
				checks["rpcError"] = err.Error()
			} else {
				checks["rpcBlockNumber"] = block
			}
		}
		writeJSON(w, status, map[string]any{
			"ok":     dbOK,
			"db":     dbOK,
			"rpc":    rpcOK,
			"checks": checks,
			"build":  build,
		})
	})
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func nullableTime(valid bool, t time.Time) any {
	if !valid {
		return nil
	}
	return t.UTC().Format(time.RFC3339)
}

func nullableText(valid bool, s string) any {
	if !valid {
		return nil
	}
	return s
}

func ABIHash() string {
	sum := ethops.EmbeddedABIHash()
	return "0x" + hex.EncodeToString(sum[:])
}
