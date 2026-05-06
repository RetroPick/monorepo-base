package api

import (
	"encoding/hex"
	"encoding/json"
	"math/big"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/dbqueries"
	"retropick/apps/backend/internal/ethops"
	"retropick/apps/backend/internal/portfoliopnl"
	"retropick/apps/backend/internal/registry"
)

const portfolioSummaryMaxPairs = 48

// UserPortfolioSummaryHandler returns aggregate PnL and per-position metrics derived from indexer events + live RPC views.
func UserPortfolioSummaryHandler(pool *pgxpool.Pool, eth *ethops.Caller, reg *registry.Registry) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		_ = eth
		_ = reg
		wallet, ok := requireAuthorizedWalletQuery(w, r, "wallet")
		if !ok {
			return
		}
		ctx := r.Context()
		q := dbqueries.New(pool)
		st, err := q.GetIndexerState(ctx)
		if err != nil {
			writeAPIError(w, http.StatusInternalServerError, "DB", "could not load indexer state", nil)
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
			writeAPIError(w, http.StatusInternalServerError, "DB", "could not load user positions", nil)
			return
		}

		claimsRows, err := q.ListUserClaimedEvents(ctx, dbqueries.ListUserClaimedEventsParams{
			UserAddress: wallet,
			Limit:       500,
		})
		if err != nil {
			writeAPIError(w, http.StatusInternalServerError, "DB", "could not load claimed events", nil)
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

		projected, err := indexedUserPositions(ctx, pool, wallet, nil)
		if err != nil {
			writeAPIError(w, http.StatusInternalServerError, "DB", "could not project indexed user positions", nil)
			return
		}
		projectedByPair := make(map[string]map[string]any, len(projected))
		for _, p := range projected {
			tid, _ := p["templateId"].(string)
			eid, _ := p["epochId"].(int64)
			if eid == 0 {
				if f, ok := p["epochId"].(float64); ok {
					eid = int64(f)
				}
			}
			projectedByPair[strings.TrimPrefix(strings.ToLower(tid), "0x")+":"+strconv.FormatInt(eid, 10)] = p
		}
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
				writeAPIError(w, http.StatusInternalServerError, "DB", "could not load user chain events", nil)
				return
			}
			costBasis := portfoliopnl.CostBasisWeiFromEvents(evRows)
			p := projectedByPair[hex.EncodeToString(pair.TemplateID)+":"+strconv.FormatInt(pair.EpochID, 10)]
			totalStake := bigFromAny(p["totalStake"])
			pendingClaim := bigFromAny(p["pendingClaimAmount"])
			claimed, _ := p["claimed"].(bool)
			un := portfoliopnl.UnrealizedWei(claimed, totalStake, costBasis)
			unrealizedAgg.Add(unrealizedAgg, un)
			pendingClaimAgg.Add(pendingClaimAgg, pendingClaim)
			totalStakeAgg.Add(totalStakeAgg, totalStake)
			positionsOut = append(positionsOut, map[string]any{
				"templateId":        "0x" + hex.EncodeToString(pair.TemplateID),
				"epochId":           pair.EpochID,
				"claimed":           claimed,
				"costBasisWei":      costBasis.String(),
				"markValueWei":      totalStake.String(),
				"unrealizedPnlWei":  un.String(),
				"pendingClaimWei":   pendingClaim.String(),
				"totalStakeWei":     totalStake.String(),
				"positionViewBlock": p["positionViewBlock"],
				"source":            "indexed_projection",
			})
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"wallet": wallet,
			"aggregate": map[string]any{
				"unrealizedPnlWei":     unrealizedAgg.String(),
				"realizedPnlClaimsWei": realized.String(),
				"pendingClaimTotalWei": pendingClaimAgg.String(),
				"totalStakeWei":        totalStakeAgg.String(),
				"referenceNetStakeWei": new(big.Int).Add(totalStakeAgg, pendingClaimAgg).String(),
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

func bigFromAny(v any) *big.Int {
	switch x := v.(type) {
	case string:
		if n, ok := new(big.Int).SetString(x, 10); ok {
			return n
		}
	case *big.Int:
		if x != nil {
			return new(big.Int).Set(x)
		}
	}
	return new(big.Int)
}
