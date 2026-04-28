package api

import (
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/dbqueries"
	"retropick/apps/backend/internal/ethops"
	"retropick/apps/backend/internal/registry"
)

const opsListLimitDefault = 100

// OpsRouter returns chi.Router mounted at /api/v1/ops (no prefix inside).
// eth may be nil to disable live RPC routes (indexed routes still work).
func OpsRouter(pool *pgxpool.Pool, reg *registry.Registry, eth *ethops.Caller) chi.Router {
	r := chi.NewRouter()
	q := dbqueries.New(pool)

	r.Get("/global-state", func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		st, err := q.GetIndexerState(ctx)
		if err != nil {
			http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
			return
		}
		nTemplates, _ := q.CountTemplates(ctx)
		nHalted, _ := q.CountTemplatesRollingHalted(ctx)
		nOpenIncidents, _ := q.CountOpenIncidents(ctx)

		var lastHash *string
		if st.LastBlockHash.Valid {
			s := st.LastBlockHash.String
			lastHash = &s
		}
		var lastSync *string
		if st.LastIndexedAt.Valid {
			s := st.LastIndexedAt.Time.UTC().Format("2006-01-02T15:04:05Z07:00")
			lastSync = &s
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"source": "indexed",
			"environment": map[string]any{
				"name":    reg.Environment,
				"chainId": reg.ChainID,
			},
			"contracts": map[string]any{
				"marketEngineProxy": reg.Contracts.MarketEngineProxy,
			},
			"indexer": map[string]any{
				"lastIndexedBlock": st.LastBlock,
				"lastBlockHash":    lastHash,
				"lastSyncAt":       lastSync,
				"reorgDepth":       st.ReorgDepth,
			},
			"counts": map[string]any{
				"templates":     nTemplates,
				"rollingHalted": nHalted,
				"openIncidents": nOpenIncidents,
			},
			"liveProtocolFields": nil,
			"liveFieldsNote":     "On-chain fields (globalPaused, yieldRouterDisabled, etc.) require explicit live RPC reads; not included in this indexed response.",
		})
	})

	r.Get("/templates", func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		rows, err := q.ListTemplatesWithLedger(ctx)
		if err != nil {
			http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
			return
		}
		st, _ := q.GetIndexerState(ctx)
		out := make([]map[string]any, 0, len(rows))
		for _, row := range rows {
			m := map[string]any{
				"templateId":        "0x" + hex.EncodeToString(row.TemplateID),
				"slug":              row.Slug,
				"marketType":        row.MarketType,
				"outcomeCount":      row.OutcomeCount,
				"initialized":       row.Initialized,
				"executionMode":     row.ExecutionMode,
				"rollingPhase":      row.RollingPhase,
				"rollingHaltReason": row.RollingHaltReason,
				"published":         row.Initialized && row.ActiveEpochID.Valid,
				"lastIndexedBlock":  st.LastBlock,
				"templateUpdatedAt": formatTS(row.UpdatedAt),
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
		_ = json.NewEncoder(w).Encode(map[string]any{"templates": out, "source": "indexed"})
	})

	r.Get("/templates/{templateId}/state", func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		b, ok := parseTemplateIDParam(chi.URLParam(r, "templateId"))
		if !ok {
			http.Error(w, `{"error":"invalid templateId"}`, http.StatusBadRequest)
			return
		}
		row, err := q.GetTemplateLedgerDetail(ctx, b)
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
			"source":                 "indexed",
			"templateId":             "0x" + hex.EncodeToString(row.TemplateID),
			"slug":                   row.Slug,
			"marketType":             row.MarketType,
			"outcomeCount":           row.OutcomeCount,
			"oracleMaxDelaySeconds":  row.OracleMaxDelaySeconds,
			"oracleMaxConfidenceBps": row.OracleMaxConfidenceBps,
			"initialized":            row.Initialized,
			"executionMode":          row.ExecutionMode,
			"rollingPhase":           row.RollingPhase,
			"rollingHaltReason":      row.RollingHaltReason,
			"templateUpdatedAt":      formatTS(row.UpdatedAt),
			"lastIndexedBlock":       st.LastBlock,
		}
		if row.ActiveEpochID.Valid {
			resp["activeEpochId"] = row.ActiveEpochID.Int64
		}
		if row.LastResolvedEpochID.Valid {
			resp["lastResolvedEpochId"] = row.LastResolvedEpochID.Int64
		}
		if row.RollingNextEpochID.Valid {
			resp["rollingNextEpochId"] = row.RollingNextEpochID.Int64
		}
		if row.HaltedAtEpochID.Valid {
			resp["haltedAtEpochId"] = row.HaltedAtEpochID.Int64
		}
		resp["ledgerUpdatedAt"] = formatTS(row.LedgerUpdatedAt)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	})

	r.Get("/templates/{templateId}/epochs/{epochId}", func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		b, ok := parseTemplateIDParam(chi.URLParam(r, "templateId"))
		if !ok {
			http.Error(w, `{"error":"invalid templateId"}`, http.StatusBadRequest)
			return
		}
		epochID, err := strconv.ParseInt(chi.URLParam(r, "epochId"), 10, 64)
		if err != nil || epochID < 0 {
			http.Error(w, `{"error":"invalid epochId"}`, http.StatusBadRequest)
			return
		}
		e, err := q.GetEpoch(ctx, dbqueries.GetEpochParams{TemplateID: b, EpochID: epochID})
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
			"source":           "indexed",
			"templateId":       "0x" + hex.EncodeToString(e.TemplateID),
			"epochId":          e.EpochID,
			"status":           e.Status,
			"openAt":           formatTS(e.OpenAt),
			"lockAt":           formatTS(e.LockAt),
			"resolveAt":        formatTS(e.ResolveAt),
			"openTxHash":       nullText(e.OpenTxHash),
			"lockTxHash":       nullText(e.LockTxHash),
			"resolveTxHash":    nullText(e.ResolveTxHash),
			"claimable":        e.Claimable,
			"refMode":          e.RefMode,
			"updatedAt":        formatTS(e.UpdatedAt),
			"lastIndexedBlock": st.LastBlock,
		}
		if e.WinningOutcomeMask.Valid {
			resp["winningOutcomeMask"] = e.WinningOutcomeMask.Int32
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	})

	r.Get("/keeper/schedule", func(w http.ResponseWriter, r *http.Request) {
		limit := opsLimit(r.URL.Query().Get("limit"))
		rows, err := q.ListKeeperSchedule(r.Context(), limit)
		if err != nil {
			http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
			return
		}
		out := make([]map[string]any, 0, len(rows))
		for _, row := range rows {
			m := map[string]any{
				"id":     row.ID,
				"action": row.Action,
				"status": row.Status,
			}
			if row.ScheduledAt.Valid {
				m["scheduledAt"] = row.ScheduledAt.Time.UTC().Format("2006-01-02T15:04:05Z07:00")
			}
			if row.WindowEndAt.Valid {
				m["windowEndAt"] = row.WindowEndAt.Time.UTC().Format("2006-01-02T15:04:05Z07:00")
			}
			if row.CreatedAt.Valid {
				m["createdAt"] = row.CreatedAt.Time.UTC().Format("2006-01-02T15:04:05Z07:00")
			}
			if len(row.TemplateID) > 0 {
				m["templateId"] = "0x" + hex.EncodeToString(row.TemplateID)
			}
			if row.EpochID.Valid {
				m["epochId"] = row.EpochID.Int64
			}
			out = append(out, m)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"schedule": out, "source": "indexed"})
	})

	r.Get("/keeper/executions", func(w http.ResponseWriter, r *http.Request) {
		limit := opsLimit(r.URL.Query().Get("limit"))
		rows, err := q.ListKeeperExecutions(r.Context(), limit)
		if err != nil {
			http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
			return
		}
		out := make([]map[string]any, 0, len(rows))
		for _, row := range rows {
			m := map[string]any{
				"id":     row.ID,
				"action": row.Action,
				"result": row.Result,
			}
			if row.ExecutedAt.Valid {
				m["executedAt"] = row.ExecutedAt.Time.UTC().Format("2006-01-02T15:04:05Z07:00")
			}
			if len(row.TemplateID) > 0 {
				m["templateId"] = "0x" + hex.EncodeToString(row.TemplateID)
			}
			if row.EpochID.Valid {
				m["epochId"] = row.EpochID.Int64
			}
			if row.TxHash.Valid {
				m["txHash"] = row.TxHash.String
			}
			if row.ErrorMessage.Valid {
				m["errorMessage"] = row.ErrorMessage.String
			}
			out = append(out, m)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"executions": out, "source": "indexed"})
	})

	r.Get("/incidents", func(w http.ResponseWriter, r *http.Request) {
		limit := opsLimit(r.URL.Query().Get("limit"))
		rows, err := q.ListIncidents(r.Context(), limit)
		if err != nil {
			http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
			return
		}
		out := make([]map[string]any, 0, len(rows))
		for _, row := range rows {
			m := map[string]any{
				"id":       row.ID,
				"title":    row.Title,
				"severity": row.Severity,
				"status":   row.Status,
				"payload":  json.RawMessage(row.Payload),
			}
			if row.OpenedAt.Valid {
				m["openedAt"] = row.OpenedAt.Time.UTC().Format("2006-01-02T15:04:05Z07:00")
			}
			if len(row.TemplateID) > 0 {
				m["templateId"] = "0x" + hex.EncodeToString(row.TemplateID)
			}
			out = append(out, m)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"incidents": out, "source": "indexed"})
	})

	r.Get("/oracle/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"feeds":  []any{},
			"note":   "oracle_health table not migrated; no feed projections yet.",
			"source": "stub",
		})
	})

	r.Get("/audit", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"events": []any{}, "source": "stub"})
	})

	registerOpsFeedRoutes(r, reg)
	registerOpsLiveRoutes(r, eth, reg)
	registerOpsPrepareRoutes(r, eth, reg)
	registerOpsFrontendVisibilityRoutes(r, pool)

	return r
}

func parseTemplateIDParam(raw string) ([]byte, bool) {
	s := strings.TrimPrefix(strings.TrimSpace(raw), "0x")
	b, err := hex.DecodeString(s)
	if err != nil || len(b) != 32 {
		return nil, false
	}
	return b, true
}

func opsLimit(s string) int32 {
	if s == "" {
		return opsListLimitDefault
	}
	n, err := strconv.Atoi(s)
	if err != nil || n < 1 || n > 500 {
		return opsListLimitDefault
	}
	return int32(n)
}

func formatTS(t pgtype.Timestamptz) any {
	if !t.Valid {
		return nil
	}
	return t.Time.UTC().Format("2006-01-02T15:04:05Z07:00")
}

func nullText(t pgtype.Text) any {
	if !t.Valid {
		return nil
	}
	return t.String
}
