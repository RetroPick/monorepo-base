package markets

import (
	"os"
	"path/filepath"
	"testing"

	"gopkg.in/yaml.v3"
)

func TestMarketsOpenAPIContainsPhaseOneReadContract(t *testing.T) {
	t.Parallel()

	path := filepath.Join("..", "..", "..", "..", "schemas", "openapi", "markets-v1.yaml")
	body, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	var document struct {
		OpenAPI string            `yaml:"openapi"`
		Info    struct {
			Version string `yaml:"version"`
		} `yaml:"info"`
		Paths map[string]any    `yaml:"paths"`
		Parts openAPIComponents `yaml:"components"`
	}
	if err := yaml.Unmarshal(body, &document); err != nil {
		t.Fatalf("parse OpenAPI: %v", err)
	}
	if document.OpenAPI != "3.1.0" {
		t.Fatalf("openapi = %q", document.OpenAPI)
	}
	if document.Info.Version != "1.3.0" {
		t.Fatalf("info.version = %q", document.Info.Version)
	}

	requiredPaths := []string{
		"/markets/eligibility",
		"/markets/capabilities",
		"/markets/events",
		"/markets/events/{eventId}",
		"/markets/markets/{marketId}",
		"/markets/markets/{marketId}/orderbook",
		"/markets/markets/{marketId}/history",
		"/markets/markets/{marketId}/health",
		"/markets/intelligence/signals",
		"/markets/orders/preview",
		"/markets/orders/submit",
		"/markets/orders/{orderId}/cancel-preview",
		"/markets/orders/{orderId}/cancel",
		"/markets/me/orders",
		"/markets/me/fills",
	}
	for _, required := range requiredPaths {
		if _, ok := document.Paths[required]; !ok {
			t.Errorf("missing path %s", required)
		}
	}

	requiredSchemas := []string{
		"ApiError",
		"DecimalString",
		"MoneyAmount",
		"EventSummary",
		"EventDetail",
		"MarketSummary",
		"MarketDetail",
		"Outcome",
		"ResolutionRule",
		"ResolutionSource",
		"MarketCapability",
		"PricePoint",
		"OrderBookSnapshot",
		"OrderBookLevel",
		"MarketFreshness",
		"UpstreamProvenance",
		"PageInfo",
		"SignalEnvelope",
		"SignalEvidence",
		"MarketHealthSnapshot",
		"RealtimeEnvelope",
		"EligibilityResponse",
		"OrderPreviewRequest",
		"OrderPreviewResponse",
		"OrderPreviewHumanSummary",
		"UnsignedOrderPayload",
		"OrderSubmitRequest",
		"OrderSubmitResponse",
		"OrderCancelPreviewResponse",
		"OrderCancelRequest",
		"OrderCancelResponse",
		"OrdersListResponse",
		"FillsListResponse",
		"UserOrder",
		"UserFill",
		"OrderStatus",
	}
	for _, required := range requiredSchemas {
		if _, ok := document.Parts.Schemas[required]; !ok {
			t.Errorf("missing schema %s", required)
		}
	}

	decimalSchema, ok := document.Parts.Schemas["DecimalString"].(map[string]any)
	if !ok {
		t.Fatal("DecimalString schema is not an object")
	}
	if decimalSchema["type"] != "string" {
		t.Fatalf("DecimalString.type = %v", decimalSchema["type"])
	}

	moneySchema, ok := document.Parts.Schemas["MoneyAmount"].(map[string]any)
	if !ok {
		t.Fatal("MoneyAmount schema is not an object")
	}
	if moneySchema["type"] != "object" {
		t.Fatalf("MoneyAmount.type = %v", moneySchema["type"])
	}
}

type openAPIComponents struct {
	Schemas map[string]any `yaml:"schemas"`
}
