package positions_test

import (
	"context"
	"testing"
	"time"

	"retropick/apps/backend/internal/markets/positions"
)

func TestPostgresStoreLatestCoverageIsIndependentFromFreshness(t *testing.T) {
	pool := positionProjectionPool(t)
	ctx := context.Background()
	store := positions.NewPostgresStore(pool)
	userID := "projection-user-economics-coverage"
	wallet := "0x1313131313131313131313131313131313131313"
	t1 := time.Date(2026, 8, 12, 17, 0, 0, 0, time.UTC)
	complete := positions.VenuePosition{TokenID: "economics-coverage-token", MarketID: "polymarket:market:economics-coverage", ConditionID: "condition-economics-coverage", Size: "10", UpstreamID: "economics-coverage-upstream", MarkPrice: "0.6", MarkPriceAvailable: true, CostBasisAmount: "5000000", CostBasisAvailable: true, UnrealizedPnL: "1", UnrealizedPnLAvailable: true, RealizedPnL: "2", RealizedPnLAvailable: true, Redeemable: true, RedeemableAvailable: true, ClaimableAmount: "6", ClaimableAmountAvailable: true}
	if _, err := store.ApplyVenueRebuild(ctx, userID, wallet, []positions.VenuePosition{complete}, t1); err != nil {
		t.Fatal(err)
	}
	partial := complete
	partial.MarkPrice, partial.CostBasisAmount, partial.UnrealizedPnL, partial.RealizedPnL, partial.ClaimableAmount = "", "", "", "", ""
	partial.MarkPriceAvailable, partial.CostBasisAvailable, partial.UnrealizedPnLAvailable, partial.RealizedPnLAvailable, partial.ClaimableAmountAvailable, partial.RedeemableAvailable = false, false, false, false, false, false
	if _, err := store.ApplyVenueRebuild(ctx, userID, wallet, []positions.VenuePosition{partial}, t1.Add(time.Minute)); err != nil {
		t.Fatal(err)
	}
	var mark, realized, claimable *string
	var freshness string
	var markObserved, basisObserved, unrealizedObserved, realizedObserved, redeemableObserved, claimableObserved bool
	if err := pool.QueryRow(ctx, `SELECT mark_price, realized_pnl, claimable_amount, freshness_state,
mark_price_observed, cost_basis_observed, unrealized_pnl_observed, realized_pnl_observed, redeemable_observed, claimable_amount_observed
FROM markets_position_projections WHERE user_id = $1 AND account_wallet = $2 AND token_id = $3`, userID, wallet, complete.TokenID).Scan(&mark, &realized, &claimable, &freshness, &markObserved, &basisObserved, &unrealizedObserved, &realizedObserved, &redeemableObserved, &claimableObserved); err != nil {
		t.Fatal(err)
	}
	if mark == nil || *mark != "0.6" || realized == nil || *realized != "2" || claimable == nil || *claimable != "6" || freshness != "fresh" {
		t.Fatalf("partial economics persistence = mark=%v realized=%v claimable=%v freshness=%q", mark, realized, claimable, freshness)
	}
	if markObserved || basisObserved || unrealizedObserved || realizedObserved || redeemableObserved || claimableObserved {
		t.Fatalf("partial latest coverage = %t %t %t %t %t %t, want all false", markObserved, basisObserved, unrealizedObserved, realizedObserved, redeemableObserved, claimableObserved)
	}
	listed, err := store.List(ctx, userID)
	if err != nil || len(listed) != 1 {
		t.Fatalf("List partial economics = %+v, %v", listed, err)
	}
	if listed[0].MarkPrice != "0.6" || listed[0].MarkPriceObserved || listed[0].RealizedPnL != "2" || listed[0].RealizedPnLObserved {
		t.Fatalf("consumer cannot distinguish retained values from latest coverage: %+v", listed[0])
	}
	if written, err := store.ApplyVenueRebuild(ctx, userID, wallet, []positions.VenuePosition{complete}, t1.Add(30*time.Second)); err != nil || written != 0 {
		t.Fatalf("stale complete rebuild = %d, %v", written, err)
	}
	if written, err := store.ApplyVenueRebuild(ctx, userID, wallet, []positions.VenuePosition{partial}, t1.Add(time.Minute)); err != nil || written != 0 {
		t.Fatalf("partial replay = %d, %v", written, err)
	}
	complete.MarkPrice, complete.CostBasisAmount, complete.UnrealizedPnL, complete.RealizedPnL, complete.ClaimableAmount = "0", "0", "0", "0", "0"
	if written, err := store.ApplyVenueRebuild(ctx, userID, wallet, []positions.VenuePosition{complete}, t1.Add(2*time.Minute)); err != nil || written != 1 {
		t.Fatalf("complete zero rebuild = %d, %v", written, err)
	}
	var basis, unrealized *string
	if err := pool.QueryRow(ctx, `SELECT mark_price, cost_basis_amount::text, unrealized_pnl, realized_pnl, claimable_amount,
mark_price_observed, cost_basis_observed, unrealized_pnl_observed, realized_pnl_observed, redeemable_observed, claimable_amount_observed
FROM markets_position_projections WHERE user_id = $1 AND account_wallet = $2 AND token_id = $3`, userID, wallet, complete.TokenID).Scan(&mark, &basis, &unrealized, &realized, &claimable, &markObserved, &basisObserved, &unrealizedObserved, &realizedObserved, &redeemableObserved, &claimableObserved); err != nil {
		t.Fatal(err)
	}
	if mark == nil || *mark != "0" || basis == nil || *basis != "0" || unrealized == nil || *unrealized != "0" || realized == nil || *realized != "0" || claimable == nil || *claimable != "0" || !markObserved || !basisObserved || !unrealizedObserved || !realizedObserved || !redeemableObserved || !claimableObserved {
		t.Fatalf("complete zero coverage/value not restored")
	}
	if _, err := pool.Exec(ctx, `UPDATE markets_position_projections SET mark_price = '01.0' WHERE user_id = $1 AND account_wallet = $2 AND token_id = $3`, userID, wallet, complete.TokenID); err == nil {
		t.Fatal("database accepted non-canonical persisted economics")
	}
}
