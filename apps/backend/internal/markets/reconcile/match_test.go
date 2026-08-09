package reconcile

import (
	"testing"

	"retropick/apps/backend/internal/markets/clob"
	"retropick/apps/backend/internal/markets/orders"
)

func TestMatchUnknownOrderByClientOrderID(t *testing.T) {
	t.Parallel()

	local := orders.UserOrderRecord{
		ClientOrderID: "coid-1",
		Maker:         "0xmaker",
		TokenID:       "tok-a",
		Salt:          "coid-1",
		MakerAmount:   "100",
		TakerAmount:   "200",
	}
	venue := []clob.VenueOpenOrder{{
		OrderID:       "venue-1",
		ClientOrderID: "coid-1",
		Maker:         "0xmaker",
		TokenID:       "tok-a",
		Salt:          "coid-1",
		MakerAmount:   "100",
		TakerAmount:   "200",
		Status:        "live",
	}}

	match, ok := MatchUnknownOrder(local, venue)
	if !ok || match.Order.OrderID != "venue-1" || match.Reason != "client_order_id" {
		t.Fatalf("match = %+v ok=%v", match, ok)
	}
}

func TestMatchUnknownOrderByFingerprint(t *testing.T) {
	t.Parallel()

	local := orders.UserOrderRecord{
		Maker:       "0xmaker",
		TokenID:     "tok-a",
		Salt:        "479249096354",
		MakerAmount: "5200000",
		TakerAmount: "10000000",
	}
	venue := []clob.VenueOpenOrder{{
		OrderID:     "venue-2",
		Maker:       "0xmaker",
		TokenID:     "tok-a",
		Salt:        "479249096354",
		MakerAmount: "5200000",
		TakerAmount: "10000000",
		Status:      "live",
	}}

	match, ok := MatchUnknownOrder(local, venue)
	if !ok || match.Order.OrderID != "venue-2" {
		t.Fatalf("match = %+v ok=%v", match, ok)
	}
}

func TestMatchUnknownOrderAmbiguousFingerprint(t *testing.T) {
	t.Parallel()

	local := orders.UserOrderRecord{
		Maker:       "0xmaker",
		TokenID:     "tok-a",
		Salt:        "479249096354",
		MakerAmount: "5200000",
		TakerAmount: "10000000",
	}
	venue := []clob.VenueOpenOrder{
		{OrderID: "venue-a", Maker: "0xmaker", TokenID: "tok-a", Salt: "479249096354", MakerAmount: "5200000", TakerAmount: "10000000"},
		{OrderID: "venue-b", Maker: "0xmaker", TokenID: "tok-a", Salt: "479249096354", MakerAmount: "5200000", TakerAmount: "10000000"},
	}

	if _, ok := MatchUnknownOrder(local, venue); ok {
		t.Fatal("expected ambiguous match to fail closed")
	}
}
