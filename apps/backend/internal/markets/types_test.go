package markets

import (
	"encoding/json"
	"testing"
	"time"
)

func TestParseDecimalString(t *testing.T) {
	t.Parallel()

	valid := []string{"0", "1", "0.5", "123456789.000001"}
	for _, raw := range valid {
		raw := raw
		t.Run("valid_"+raw, func(t *testing.T) {
			got, err := ParseDecimalString(raw)
			if err != nil {
				t.Fatalf("ParseDecimalString(%q): %v", raw, err)
			}
			if string(got) != raw {
				t.Fatalf("got %q", got)
			}
		})
	}

	invalid := []string{"", "-1", "+1", ".5", "1.", "01", "1e-3", "NaN", " 1"}
	for _, raw := range invalid {
		raw := raw
		t.Run("invalid_"+raw, func(t *testing.T) {
			if _, err := ParseDecimalString(raw); err == nil {
				t.Fatalf("ParseDecimalString(%q) succeeded", raw)
			}
		})
	}
}

func TestCanonicalEnumsRejectUnknownValues(t *testing.T) {
	t.Parallel()

	if MarketStatus("paused").Valid() {
		t.Fatal("unknown market status accepted")
	}
	if !MarketStatusOpen.Valid() || !MarketStatusResolved.Valid() {
		t.Fatal("canonical market status rejected")
	}
	if FreshnessState("live").Valid() {
		t.Fatal("undocumented freshness state accepted")
	}
	if !FreshnessFresh.Valid() || !FreshnessResyncing.Valid() {
		t.Fatal("canonical freshness state rejected")
	}
}

func TestMarketDetailUsesDecimalStringsAndProvenance(t *testing.T) {
	t.Parallel()

	observed := time.Date(2026, 7, 30, 1, 0, 0, 0, time.UTC)
	price, err := ParseDecimalString("0.42")
	if err != nil {
		t.Fatal(err)
	}
	detail := MarketDetail{
		SchemaVersion: "1",
		ID:            "polymarket:condition:0xabc",
		UpstreamID:    "123",
		ConditionID:   "0xabc",
		Question:      "Will it happen?",
		Status:        MarketStatusOpen,
		Outcomes: []Outcome{{
			ID:         "polymarket:token:7",
			UpstreamID: "7",
			Name:       "Yes",
			Price:      &price,
		}},
		Freshness: MarketFreshness{
			State:      FreshnessFresh,
			ObservedAt: observed,
		},
		Provenance: UpstreamProvenance{
			Source:     "polymarket_gamma",
			ObservedAt: observed,
		},
	}

	body, err := json.Marshal(detail)
	if err != nil {
		t.Fatal(err)
	}
	var decoded map[string]any
	if err := json.Unmarshal(body, &decoded); err != nil {
		t.Fatal(err)
	}
	outcomes := decoded["outcomes"].([]any)
	outcome := outcomes[0].(map[string]any)
	if outcome["price"] != "0.42" {
		t.Fatalf("price encoded as %#v", outcome["price"])
	}
	if decoded["conditionId"] != "0xabc" {
		t.Fatalf("conditionId encoded as %#v", decoded["conditionId"])
	}
}
