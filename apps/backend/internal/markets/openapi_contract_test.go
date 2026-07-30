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
		Paths   map[string]any    `yaml:"paths"`
		Parts   openAPIComponents `yaml:"components"`
	}
	if err := yaml.Unmarshal(body, &document); err != nil {
		t.Fatalf("parse OpenAPI: %v", err)
	}
	if document.OpenAPI != "3.1.0" {
		t.Fatalf("openapi = %q", document.OpenAPI)
	}

	requiredPaths := []string{
		"/markets/capabilities",
		"/markets/events",
		"/markets/events/{eventId}",
		"/markets/markets/{marketId}",
		"/markets/markets/{marketId}/orderbook",
		"/markets/markets/{marketId}/history",
		"/markets/markets/{marketId}/health",
		"/markets/intelligence/signals",
	}
	for _, required := range requiredPaths {
		if _, ok := document.Paths[required]; !ok {
			t.Errorf("missing path %s", required)
		}
	}

	requiredSchemas := []string{
		"ApiError",
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
	}
	for _, required := range requiredSchemas {
		if _, ok := document.Parts.Schemas[required]; !ok {
			t.Errorf("missing schema %s", required)
		}
	}
}

type openAPIComponents struct {
	Schemas map[string]any `yaml:"schemas"`
}
