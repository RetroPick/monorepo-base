package positions_test

import (
	"context"
	"testing"
	"time"

	"retropick/apps/backend/internal/markets/positions"
)

func TestPostgresStorePartialEconomicsRetainsValuesAndObservationFreshness(t *testing.T) {
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
	var observedRedeemable bool
	if err := pool.QueryRow(ctx, `SELECT mark_price, realized_pnl, claimable_amount, freshness_state, redeemable_observed FROM markets_position_projections WHERE user_id = $1 AND account_wallet = $2 AND token_id = $3`, userID, wallet, complete.TokenID).Scan(&mark, &realized, &claimable, &freshness, &observedRedeemable); err != nil {
		t.Fatal(err)
	}
	if mark == nil || *mark != "0.6" || realized == nil || *realized != "2" || claimable == nil || *claimable != "6" || freshness != "fresh" || !observedRedeemable {
		t.Fatalf("partial economics persistence = mark=%v realized=%v claimable=%v freshness=%q redeemableObserved=%t", mark, realized, claimable, freshness, observedRedeemable)
	}
	if written, err := store.ApplyVenueRebuild(ctx, userID, wallet, []positions.VenuePosition{complete}, t1.Add(30*time.Second)); err != nil || written != 0 {
		t.Fatalf("stale complete rebuild = %d, %v", written, err)
	}
	if written, err := store.ApplyVenueRebuild(ctx, userID, wallet, []positions.VenuePosition{partial}, t1.Add(time.Minute)); err != nil || written != 0 {
		t.Fatalf("partial replay = %d, %v", written, err)
	}
}
