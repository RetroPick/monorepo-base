package api

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common"
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
			WriteAPIError(w, http.StatusInternalServerError, "DB", "failed to load indexer state", nil)
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
			WriteAPIError(w, http.StatusInternalServerError, "DB", "failed to list templates", nil)
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
			WriteAPIError(w, http.StatusBadRequest, "INVALID_TEMPLATE_ID", "invalid templateId", nil)
			return
		}
		row, err := q.GetTemplateLedgerDetail(ctx, b)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				WriteAPIError(w, http.StatusNotFound, "NOT_FOUND", "template not found", nil)
				return
			}
			WriteAPIError(w, http.StatusInternalServerError, "DB", "failed to load template state", nil)
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
			WriteAPIError(w, http.StatusBadRequest, "INVALID_TEMPLATE_ID", "invalid templateId", nil)
			return
		}
		epochID, err := strconv.ParseInt(chi.URLParam(r, "epochId"), 10, 64)
		if err != nil || epochID < 0 {
			WriteAPIError(w, http.StatusBadRequest, "INVALID_EPOCH_ID", "invalid epochId", nil)
			return
		}
		e, err := q.GetEpoch(ctx, dbqueries.GetEpochParams{TemplateID: b, EpochID: epochID})
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				WriteAPIError(w, http.StatusNotFound, "NOT_FOUND", "epoch not found", nil)
				return
			}
			WriteAPIError(w, http.StatusInternalServerError, "DB", "failed to load epoch", nil)
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
			WriteAPIError(w, http.StatusInternalServerError, "DB", "failed to list keeper schedule", nil)
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
			WriteAPIError(w, http.StatusInternalServerError, "DB", "failed to list keeper executions", nil)
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
			WriteAPIError(w, http.StatusInternalServerError, "DB", "failed to list incidents", nil)
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
		feeds, err := loadIndexedOracleFeedHealth(r.Context(), pool)
		if err != nil {
			WriteAPIError(w, http.StatusInternalServerError, "DB", "failed to load indexed feed health", nil)
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"source": "indexed",
			"feeds":  feeds,
			"note":   "Chainlink feed health is persisted by price-worker. Use /oracle/live-health only for explicit operator verification.",
		})
	})

	r.Get("/oracle/live-health", func(w http.ResponseWriter, r *http.Request) {
		rows, err := loadOracleTemplateRows(r.Context(), pool)
		if err != nil {
			WriteAPIError(w, http.StatusInternalServerError, "DB", "failed to load indexed templates", nil)
			return
		}
		feeds, warnings := buildOracleHealthFeedRows(r.Context(), rows, eth, reg)
		writeJSON(w, http.StatusOK, map[string]any{
			"source":   "indexed+live",
			"feeds":    feeds,
			"warnings": warnings,
		})
	})

	r.Get("/audit", func(w http.ResponseWriter, r *http.Request) {
		limit := opsLimit(r.URL.Query().Get("limit"))
		events, err := loadAuditEvents(r.Context(), pool, limit)
		if err != nil {
			WriteAPIError(w, http.StatusInternalServerError, "DB", "failed to load audit events", nil)
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"events": events, "source": "indexed"})
	})

	registerOpsFeedRoutes(r, reg)
	registerOpsLiveRoutes(r, eth, reg)
	registerOpsPrepareRoutes(r, eth, reg)
	registerOpsFrontendVisibilityRoutes(r, pool)

	return r
}

func loadIndexedOracleFeedHealth(ctx context.Context, pool *pgxpool.Pool) ([]map[string]any, error) {
	rows, err := pool.Query(ctx, `
SELECT feed_id, label, round_id::text, price_e8::text, publish_time, last_checked_at, stale, error_text, source, updated_at
FROM oracle_feed_health
ORDER BY label, feed_id
`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var feedID, label, roundID, priceE8, errorText, source string
		var publishTime pgtype.Timestamptz
		var lastCheckedAt, updatedAt time.Time
		var stale bool
		if err := rows.Scan(&feedID, &label, &roundID, &priceE8, &publishTime, &lastCheckedAt, &stale, &errorText, &source, &updatedAt); err != nil {
			return nil, err
		}
		out = append(out, map[string]any{
			"feedId":        feedID,
			"label":         label,
			"roundId":       roundID,
			"priceE8":       priceE8,
			"publishTime":   formatTS(publishTime),
			"lastCheckedAt": lastCheckedAt.UTC().Format(time.RFC3339),
			"stale":         stale,
			"error":         errorText,
			"source":        source,
			"updatedAt":     updatedAt.UTC().Format(time.RFC3339),
		})
	}
	return out, rows.Err()
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

type oracleCheckpointSnapshot struct {
	Written      bool
	ValueE8      string
	ConfidenceE8 string
	PublishTime  uint64
}

type auditEvent struct {
	Kind      string
	Timestamp time.Time
	Payload   map[string]any
}

type oracleTemplateRow struct {
	TemplateID             []byte
	Slug                   string
	ActiveEpochID          pgtype.Int8
	OracleMaxDelaySeconds  int64
	OracleMaxConfidenceBps int32
}

func loadOracleTemplateRows(ctx context.Context, pool *pgxpool.Pool) ([]oracleTemplateRow, error) {
	rows, err := pool.Query(ctx, `
SELECT
	t.template_id,
	t.slug,
	COALESCE(l.active_epoch_id, NULL) AS active_epoch_id,
	t.oracle_max_delay_seconds,
	t.oracle_max_confidence_bps
FROM templates t
LEFT JOIN ledgers l ON l.template_id = t.template_id
ORDER BY t.slug
`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []oracleTemplateRow{}
	for rows.Next() {
		var row oracleTemplateRow
		if err := rows.Scan(&row.TemplateID, &row.Slug, &row.ActiveEpochID, &row.OracleMaxDelaySeconds, &row.OracleMaxConfidenceBps); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

func buildOracleHealthFeedRows(ctx context.Context, rows []oracleTemplateRow, eth *ethops.Caller, reg *registry.Registry) ([]map[string]any, []string) {
	feeds := make([]map[string]any, 0, len(rows))
	warnings := []string{}
	for _, row := range rows {
		item := map[string]any{
			"templateId":             "0x" + hex.EncodeToString(row.TemplateID),
			"slug":                   row.Slug,
			"oracleMaxDelaySeconds":  row.OracleMaxDelaySeconds,
			"oracleMaxConfidenceBps": row.OracleMaxConfidenceBps,
			"source":                 "indexed",
			"status":                 "idle",
		}
		if !row.ActiveEpochID.Valid {
			feeds = append(feeds, item)
			continue
		}
		item["activeEpochId"] = row.ActiveEpochID.Int64
		item["source"] = "indexed+live"
		if eth == nil || reg == nil {
			item["status"] = "unknown"
			item["issues"] = []string{"live rpc unavailable"}
			feeds = append(feeds, item)
			continue
		}
		view, blockNum, err := eth.GetEpochView(ctx, common.HexToAddress(reg.Contracts.MarketEngineProxy), common.BytesToHash(row.TemplateID), uint64(row.ActiveEpochID.Int64))
		if err != nil {
			item["status"] = "error"
			item["issues"] = []string{err.Error()}
			feeds = append(feeds, item)
			continue
		}
		item["blockNumber"] = blockNum
		checkpoints := []map[string]any{}
		issues := []string{}
		now := time.Now().UTC()
		if cp, ok := parseOracleCheckpoint(view["checkpointA"]); ok {
			entry := buildOracleCheckpointHealth("checkpointA", cp, now, row.OracleMaxDelaySeconds, row.OracleMaxConfidenceBps)
			checkpoints = append(checkpoints, entry)
			if entry["stale"] == true {
				issues = append(issues, "checkpointA stale")
			}
			if entry["confidenceExceeded"] == true {
				issues = append(issues, "checkpointA confidence exceeds policy")
			}
		}
		if cp, ok := parseOracleCheckpoint(view["checkpointB"]); ok {
			entry := buildOracleCheckpointHealth("checkpointB", cp, now, row.OracleMaxDelaySeconds, row.OracleMaxConfidenceBps)
			checkpoints = append(checkpoints, entry)
			if entry["stale"] == true {
				issues = append(issues, "checkpointB stale")
			}
			if entry["confidenceExceeded"] == true {
				issues = append(issues, "checkpointB confidence exceeds policy")
			}
		}
		if len(checkpoints) == 0 {
			item["status"] = "unknown"
			item["issues"] = []string{"no checkpoint data returned"}
		} else if len(issues) > 0 {
			item["status"] = "degraded"
			item["issues"] = issues
		} else {
			item["status"] = "healthy"
		}
		item["checkpoints"] = checkpoints
		feeds = append(feeds, item)
	}
	if eth == nil {
		warnings = append(warnings, "live RPC caller unavailable; responses contain indexed-only fallback rows")
	}
	return feeds, warnings
}

func parseOracleCheckpoint(raw any) (oracleCheckpointSnapshot, bool) {
	m, ok := raw.(map[string]any)
	if !ok {
		return oracleCheckpointSnapshot{}, false
	}
	out := oracleCheckpointSnapshot{}
	if v, ok := m["written"].(bool); ok {
		out.Written = v
	}
	switch v := m["valueE8"].(type) {
	case string:
		out.ValueE8 = v
	case fmt.Stringer:
		out.ValueE8 = v.String()
	}
	switch v := m["confidenceE8"].(type) {
	case string:
		out.ConfidenceE8 = v
	case fmt.Stringer:
		out.ConfidenceE8 = v.String()
	}
	if v, ok := m["publishTime"].(uint64); ok {
		out.PublishTime = v
	}
	return out, true
}

func buildOracleCheckpointHealth(name string, cp oracleCheckpointSnapshot, now time.Time, maxDelaySeconds int64, maxConfidenceBps int32) map[string]any {
	entry := map[string]any{
		"name":         name,
		"written":      cp.Written,
		"valueE8":      cp.ValueE8,
		"confidenceE8": cp.ConfidenceE8,
	}
	if cp.PublishTime > 0 {
		publishedAt := time.Unix(int64(cp.PublishTime), 0).UTC()
		freshnessSeconds := int64(now.Sub(publishedAt).Seconds())
		entry["publishTime"] = publishedAt.Format(time.RFC3339)
		entry["freshnessSeconds"] = freshnessSeconds
		entry["stale"] = maxDelaySeconds > 0 && freshnessSeconds > maxDelaySeconds
	} else {
		entry["stale"] = cp.Written
	}
	if bps, ok := confidenceBPSFromStrings(cp.ConfidenceE8, cp.ValueE8); ok {
		entry["confidenceBps"] = bps
		entry["confidenceExceeded"] = maxConfidenceBps > 0 && bps > int64(maxConfidenceBps)
	} else {
		entry["confidenceExceeded"] = false
	}
	return entry
}

func confidenceBPSFromStrings(confidence, value string) (int64, bool) {
	conf := new(big.Int)
	if _, ok := conf.SetString(strings.TrimSpace(confidence), 10); !ok {
		return 0, false
	}
	val := new(big.Int)
	if _, ok := val.SetString(strings.TrimSpace(value), 10); !ok || val.Sign() == 0 {
		return 0, false
	}
	if val.Sign() < 0 {
		val.Abs(val)
	}
	numerator := new(big.Int).Mul(conf, big.NewInt(10_000))
	return new(big.Int).Div(numerator, val).Int64(), true
}

func loadAuditEvents(ctx context.Context, pool *pgxpool.Pool, limit int32) ([]map[string]any, error) {
	q := dbqueries.New(pool)
	incidents, err := q.ListIncidents(ctx, limit)
	if err != nil {
		return nil, err
	}
	executions, err := q.ListKeeperExecutions(ctx, limit)
	if err != nil {
		return nil, err
	}
	rows, err := pool.Query(ctx, `
SELECT event_name, template_id, epoch_id, tx_hash, block_number, indexed_at, payload
FROM chain_events
WHERE event_name IN (
	'TemplateUpserted',
	'MarketInitialized',
	'EpochOpened',
	'EpochLocked',
	'EpochResolved',
	'EpochResolvedV2',
	'EpochCancelled',
	'RollingGenesisStarted',
	'RollingGenesisLocked',
	'RollingRoundExecuted'
)
ORDER BY block_number DESC, log_index DESC
LIMIT $1
`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	events := make([]auditEvent, 0, int(limit)*3)
	for _, row := range incidents {
		ts := time.Time{}
		if row.OpenedAt.Valid {
			ts = row.OpenedAt.Time.UTC()
		}
		payload := map[string]any{
			"kind":     "incident",
			"id":       row.ID,
			"title":    row.Title,
			"severity": row.Severity,
			"status":   row.Status,
			"payload":  json.RawMessage(row.Payload),
		}
		if len(row.TemplateID) > 0 {
			payload["templateId"] = "0x" + hex.EncodeToString(row.TemplateID)
		}
		events = append(events, auditEvent{Kind: "incident", Timestamp: ts, Payload: payload})
	}
	for _, row := range executions {
		ts := time.Time{}
		if row.ExecutedAt.Valid {
			ts = row.ExecutedAt.Time.UTC()
		}
		payload := map[string]any{
			"kind":   "keeper_execution",
			"id":     row.ID,
			"action": row.Action,
			"result": row.Result,
			"txHash": nullText(row.TxHash),
		}
		if row.EpochID.Valid {
			payload["epochId"] = row.EpochID.Int64
		}
		if len(row.TemplateID) > 0 {
			payload["templateId"] = "0x" + hex.EncodeToString(row.TemplateID)
		}
		if row.ErrorMessage.Valid {
			payload["errorMessage"] = row.ErrorMessage.String
		}
		events = append(events, auditEvent{Kind: "keeper_execution", Timestamp: ts, Payload: payload})
	}
	for rows.Next() {
		var (
			eventName   string
			templateID  []byte
			epochID     pgtype.Int8
			txHash      string
			blockNumber int64
			indexedAt   pgtype.Timestamptz
			payloadRaw  []byte
		)
		if err := rows.Scan(&eventName, &templateID, &epochID, &txHash, &blockNumber, &indexedAt, &payloadRaw); err != nil {
			return nil, err
		}
		payload := map[string]any{
			"kind":        "chain_event",
			"eventName":   eventName,
			"txHash":      txHash,
			"blockNumber": blockNumber,
			"payload":     json.RawMessage(payloadRaw),
		}
		if len(templateID) > 0 {
			payload["templateId"] = "0x" + hex.EncodeToString(templateID)
		}
		if epochID.Valid {
			payload["epochId"] = epochID.Int64
		}
		ts := time.Time{}
		if indexedAt.Valid {
			ts = indexedAt.Time.UTC()
		}
		events = append(events, auditEvent{Kind: "chain_event", Timestamp: ts, Payload: payload})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return mergeAuditEvents(events, int(limit)), nil
}

func mergeAuditEvents(events []auditEvent, limit int) []map[string]any {
	sort.Slice(events, func(i, j int) bool {
		return events[i].Timestamp.After(events[j].Timestamp)
	})
	if limit > 0 && len(events) > limit {
		events = events[:limit]
	}
	out := make([]map[string]any, 0, len(events))
	for _, event := range events {
		payload := map[string]any{}
		for k, v := range event.Payload {
			payload[k] = v
		}
		payload["kind"] = event.Kind
		if !event.Timestamp.IsZero() {
			payload["timestamp"] = event.Timestamp.UTC().Format(time.RFC3339)
		}
		out = append(out, payload)
	}
	return out
}
