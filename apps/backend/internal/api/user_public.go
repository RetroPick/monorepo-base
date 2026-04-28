package api

import (
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/dbqueries"
	"retropick/apps/backend/internal/ethops"
	"retropick/apps/backend/internal/registry"
)

const userPositionsMaxPairs = 48

type userTemplateEpochPair struct {
	templateID []byte
	epochID    int64
	source     string
}

func requestedTemplateEpochPair(r *http.Request) (*userTemplateEpochPair, bool) {
	templateIDRaw := strings.TrimPrefix(strings.TrimSpace(r.URL.Query().Get("templateId")), "0x")
	epochIDRaw := strings.TrimSpace(r.URL.Query().Get("epochId"))
	if templateIDRaw == "" && epochIDRaw == "" {
		return nil, true
	}
	if templateIDRaw == "" || epochIDRaw == "" {
		return nil, false
	}
	tid, err := hex.DecodeString(templateIDRaw)
	if err != nil || len(tid) != 32 {
		return nil, false
	}
	epochID, err := strconv.ParseInt(epochIDRaw, 10, 64)
	if err != nil || epochID < 0 {
		return nil, false
	}
	return &userTemplateEpochPair{templateID: tid, epochID: epochID, source: "rpc+requested_pair"}, true
}

func pairKey(templateID []byte, epochID int64) string {
	return hex.EncodeToString(templateID) + ":" + strconv.FormatInt(epochID, 10)
}

// UserPositionsHandler returns live position views for (template, epoch) pairs the user touched (indexed).
func UserPositionsHandler(pool *pgxpool.Pool, eth *ethops.Caller, reg *registry.Registry) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		wallet := strings.TrimSpace(r.URL.Query().Get("wallet"))
		if !strings.HasPrefix(wallet, "0x") || len(wallet) != 42 {
			http.Error(w, `{"error":"invalid wallet (use ?wallet=0x...)"}`, http.StatusBadRequest)
			return
		}
		requestedPair, ok := requestedTemplateEpochPair(r)
		if !ok {
			http.Error(w, `{"error":"invalid templateId/epochId"}`, http.StatusBadRequest)
			return
		}
		q := dbqueries.New(pool)
		st, err := q.GetIndexerState(r.Context())
		if err != nil {
			http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
			return
		}
		var lastSync *string
		if st.LastIndexedAt.Valid {
			s := st.LastIndexedAt.Time.UTC().Format(time.RFC3339)
			lastSync = &s
		}
		pairLimit := int32(userPositionsMaxPairs)
		rows, err := q.ListUserTemplateEpochPairs(r.Context(), dbqueries.ListUserTemplateEpochPairsParams{
			UserAddress: wallet,
			Limit:       pairLimit,
		})
		if err != nil {
			http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
			return
		}

		pairs := make([]userTemplateEpochPair, 0, len(rows)+1)
		seen := make(map[string]struct{}, len(rows)+1)
		for _, row := range rows {
			if len(row.TemplateID) != 32 {
				continue
			}
			seen[pairKey(row.TemplateID, row.EpochID)] = struct{}{}
			pairs = append(pairs, userTemplateEpochPair{
				templateID: row.TemplateID,
				epochID:    row.EpochID,
				source:     "rpc+indexed_keys",
			})
		}
		if requestedPair != nil {
			key := pairKey(requestedPair.templateID, requestedPair.epochID)
			if _, exists := seen[key]; !exists {
				pairs = append([]userTemplateEpochPair{*requestedPair}, pairs...)
			}
		}

		positions := make([]map[string]any, 0, len(pairs))
		if eth != nil {
			proxy := common.HexToAddress(reg.Contracts.MarketEngineProxy)
			user := common.HexToAddress(wallet)
			for _, pair := range pairs {
				tid := common.BytesToHash(pair.templateID)
				rpcCtx, cancel := liveRPCContext(r)
				pv, blockNum, err := eth.GetPositionView(rpcCtx, proxy, tid, uint64(pair.epochID), user)
				cancel()
				if err != nil {
					positions = append(positions, map[string]any{
						"templateId": "0x" + hex.EncodeToString(pair.templateID),
						"epochId":    pair.epochID,
						"error":      err.Error(),
					})
					continue
				}
				m, ok := ethops.ToJSONMap(pv).(map[string]any)
				if !ok {
					m = map[string]any{}
				}
				m["templateId"] = "0x" + hex.EncodeToString(pair.templateID)
				m["epochId"] = pair.epochID
				m["wallet"] = strings.ToLower(wallet)
				m["positionViewBlock"] = blockNum
				m["source"] = pair.source
				positions = append(positions, m)
			}
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"wallet":    strings.ToLower(wallet),
			"positions": positions,
			"dataFreshness": map[string]any{
				"lastSyncAt":       lastSync,
				"lastIndexedBlock": st.LastBlock,
			},
		})
	}
}

// UserClaimsHandler lists Claimed events with indexer payload and epoch claim flags.
func UserClaimsHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		wallet := strings.TrimSpace(r.URL.Query().Get("wallet"))
		if !strings.HasPrefix(wallet, "0x") || len(wallet) != 42 {
			http.Error(w, `{"error":"invalid wallet"}`, http.StatusBadRequest)
			return
		}
		limit := int32(100)
		if ls := r.URL.Query().Get("limit"); ls != "" {
			if n, err := strconv.ParseInt(ls, 10, 32); err == nil && n > 0 && n <= 500 {
				limit = int32(n)
			}
		}
		q := dbqueries.New(pool)
		st, err := q.GetIndexerState(r.Context())
		if err != nil {
			http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
			return
		}
		var lastSync *string
		if st.LastIndexedAt.Valid {
			s := st.LastIndexedAt.Time.UTC().Format(time.RFC3339)
			lastSync = &s
		}
		rows, err := q.ListUserClaimedEvents(r.Context(), dbqueries.ListUserClaimedEventsParams{
			UserAddress: wallet,
			Limit:       limit,
		})
		if err != nil {
			http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
			return
		}
		claims := make([]map[string]any, 0, len(rows))
		for _, row := range rows {
			var payload map[string]any
			_ = json.Unmarshal(row.Payload, &payload)
			tplHex := "0x" + hex.EncodeToString(row.TemplateID)
			claimM := map[string]any{
				"id":          row.ID,
				"templateId":  tplHex,
				"epochId":     row.EpochID,
				"txHash":      row.TxHash,
				"blockNumber": row.BlockNumber,
			}
			if row.IndexedAt.Valid {
				claimM["indexedAt"] = row.IndexedAt.Time.UTC().Format(time.RFC3339)
			}
			if payload != nil {
				claimM["eventPayload"] = payload
			}
			ep, err := q.GetEpoch(r.Context(), dbqueries.GetEpochParams{
				TemplateID: row.TemplateID,
				EpochID:    row.EpochID,
			})
			if err == nil {
				claimM["epochClaimable"] = ep.Claimable
				claimM["refMode"] = ep.RefMode
			}
			claims = append(claims, claimM)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"wallet": strings.ToLower(wallet),
			"claims": claims,
			"dataFreshness": map[string]any{
				"lastSyncAt":       lastSync,
				"lastIndexedBlock": st.LastBlock,
			},
		})
	}
}

// UserFaucetStateHandler reads Base Sepolia faucet + stake token for a wallet.
func UserFaucetStateHandler(eth *ethops.Caller, reg *registry.Registry) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		wallet := strings.TrimSpace(r.URL.Query().Get("wallet"))
		if !strings.HasPrefix(wallet, "0x") || len(wallet) != 42 {
			http.Error(w, `{"error":"invalid wallet"}`, http.StatusBadRequest)
			return
		}
		if reg.ChainID != 84532 {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]any{
				"source":  "n/a",
				"chainId": reg.ChainID,
				"note":    "faucet-state is only for Base Sepolia (84532)",
			})
			return
		}
		if eth == nil {
			http.Error(w, `{"error":"eth client unavailable"}`, http.StatusServiceUnavailable)
			return
		}
		faucet := common.HexToAddress(reg.Contracts.TokenFaucet)
		stake := common.HexToAddress(reg.Contracts.StakeToken)
		user := common.HexToAddress(wallet)
		rpcCtx, cancel := liveRPCContext(r)
		out, err := eth.GetFaucetState(rpcCtx, reg.ChainID, faucet, stake, user)
		cancel()
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadGateway)
			_ = json.NewEncoder(w).Encode(map[string]any{"error": err.Error()})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(out)
	}
}
