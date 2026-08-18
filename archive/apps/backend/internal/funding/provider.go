package funding

import (
	"context"
	"strconv"
)

type QuoteProvider interface {
	QuoteRoutes(ctx context.Context, req QuoteRequest) ([]RouteOption, error)
}

type QuoteRequest struct {
	IntentID               any
	Wallet                 string
	TargetUSDCAmount       string
	SettlementChainID      int64
	SettlementTokenAddress string
}

type RouteOption struct {
	Provider                        string
	ProviderRouteID                 string
	SourceChainID                   int64
	SourceTokenAddress              string
	SourceTokenSymbol               *string
	SourceTokenDecimals             *int32
	SourceAmount                    string
	EstimatedUSDCReceived           string
	MinUSDCReceived                 string
	EstimatedDurationSeconds        *int32
	EstimatedGasCostUSDC            float64
	EstimatedSlippageBps            float64
	ProviderRiskPenalty             float64
	StepCount                       int
	DestinationTokenAddress         string
	ExpectedDestinationTokenAddress string
	ProviderPayload                 map[string]any
}

type ScoredRoute struct {
	Original RouteOption
	Score    float64
}

func decimalToInt(s string) (int64, bool) {
	n, err := strconv.ParseInt(s, 10, 64)
	return n, err == nil && n >= 0
}
