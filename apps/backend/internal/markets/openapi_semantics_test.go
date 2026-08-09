package markets_test

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"regexp"
	"strings"
	"testing"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/getkin/kin-openapi/openapi3filter"
	"github.com/getkin/kin-openapi/routers"
	"github.com/getkin/kin-openapi/routers/legacy"
)

var canonicalIDPattern = regexp.MustCompile(`^polymarket:(event|market|token):`)

var decimalStringFieldNames = map[string]struct{}{
	"price":          {},
	"size":           {},
	"amount":         {},
	"bestBid":        {},
	"bestAsk":        {},
	"midpoint":       {},
	"spread":         {},
	"minOrderSize":   {},
	"tickSize":       {},
	"lastTradePrice": {},
	"bidDepth":       {},
	"askDepth":       {},
}

func marketsOpenAPISpecPath() string {
	return filepath.Join("..", "..", "..", "..", "schemas", "openapi", "markets-v1.yaml")
}

func loadMarketsOpenAPISpec(t *testing.T) (*openapi3.T, routers.Router) {
	t.Helper()
	loader := openapi3.NewLoader()
	doc, err := loader.LoadFromFile(marketsOpenAPISpecPath())
	if err != nil {
		t.Fatalf("load spec: %v", err)
	}
	if err := doc.Validate(context.Background()); err != nil {
		t.Fatalf("validate spec: %v", err)
	}
	router, err := legacy.NewRouter(doc)
	if err != nil {
		t.Fatalf("router: %v", err)
	}
	return doc, router
}

func validateOpenAPIResponse(t *testing.T, router routers.Router, req *http.Request, rec *httptest.ResponseRecorder) {
	t.Helper()
	if rec.Code == http.StatusNotModified {
		return
	}
	route, pathParams, err := router.FindRoute(req)
	if err != nil {
		t.Fatalf("find route %s: %v", req.URL.Path, err)
	}
	input := &openapi3filter.ResponseValidationInput{
		RequestValidationInput: &openapi3filter.RequestValidationInput{
			Request:    req,
			PathParams: pathParams,
			Route:      route,
		},
		Status: rec.Code,
		Header: rec.Header(),
	}
	input.SetBodyBytes(rec.Body.Bytes())
	if err := openapi3filter.ValidateResponse(context.Background(), input); err != nil {
		t.Fatalf("openapi response validation failed for %s: %v body=%s", req.URL.Path, err, rec.Body.String())
	}
}

func decodeJSONBody(t *testing.T, raw []byte) map[string]any {
	t.Helper()
	var body map[string]any
	if err := json.Unmarshal(raw, &body); err != nil {
		t.Fatalf("decode json: %v body=%s", err, string(raw))
	}
	return body
}

func assertNoBinaryFloats(t *testing.T, raw []byte) {
	t.Helper()
	var value any
	if err := json.Unmarshal(raw, &value); err != nil {
		t.Fatalf("decode json: %v", err)
	}
	walkNoBinaryFloats(t, value, "$", "")
}

func walkNoBinaryFloats(t *testing.T, value any, path string, field string) {
	t.Helper()
	switch v := value.(type) {
	case float64:
		if _, isDecimalField := decimalStringFieldNames[field]; isDecimalField {
			t.Fatalf("decimal field %q at %s must be encoded as string, got number %v", field, path, v)
		}
		if math.IsNaN(v) || math.IsInf(v, 0) || v != math.Trunc(v) {
			t.Fatalf("binary float at %s", path)
		}
	case float32:
		t.Fatalf("binary float at %s", path)
	case map[string]any:
		for key, child := range v {
			walkNoBinaryFloats(t, child, path+"."+key, key)
		}
	case []any:
		for i, child := range v {
			walkNoBinaryFloats(t, child, fmt.Sprintf("%s[%d]", path, i), field)
		}
	}
}

func assertFreshnessProvenance(t *testing.T, obj map[string]any) {
	t.Helper()
	assertObjectField(t, obj, "freshness", func(freshness map[string]any) {
		requireNonEmptyString(t, freshness, "state")
		requireNonEmptyString(t, freshness, "observedAt")
	})
	assertObjectField(t, obj, "provenance", func(provenance map[string]any) {
		requireNonEmptyString(t, provenance, "source")
		requireNonEmptyString(t, provenance, "observedAt")
	})
}

func assertCanonicalID(t *testing.T, id string, kind string) {
	t.Helper()
	expected := "polymarket:" + kind + ":"
	if !strings.HasPrefix(id, expected) {
		t.Fatalf("id %q does not have prefix %q", id, expected)
	}
	if !canonicalIDPattern.MatchString(id) {
		t.Fatalf("id %q is not canonical", id)
	}
}

func assertDecimalFieldsAreStrings(t *testing.T, obj map[string]any, keys ...string) {
	t.Helper()
	for _, key := range keys {
		raw, ok := obj[key]
		if !ok || raw == nil {
			continue
		}
		if _, ok := raw.(string); !ok {
			t.Fatalf("field %q expected decimal string, got %T (%v)", key, raw, raw)
		}
	}
}

func assertNoMoneyAmountObjects(t *testing.T, raw []byte) {
	t.Helper()
	var value any
	if err := json.Unmarshal(raw, &value); err != nil {
		t.Fatalf("decode json: %v", err)
	}
	walkNoMoneyAmountObjects(t, value, "$")
}

func walkNoMoneyAmountObjects(t *testing.T, value any, path string) {
	t.Helper()
	obj, ok := value.(map[string]any)
	if !ok {
		switch v := value.(type) {
		case []any:
			for i, child := range v {
				walkNoMoneyAmountObjects(t, child, fmt.Sprintf("%s[%d]", path, i))
			}
		}
		return
	}
	if looksLikeMoneyAmount(obj) {
		t.Fatalf("MoneyAmount-shaped object at %s", path)
	}
	for key, child := range obj {
		walkNoMoneyAmountObjects(t, child, path+"."+key)
	}
}

func looksLikeMoneyAmount(obj map[string]any) bool {
	_, hasAmount := obj["amount"]
	_, hasCurrency := obj["currency"]
	_, hasDecimals := obj["decimals"]
	return hasAmount && hasCurrency && hasDecimals
}

func assertObjectField(t *testing.T, obj map[string]any, key string, fn func(map[string]any)) {
	t.Helper()
	raw, ok := obj[key]
	if !ok {
		t.Fatalf("missing %q", key)
	}
	nested, ok := raw.(map[string]any)
	if !ok {
		t.Fatalf("%q is not an object", key)
	}
	fn(nested)
}

func requireNonEmptyString(t *testing.T, obj map[string]any, key string) {
	t.Helper()
	raw, ok := obj[key]
	if !ok {
		t.Fatalf("missing %q", key)
	}
	value, ok := raw.(string)
	if !ok || strings.TrimSpace(value) == "" {
		t.Fatalf("%q expected non-empty string, got %v", key, raw)
	}
}

func assertEventsListSemantics(t *testing.T, body map[string]any) {
	t.Helper()
	assertFreshnessProvenance(t, body)
	events, ok := body["events"].([]any)
	if !ok {
		t.Fatal("events is not an array")
	}
	for i, raw := range events {
		event, ok := raw.(map[string]any)
		if !ok {
			t.Fatalf("events[%d] is not an object", i)
		}
		if id, ok := event["id"].(string); ok {
			assertCanonicalID(t, id, "event")
		}
		assertFreshnessProvenance(t, event)
	}
}

func assertEventDetailSemantics(t *testing.T, body map[string]any) {
	t.Helper()
	assertFreshnessProvenance(t, body)
	if id, ok := body["id"].(string); ok {
		assertCanonicalID(t, id, "event")
	}
	markets, ok := body["markets"].([]any)
	if !ok {
		t.Fatal("markets is not an array")
	}
	for i, raw := range markets {
		market, ok := raw.(map[string]any)
		if !ok {
			t.Fatalf("markets[%d] is not an object", i)
		}
		if id, ok := market["id"].(string); ok {
			assertCanonicalID(t, id, "market")
		}
		assertFreshnessProvenance(t, market)
		assertOutcomeTokens(t, market)
	}
}

func assertMarketDetailSemantics(t *testing.T, body map[string]any) {
	t.Helper()
	assertFreshnessProvenance(t, body)
	if id, ok := body["id"].(string); ok {
		assertCanonicalID(t, id, "market")
	}
	assertOutcomeTokens(t, body)
}

func assertOutcomeTokens(t *testing.T, market map[string]any) {
	t.Helper()
	outcomes, ok := market["outcomes"].([]any)
	if !ok {
		return
	}
	for i, raw := range outcomes {
		outcome, ok := raw.(map[string]any)
		if !ok {
			t.Fatalf("outcomes[%d] is not an object", i)
		}
		if id, ok := outcome["id"].(string); ok && id != "" {
			assertCanonicalID(t, id, "token")
		}
		if price := outcome["price"]; price != nil {
			if _, ok := price.(string); !ok {
				t.Fatalf("outcome price expected string, got %T", price)
			}
		}
	}
}

func assertOrderBookSemantics(t *testing.T, body map[string]any) {
	t.Helper()
	assertFreshnessProvenance(t, body)
	for _, key := range []string{"bestBid", "bestAsk", "midpoint", "spread", "minOrderSize", "tickSize", "lastTradePrice"} {
		assertDecimalFieldsAreStrings(t, body, key)
	}
	for _, side := range []string{"bids", "asks"} {
		levels, ok := body[side].([]any)
		if !ok {
			continue
		}
		for i, raw := range levels {
			level, ok := raw.(map[string]any)
			if !ok {
				t.Fatalf("%s[%d] is not an object", side, i)
			}
			assertDecimalFieldsAreStrings(t, level, "price", "size")
		}
	}
}

func assertHistorySemantics(t *testing.T, body map[string]any) {
	t.Helper()
	assertFreshnessProvenance(t, body)
	points, ok := body["points"].([]any)
	if !ok {
		t.Fatal("points is not an array")
	}
	for i, raw := range points {
		point, ok := raw.(map[string]any)
		if !ok {
			t.Fatalf("points[%d] is not an object", i)
		}
		assertDecimalFieldsAreStrings(t, point, "price")
	}
}

func assertMarketHealthSemantics(t *testing.T, body map[string]any) {
	t.Helper()
	assertFreshnessProvenance(t, body)
	for _, key := range []string{"bidDepth", "askDepth", "midpoint", "spread"} {
		assertDecimalFieldsAreStrings(t, body, key)
	}
}

func assertPhaseOneReadSemantics(t *testing.T, path string, raw []byte) {
	t.Helper()
	assertNoBinaryFloats(t, raw)
	assertNoMoneyAmountObjects(t, raw)
	body := decodeJSONBody(t, raw)
	switch {
	case strings.HasSuffix(path, "/events") || strings.Contains(path, "/events?"):
		assertEventsListSemantics(t, body)
	case strings.Contains(path, "/events/"):
		assertEventDetailSemantics(t, body)
	case strings.Contains(path, "/markets/") && !strings.Contains(path, "/orderbook") && !strings.Contains(path, "/history") && !strings.Contains(path, "/health"):
		assertMarketDetailSemantics(t, body)
	case strings.Contains(path, "/orderbook"):
		assertOrderBookSemantics(t, body)
	case strings.Contains(path, "/history"):
		assertHistorySemantics(t, body)
	case strings.Contains(path, "/health"):
		assertMarketHealthSemantics(t, body)
	}
}
