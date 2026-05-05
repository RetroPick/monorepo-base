package funding

import "sort"

func ScoreRoute(route RouteOption) ScoredRoute {
	est, _ := decimalToInt(route.EstimatedUSDCReceived)
	min, _ := decimalToInt(route.MinUSDCReceived)
	duration := int32(0)
	if route.EstimatedDurationSeconds != nil {
		duration = *route.EstimatedDurationSeconds
	}
	score := float64(est)
	score -= route.EstimatedGasCostUSDC * 1_000_000.0
	score -= float64(duration) * 10_000.0
	score -= route.EstimatedSlippageBps * 5_000.0
	score -= route.ProviderRiskPenalty * 100_000.0
	score -= float64(route.StepCount) * 50_000.0
	// Favor tighter min receive as deterministic tie-break weight.
	score += float64(min) * 0.000001
	return ScoredRoute{Original: route, Score: score}
}

func SortRoutes(routes []ScoredRoute) {
	sort.SliceStable(routes, func(i, j int) bool {
		if routes[i].Score == routes[j].Score {
			if routes[i].Original.EstimatedUSDCReceived == routes[j].Original.EstimatedUSDCReceived {
				return routes[i].Original.ProviderRouteID < routes[j].Original.ProviderRouteID
			}
			return routes[i].Original.EstimatedUSDCReceived > routes[j].Original.EstimatedUSDCReceived
		}
		return routes[i].Score > routes[j].Score
	})
}
