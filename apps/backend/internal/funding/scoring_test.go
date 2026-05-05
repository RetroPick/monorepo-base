package funding

import "testing"

func TestValidateTransition(t *testing.T) {
	if err := ValidateTransition(StatusOptionsReady, StatusRouteSelected); err != nil {
		t.Fatalf("expected valid transition: %v", err)
	}
	if err := ValidateTransition(StatusCreated, StatusCredited); err == nil {
		t.Fatalf("expected invalid transition")
	}
}

func TestSortRoutesDeterministic(t *testing.T) {
	a := ScoreRoute(RouteOption{
		ProviderRouteID:       "b",
		EstimatedUSDCReceived: "1000000",
		MinUSDCReceived:       "999000",
	})
	b := ScoreRoute(RouteOption{
		ProviderRouteID:       "a",
		EstimatedUSDCReceived: "1000000",
		MinUSDCReceived:       "999000",
	})
	routes := []ScoredRoute{a, b}
	SortRoutes(routes)
	if routes[0].Original.ProviderRouteID != "a" {
		t.Fatalf("expected tie-break by providerRouteID, got %s", routes[0].Original.ProviderRouteID)
	}
}
