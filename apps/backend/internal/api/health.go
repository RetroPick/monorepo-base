package api

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/dbqueries"
	"retropick/apps/backend/internal/ethops"
	"retropick/apps/backend/internal/registry"
)

// healthSchemaVersion is bumped when adding/removing top-level machine fields on /api/v1/health.
const healthSchemaVersion = "retropick.health.v1"

type BuildInfo struct {
	Version string `json:"version"`
	Commit  string `json:"commit"`
	Time    string `json:"time"`
	ABIHash string `json:"abiHash"`
}

// healthOKPayload builds GET /api/v1/health JSON on success.
// Top-level lastIndexedBlock / lastBlockHash / lastSyncAt stay stable for older clients.
// environment, chainId, contracts, and indexer mirror /api/v1/ops/global-state for probes and dashboards.
func healthOKPayload(reg *registry.Registry, st dbqueries.IndexerState, build BuildInfo) map[string]any {
	var lastHash *string
	if st.LastBlockHash.Valid {
		s := st.LastBlockHash.String
		lastHash = &s
	}
	var lastSyncIndexed *string
	if st.LastIndexedAt.Valid {
		tm := st.LastIndexedAt.Time.UTC()
		s := tm.Format("2006-01-02T15:04:05Z07:00")
		lastSyncIndexed = &s
	}
	indexer := map[string]any{
		"lastIndexedBlock": st.LastBlock,
		"lastBlockHash":    lastHash,
		"lastSyncAt":       lastSyncIndexed,
		"reorgDepth":       st.ReorgDepth,
	}
	return map[string]any{
		"ok":               true,
		"schemaVersion":    healthSchemaVersion,
		"environment":      reg.Environment,
		"chainId":          reg.ChainID,
		"lastIndexedBlock": st.LastBlock,
		// Alias for scripts that prefer a verb-noun field name.
		"indexedBlock":  st.LastBlock,
		"lastBlockHash": nullableText(st.LastBlockHash.Valid, st.LastBlockHash.String),
		"lastSyncAt":    nullableTime(st.LastIndexedAt.Valid, st.LastIndexedAt.Time),
		"indexer":       indexer,
		"contracts": map[string]any{
			"marketEngineProxy": reg.Contracts.MarketEngineProxy,
		},
		"build": build,
	}
}

func RegisterHealthRoutes(r interface {
	Get(pattern string, h http.HandlerFunc)
}, pool *pgxpool.Pool, eth *ethops.Caller, reg *registry.Registry, build BuildInfo, faucetRelayEnabled bool) {
	r.Get("/api/v1/livez", func(w http.ResponseWriter, req *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{
			"ok":                 true,
			"service":            "retropick-api",
			"environment":        reg.Environment,
			"chainId":            reg.ChainID,
			"faucetRelayEnabled": faucetRelayEnabled,
			"build":              build,
		})
	})

	r.Get("/api/v1/health", func(w http.ResponseWriter, req *http.Request) {
		st, err := dbqueries.New(pool).GetIndexerState(req.Context())
		if err != nil {
			writeJSON(w, http.StatusServiceUnavailable, map[string]any{
				"ok":            false,
				"error":         "db",
				"schemaVersion": healthSchemaVersion,
				"environment":   reg.Environment,
				"chainId":       reg.ChainID,
				"build":         build,
			})
			return
		}
		writeJSON(w, http.StatusOK, healthOKPayload(reg, st, build))
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
			checks["db"] = "unavailable"
		}
		if _, err := dbqueries.New(pool).GetIndexerState(ctx); err != nil {
			dbOK = false
			status = http.StatusServiceUnavailable
			checks["schema"] = "unavailable"
		}
		if eth != nil {
			rpcCtx, rpcCancel := context.WithTimeout(req.Context(), 5*time.Second)
			block, err := eth.BlockNumber(rpcCtx)
			rpcCancel()
			if err != nil {
				rpcOK = false
				checks["rpc"] = "unavailable"
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

	r.Get("/metrics", func(w http.ResponseWriter, req *http.Request) {
		q := dbqueries.New(pool)
		templates, _ := q.CountTemplates(req.Context())
		halted, _ := q.CountTemplatesRollingHalted(req.Context())
		openIncidents, _ := q.CountOpenIncidents(req.Context())
		state, _ := q.GetIndexerState(req.Context())
		w.Header().Set("Content-Type", "text/plain; version=0.0.4")
		_, _ = fmt.Fprintf(w, "retropick_service_info{service=%q,version=%q} 1\n", "api", build.Version)
		_, _ = fmt.Fprintf(w, "retropick_templates_total %d\n", templates)
		_, _ = fmt.Fprintf(w, "retropick_templates_rolling_halted_total %d\n", halted)
		_, _ = fmt.Fprintf(w, "retropick_open_incidents_total %d\n", openIncidents)
		_, _ = fmt.Fprintf(w, "retropick_indexer_last_block %d\n", state.LastBlock)
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
