package funding

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

type LifiProvider struct {
	baseURL string
	client  *http.Client
}

func NewLifiProvider(baseURL string, timeout time.Duration) *LifiProvider {
	base := strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if base == "" {
		base = "https://li.quest/v1"
	}
	if timeout <= 0 {
		timeout = 4 * time.Second
	}
	return &LifiProvider{
		baseURL: base,
		client: &http.Client{
			Timeout: timeout,
		},
	}
}

func (p *LifiProvider) QuoteRoutes(ctx context.Context, req QuoteRequest) ([]RouteOption, error) {
	// LI.FI API shape evolves; keep parsing tolerant and only extract fields we score on.
	u, _ := url.Parse(p.baseURL + "/advanced/routes")
	q := u.Query()
	q.Set("fromAddress", req.Wallet)
	q.Set("toChainId", strconv.FormatInt(req.SettlementChainID, 10))
	q.Set("toTokenAddress", req.SettlementTokenAddress)
	q.Set("toAmount", req.TargetUSDCAmount)
	u.RawQuery = q.Encode()

	httpReq, _ := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	resp, err := p.client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("lifi status %d", resp.StatusCode)
	}
	var decoded struct {
		Routes []map[string]any `json:"routes"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		return nil, err
	}
	out := make([]RouteOption, 0, len(decoded.Routes))
	for i, route := range decoded.Routes {
		id := routeString(route, "id")
		if id == "" {
			id = fmt.Sprintf("route-%d", i+1)
		}
		stepCount := len(routeArray(route, "steps"))
		option := RouteOption{
			Provider:                        "LIFI",
			ProviderRouteID:                 id,
			SourceChainID:                   routeInt64(route, "fromChainId"),
			SourceTokenAddress:              routeString(route, "fromTokenAddress"),
			SourceAmount:                    routeString(route, "fromAmount"),
			EstimatedUSDCReceived:           routeString(route, "toAmount"),
			MinUSDCReceived:                 routeString(route, "toAmountMin"),
			DestinationTokenAddress:         strings.ToLower(routeString(route, "toTokenAddress")),
			ExpectedDestinationTokenAddress: strings.ToLower(req.SettlementTokenAddress),
			EstimatedGasCostUSDC:            routeFloat(route, "gasCostUSD"),
			EstimatedSlippageBps:            routeFloat(route, "slippage"),
			StepCount:                       stepCount,
			ProviderPayload:                 route,
		}
		duration := routeInt32(route, "executionDuration")
		if duration > 0 {
			option.EstimatedDurationSeconds = &duration
		}
		if sym := routeString(route, "fromTokenSymbol"); sym != "" {
			option.SourceTokenSymbol = &sym
		}
		if d := routeInt32(route, "fromTokenDecimals"); d > 0 {
			option.SourceTokenDecimals = &d
		}
		if option.MinUSDCReceived == "" {
			option.MinUSDCReceived = option.EstimatedUSDCReceived
		}
		out = append(out, option)
	}
	return out, nil
}

func routeString(m map[string]any, key string) string {
	v, ok := m[key]
	if !ok || v == nil {
		return ""
	}
	switch x := v.(type) {
	case string:
		return x
	case json.Number:
		return x.String()
	default:
		return fmt.Sprintf("%v", x)
	}
}

func routeInt64(m map[string]any, key string) int64 {
	n := routeString(m, key)
	v, _ := strconv.ParseInt(n, 10, 64)
	return v
}

func routeInt32(m map[string]any, key string) int32 {
	v, _ := strconv.ParseInt(routeString(m, key), 10, 32)
	return int32(v)
}

func routeFloat(m map[string]any, key string) float64 {
	v, _ := strconv.ParseFloat(routeString(m, key), 64)
	return v
}

func routeArray(m map[string]any, key string) []any {
	v, ok := m[key]
	if !ok || v == nil {
		return nil
	}
	if a, ok := v.([]any); ok {
		return a
	}
	return nil
}
