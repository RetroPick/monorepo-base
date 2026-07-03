package api

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"math/big"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/jackc/pgx/v5/pgtype"
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

// UserPositionsHandler returns indexed position projections by default; source=live keeps the RPC fallback for debug.
func UserPositionsHandler(pool *pgxpool.Pool, eth *ethops.Caller, reg *registry.Registry) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		wallet, ok := requireAuthorizedWalletQuery(w, r, "wallet")
		if !ok {
			return
		}
		requestedPair, ok := requestedTemplateEpochPair(r)
		if !ok {
			writeAPIError(w, http.StatusBadRequest, "INVALID_TEMPLATE_EPOCH_PAIR", "invalid templateId/epochId", nil)
			return
		}
		q := dbqueries.New(pool)
		st, err := q.GetIndexerState(r.Context())
		if err != nil {
			writeAPIError(w, http.StatusInternalServerError, "DB", "could not load indexer state", nil)
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
			RowLimit:    pairLimit,
		})
		if err != nil {
			writeAPIError(w, http.StatusInternalServerError, "DB", "could not load user template epochs", nil)
			return
		}

		pairs := make([]userTemplateEpochPair, 0, len(rows)+1)
		seen := make(map[string]struct{}, len(rows)+1)
		for _, row := range rows {
			if len(row.TemplateID) != 32 || !row.EpochID.Valid {
				continue
			}
			epochID := row.EpochID.Int64
			seen[pairKey(row.TemplateID, epochID)] = struct{}{}
			pairs = append(pairs, userTemplateEpochPair{
				templateID: row.TemplateID,
				epochID:    epochID,
				source:     "rpc+indexed_keys",
			})
		}
		if requestedPair != nil {
			key := pairKey(requestedPair.templateID, requestedPair.epochID)
			if _, exists := seen[key]; !exists {
				pairs = append([]userTemplateEpochPair{*requestedPair}, pairs...)
			}
		}

		var positions []map[string]any
		if r.URL.Query().Get("source") != "live" {
			positions, err = indexedUserPositions(r.Context(), pool, wallet, requestedPair)
			if err != nil {
				writeAPIError(w, http.StatusInternalServerError, "DB", "could not load indexed user positions", nil)
				return
			}
		} else if eth != nil {
			positions = make([]map[string]any, 0, len(pairs))
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
		} else {
			positions = []map[string]any{}
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"wallet":    wallet,
			"positions": positions,
			"dataFreshness": map[string]any{
				"lastSyncAt":       lastSync,
				"lastIndexedBlock": st.LastBlock,
			},
		})
	}
}

func indexedUserPositions(ctx context.Context, pool *pgxpool.Pool, wallet string, requestedPair *userTemplateEpochPair) ([]map[string]any, error) {
	type pos struct {
		templateID    []byte
		epochID       int64
		stakes        []string
		totalStake    *big.Int
		claimed       bool
		claimedAmount *big.Int
		updatedBlock  int64
	}
	positions := map[string]*pos{}
	rows, err := pool.Query(ctx, `
SELECT user_address, template_id, epoch_id, outcome_index, stake_amount::text, claimed_amount::text, claimed, updated_block
FROM user_position_outcomes
WHERE LOWER(user_address) = LOWER($1)
ORDER BY updated_at DESC
LIMIT 512
`, wallet)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var user string
		var templateID []byte
		var epochID int64
		var outcome int16
		var stakeText, claimedText string
		var claimed bool
		var updatedBlock int64
		if err := rows.Scan(&user, &templateID, &epochID, &outcome, &stakeText, &claimedText, &claimed, &updatedBlock); err != nil {
			return nil, err
		}
		if len(templateID) != 32 {
			continue
		}
		key := pairKey(templateID, epochID)
		p := positions[key]
		if p == nil {
			p = &pos{
				templateID:    templateID,
				epochID:       epochID,
				totalStake:    new(big.Int),
				claimedAmount: new(big.Int),
			}
			positions[key] = p
		}
		for len(p.stakes) <= int(outcome) {
			p.stakes = append(p.stakes, "0")
		}
		p.stakes[outcome] = stakeText
		if n, ok := new(big.Int).SetString(stakeText, 10); ok {
			p.totalStake.Add(p.totalStake, n)
		}
		accumulateClaimedAmount(p.claimedAmount, claimedText)
		p.claimed = p.claimed || claimed
		if updatedBlock > p.updatedBlock {
			p.updatedBlock = updatedBlock
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if requestedPair != nil {
		key := pairKey(requestedPair.templateID, requestedPair.epochID)
		if _, ok := positions[key]; !ok {
			positions[key] = &pos{
				templateID:    requestedPair.templateID,
				epochID:       requestedPair.epochID,
				totalStake:    new(big.Int),
				claimedAmount: new(big.Int),
			}
		}
	}
	out := make([]map[string]any, 0, len(positions))
	for _, p := range positions {
		claimableNow := false
		pendingClaim := "0"
		var epochStatus string
		var claimable bool
		var refMode bool
		var winningMask pgtype.Int4
		err := pool.QueryRow(ctx, `
SELECT status, claimable, ref_mode, winning_outcome_mask
FROM epochs
WHERE template_id = $1 AND epoch_id = $2
`, p.templateID, p.epochID).Scan(&epochStatus, &claimable, &refMode, &winningMask)
		if err == nil {
			if claimable && !p.claimed {
				claimableNow = true
				if refMode {
					pendingClaim = p.totalStake.String()
				} else if winningMask.Valid {
					winTotal := new(big.Int)
					for idx, stake := range p.stakes {
						if (uint64(winningMask.Int32) & (uint64(1) << uint(idx))) == 0 {
							continue
						}
						if n, ok := new(big.Int).SetString(stake, 10); ok {
							winTotal.Add(winTotal, n)
						}
					}
					pendingClaim = winTotal.String()
				}
			}
		}
		out = append(out, map[string]any{
			"templateId":          "0x" + hex.EncodeToString(p.templateID),
			"epochId":             p.epochID,
			"wallet":              strings.ToLower(wallet),
			"source":              "indexed_projection",
			"stakes":              p.stakes,
			"totalStake":          p.totalStake.String(),
			"claimed":             p.claimed,
			"claimedAmount":       p.claimedAmount.String(),
			"claimableNow":        claimableNow,
			"pendingClaimAmount":  pendingClaim,
			"pendingRefundAmount": "0",
			"positionViewBlock":   p.updatedBlock,
		})
	}
	return out, nil
}

func accumulateClaimedAmount(current *big.Int, claimedText string) {
	n, ok := new(big.Int).SetString(claimedText, 10)
	if !ok {
		return
	}
	if n.Cmp(current) > 0 {
		// `user_position_outcomes` stores one row per outcome. When a claim is recorded,
		// each row can carry the same claimed_amount for the position, so summing would
		// double count for multi-outcome markets. Keep the max per position.
		current.Set(n)
	}
}

// UserClaimsHandler lists Claimed events with indexer payload and epoch claim flags.
func UserClaimsHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		wallet, ok := requireAuthorizedWalletQuery(w, r, "wallet")
		if !ok {
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
			writeAPIError(w, http.StatusInternalServerError, "DB", "could not load indexer state", nil)
			return
		}
		var lastSync *string
		if st.LastIndexedAt.Valid {
			s := st.LastIndexedAt.Time.UTC().Format(time.RFC3339)
			lastSync = &s
		}
		rows, err := q.ListUserClaimedEvents(r.Context(), dbqueries.ListUserClaimedEventsParams{
			UserAddress: wallet,
			RowLimit:    limit,
		})
		if err != nil {
			writeAPIError(w, http.StatusInternalServerError, "DB", "could not load claimed events", nil)
			return
		}
		claims := make([]map[string]any, 0, len(rows))
		for _, row := range rows {
			if !row.EpochID.Valid {
				continue
			}
			epochID := row.EpochID.Int64
			var payload map[string]any
			_ = json.Unmarshal(row.Payload, &payload)
			tplHex := "0x" + hex.EncodeToString(row.TemplateID)
			claimM := map[string]any{
				"id":          row.ID,
				"templateId":  tplHex,
				"epochId":     epochID,
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
				EpochID:    epochID,
			})
			if err == nil {
				claimM["epochClaimable"] = ep.Claimable
				claimM["refMode"] = ep.RefMode
			}
			claims = append(claims, claimM)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"wallet": wallet,
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
