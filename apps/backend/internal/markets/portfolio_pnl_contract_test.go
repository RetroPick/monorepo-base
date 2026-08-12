package markets_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"gopkg.in/yaml.v3"
)

func TestPortfolioPnLAggregateFailsClosedForUnavailableMetricSources(t *testing.T) {
	t.Parallel()

	path := filepath.Join("..", "..", "..", "..", "schemas", "openapi", "markets-v1.yaml")
	body, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}

	var document struct {
		Components struct {
			Schemas map[string]map[string]any `yaml:"schemas"`
		} `yaml:"components"`
		Paths map[string]map[string]map[string]any `yaml:"paths"`
	}
	if err := yaml.Unmarshal(body, &document); err != nil {
		t.Fatalf("parse OpenAPI: %v", err)
	}

	aggregate := document.Components.Schemas["PortfolioPnLAggregate"]
	requireNullableMoneyMetric(t, aggregate, "totalMarkValue")
	requireNullableMoneyMetric(t, aggregate, "unrealizedPnl")
	requireNullableMoneyMetric(t, aggregate, "realizedPnl")
	for _, metric := range []string{"totalMarkValue", "unrealizedPnl", "realizedPnl", "availability"} {
		requireAggregateRequiredField(t, aggregate, metric)
	}

	availability, ok := aggregate["properties"].(map[string]any)["availability"].(map[string]any)
	if !ok {
		t.Fatal("PortfolioPnLAggregate.availability must describe metric source coverage")
	}
	if _, ok := availability["$ref"].(string); !ok {
		t.Fatal("PortfolioPnLAggregate.availability must reference a shared availability schema")
	}

	summary := document.Paths["/markets/me/portfolio/summary"]
	get, ok := summary["get"]
	if !ok {
		t.Fatal("missing GET /markets/me/portfolio/summary")
	}
	responses, ok := get["responses"].(map[string]any)
	if !ok {
		t.Fatal("summary responses missing")
	}
	response200, ok := responses["200"].(map[string]any)
	if !ok {
		t.Fatal("summary 200 response missing")
	}
	content, ok := response200["content"].(map[string]any)
	if !ok {
		t.Fatal("summary 200 content missing")
	}
	jsonContent, ok := content["application/json"].(map[string]any)
	if !ok {
		t.Fatal("summary JSON content missing")
	}
	examples, ok := jsonContent["examples"].(map[string]any)
	if !ok {
		t.Fatal("summary examples missing")
	}

	assertPortfolioSummaryExample(t, examples, "completePortfolio", false, false, 1)
	assertPortfolioSummaryExample(t, examples, "partialPortfolio", true, false, 2)
	assertPortfolioSummaryExample(t, examples, "zeroOpenPositions", false, true, 0)
	assertPortfolioSummaryExamplesConform(t, examples)

	generatedPath := filepath.Join("..", "..", "..", "..", "packages", "polymarket", "src", "generated", "api.ts")
	generated, err := os.ReadFile(generatedPath)
	if err != nil {
		t.Fatal(err)
	}
	for _, requiredType := range []string{
		"totalMarkValue: components[\"schemas\"][\"MoneyAmount\"] | null;",
		"unrealizedPnl: components[\"schemas\"][\"MoneyAmount\"] | null;",
		"realizedPnl: components[\"schemas\"][\"MoneyAmount\"] | null;",
		"availability: components[\"schemas\"][\"PortfolioPnLAvailability\"];",
	} {
		if !strings.Contains(string(generated), requiredType) {
			t.Fatalf("generated TypeScript must preserve required nullability: missing %q", requiredType)
		}
	}
}

func assertPortfolioSummaryExamplesConform(t *testing.T, examples map[string]any) {
	t.Helper()
	_, router := loadMarketsOpenAPISpec(t)
	for _, name := range []string{"completePortfolio", "partialPortfolio", "zeroOpenPositions"} {
		name := name
		t.Run(name, func(t *testing.T) {
			example, ok := examples[name].(map[string]any)
			if !ok {
				t.Fatalf("missing %s example", name)
			}
			body, err := json.Marshal(example["value"])
			if err != nil {
				t.Fatalf("marshal %s example: %v", name, err)
			}
			req := httptest.NewRequest(http.MethodGet, "/api/v1/markets/me/portfolio/summary", nil)
			rec := httptest.NewRecorder()
			rec.Header().Set("Content-Type", "application/json")
			rec.WriteHeader(http.StatusOK)
			_, _ = rec.Write(body)
			validateOpenAPIResponse(t, router, req, rec)
		})
	}
}

func requireAggregateRequiredField(t *testing.T, aggregate map[string]any, name string) {
	t.Helper()
	required, ok := aggregate["required"].([]any)
	if !ok {
		t.Fatal("PortfolioPnLAggregate.required missing")
	}
	for _, field := range required {
		if field == name {
			return
		}
	}
	t.Fatalf("PortfolioPnLAggregate.%s must be required so clients distinguish null from omission", name)
}

func requireNullableMoneyMetric(t *testing.T, aggregate map[string]any, name string) {
	t.Helper()
	properties, ok := aggregate["properties"].(map[string]any)
	if !ok {
		t.Fatal("PortfolioPnLAggregate.properties missing")
	}
	property, ok := properties[name].(map[string]any)
	if !ok {
		t.Fatalf("PortfolioPnLAggregate.%s missing", name)
	}
	oneOf, ok := property["oneOf"].([]any)
	if !ok || len(oneOf) != 2 {
		t.Fatalf("PortfolioPnLAggregate.%s must permit MoneyAmount or null", name)
	}
	if nullable, ok := oneOf[1].(map[string]any); !ok || nullable["type"] != "null" {
		t.Fatalf("PortfolioPnLAggregate.%s must permit null", name)
	}
}

func assertPortfolioSummaryExample(t *testing.T, examples map[string]any, name string, missingMarkValue, missingRealizedPnl bool, openPositionCount int) {
	t.Helper()
	example, ok := examples[name].(map[string]any)
	if !ok {
		t.Fatalf("missing %s example", name)
	}
	value, ok := example["value"].(map[string]any)
	if !ok {
		t.Fatalf("%s example value missing", name)
	}
	aggregate, ok := value["aggregate"].(map[string]any)
	if !ok {
		t.Fatalf("%s aggregate missing", name)
	}
	assertMetricExample(t, aggregate, "totalMarkValue", missingMarkValue)
	assertMetricExample(t, aggregate, "unrealizedPnl", missingMarkValue)
	assertMetricExample(t, aggregate, "realizedPnl", missingRealizedPnl)
	if got, ok := aggregate["openPositionCount"].(int); !ok || got != openPositionCount {
		t.Fatalf("%s openPositionCount = %v, want %d", name, aggregate["openPositionCount"], openPositionCount)
	}

	availability, ok := aggregate["availability"].(map[string]any)
	if !ok {
		t.Fatalf("%s availability missing", name)
	}
	assertMarkValueAvailabilityExample(t, availability, missingMarkValue, openPositionCount)
	assertRealizedPnlAvailabilityExample(t, availability, missingRealizedPnl)
}

func assertMetricExample(t *testing.T, aggregate map[string]any, name string, unavailable bool) {
	t.Helper()
	value, found := aggregate[name]
	if unavailable && (!found || value != nil) {
		t.Fatalf("%s must set %s to null when its source coverage is incomplete", name, name)
	}
	if !unavailable && (!found || value == nil) {
		t.Fatalf("%s must provide %s when its source coverage is complete", name, name)
	}
}

func assertMarkValueAvailabilityExample(t *testing.T, availability map[string]any, unavailable bool, openPositionCount int) {
	t.Helper()
	metric, ok := availability["markValue"].(map[string]any)
	if !ok {
		t.Fatal("availability.markValue missing")
	}
	state, _ := metric["state"].(string)
	want := "available"
	if unavailable {
		want = "unavailable"
	}
	if state != want {
		t.Fatalf("availability.markValue.state = %q, want %q", state, want)
	}
	available, availableOK := metric["availableOpenPositionCount"].(int)
	unavailableCount, unavailableOK := metric["unavailableOpenPositionCount"].(int)
	if !availableOK || !unavailableOK || available+unavailableCount != openPositionCount {
		t.Fatalf("mark availability counts = %v + %v, want sum %d", metric["availableOpenPositionCount"], metric["unavailableOpenPositionCount"], openPositionCount)
	}
}

func assertRealizedPnlAvailabilityExample(t *testing.T, availability map[string]any, unavailable bool) {
	t.Helper()
	metric, ok := availability["realizedPnl"].(map[string]any)
	if !ok {
		t.Fatal("availability.realizedPnl missing")
	}
	state, _ := metric["state"].(string)
	want := "available"
	if unavailable {
		want = "unavailable"
	}
	if state != want {
		t.Fatalf("availability.realizedPnl.state = %q, want %q", state, want)
	}
}
