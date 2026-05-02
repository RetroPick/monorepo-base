package api

import (
	"encoding/hex"
	"encoding/json"
	"math/big"
	"net/http"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/dbqueries"
	"retropick/apps/backend/internal/ethops"
	"retropick/apps/backend/internal/portfoliopnl"
	"retropick/apps/backend/internal/registry"
)

const portfolioSummaryMaxPairs = 48

const portfolioPnlModelNote = "v1: per (template,epoch) costBasisWei = sum(PositionDeposited.amount)+sum(SideSwitched.feeAmount); markValueWei = getPositionView.totalStake; unrealizedWei = markValueWei-costBasisWei when claimed=false else 0. aggregate.realizedPnlClaimsWei = sum(Claimed.amount) for the wallet (indexed)."

// UserPortfolioSummaryHandler returns aggregate PnL and per-position metrics derived from indexer events + live RPC views.
func UserPortfolioSummaryHandler(pool *pgxpool.Pool, eth *ethops.Caller, reg *registry.Registry) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		wallet := strings.TrimSpace(r.URL.Query().Get("wallet"))
		if !strings.HasPrefix(wallet, "0x") || len(wallet) != 42 {
			http.Error(w, `{"error":"invalid wallet (use ?wallet=0x...)"}`, http.StatusBadRequest)
			return
		}
		wallet = strings.ToLower(wallet)
		ctx := r.Context()
		q := dbqueries.New(pool)
		st, err := q.GetIndexerState(ctx)
		if err != nil {
			http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
			return
		}
		var lastSync *string
		if st.LastIndexedAt.Valid {
			s := st.LastIndexedAt.Time.UTC().Format(time.RFC3339)
			lastSync = &s
		}

		pairLimit := int32(portfolioSummaryMaxPairs)
		pairs, err := q.ListUserTemplateEpochPairs(ctx, dbqueries.ListUserTemplateEpochPairsParams{
			UserAddress: wallet,
			Limit:       pairLimit,
		})
		if err != nil {
			http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
			return
		}

		claimsRows, err := q.ListUserClaimedEvents(ctx, dbqueries.ListUserClaimedEventsParams{
			UserAddress: wallet,
			Limit:       500,
		})
		if err != nil {
			http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
			return
		}
		realized := new(big.Int)
		for _, row := range claimsRows {
			var payload map[string]any
			if len(row.Payload) == 0 {
				continue
			}
			_ = json.Unmarshal(row.Payload, &payload)
			if s, ok := payload["amount"].(string); ok {
				if n, ok := new(big.Int).SetString(s, 10); ok {
					realized.Add(realized, n)
				}
			}
		}

		positionsOut := make([]map[string]any, 0, len(pairs))
		unrealizedAgg := new(big.Int)
		pendingClaimAgg := new(big.Int)
		totalStakeAgg := new(big.Int)

		if eth != nil {
			proxy := common.HexToAddress(reg.Contracts.MarketEngineProxy)
			user := common.HexToAddress(wallet)
			for _, pair := range pairs {
				if len(pair.TemplateID) != 32 {
					continue
				}
				evRows, err := q.ListUserChainEventsForTemplateEpoch(ctx, dbqueries.ListUserChainEventsForTemplateEpochParams{
					UserAddress: wallet,
					TemplateID:  pair.TemplateID,
					EpochID:     pair.EpochID,
				})
				if err != nil {
					http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
					return
				}
				costBasis := portfoliopnl.CostBasisWeiFromEvents(evRows)

				tid := common.BytesToHash(pair.TemplateID)
				rpcCtx, cancel := liveRPCContext(r)
				pv, blockNum, err := eth.GetPositionView(rpcCtx, proxy, tid, uint64(pair.EpochID), user)
				cancel()
				if err != nil {
					positionsOut = append(positionsOut, map[string]any{
						"templateId": "0x" + hex.EncodeToString(pair.TemplateID),
						"epochId":    pair.EpochID,
						"error":      err.Error(),
					})
					continue
				}
				mark := new(big.Int)
				if pv.TotalStake != nil {
					mark.Set(pv.TotalStake)
				}
				un := portfoliopnl.UnrealizedWei(pv.Claimed, mark, costBasis)
				unrealizedAgg.Add(unrealizedAgg, un)
				if pv.PendingClaimAmount != nil {
					pendingClaimAgg.Add(pendingClaimAgg, pv.PendingClaimAmount)
				}
				if pv.TotalStake != nil {
					totalStakeAgg.Add(totalStakeAgg, pv.TotalStake)
				}

				positionsOut = append(positionsOut, map[string]any{
					"templateId":          "0x" + hex.EncodeToString(pair.TemplateID),
					"epochId":             pair.EpochID,
					"claimed":             pv.Claimed,
					"costBasisWei":        costBasis.String(),
					"markValueWei":        mark.String(),
					"unrealizedPnlWei":    un.String(),
					"pendingClaimWei":     nullBigStr(pv.PendingClaimAmount),
					"totalStakeWei":       nullBigStr(pv.TotalStake),
					"positionViewBlock":   blockNum,
				})
			}
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"wallet": wallet,
			"aggregate": map[string]any{
				"unrealizedPnlWei":       unrealizedAgg.String(),
				"realizedPnlClaimsWei":   realized.String(),
				"pendingClaimTotalWei":   pendingClaimAgg.String(),
				"totalStakeWei":          totalStakeAgg.String(),
				"referenceNetStakeWei":   new(big.Int).Add(totalStakeAgg, pendingClaimAgg).String(),
				"pnlModelNote":           portfolioPnlModelNote,
			},
			"positions": positionsOut,
			"dataFreshness": map[string]any{
				"lastSyncAt":       lastSync,
				"lastIndexedBlock": st.LastBlock,
			},
		})
	}
}

func nullBigStr(v *big.Int) string {
	if v == nil {
		return "0"
	}
	return v.String()
}
