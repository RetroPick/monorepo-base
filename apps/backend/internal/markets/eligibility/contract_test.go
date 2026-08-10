package eligibility_test

import (
	"encoding/json"
	"testing"
	"time"

	"retropick/apps/backend/internal/markets/eligibility"
)

func TestDecisionJSONMatchesEligibilityResponseShape(t *testing.T) {
	t.Parallel()

	fixed := time.Date(2026, 8, 9, 10, 0, 0, 0, time.UTC)
	decision := eligibility.FailClosed(eligibility.ReasonGeoblockUpstreamUnavailable, fixed)
	decision.Region = "US"

	raw, err := json.Marshal(struct {
		Eligible  bool      `json:"eligible"`
		Reason    string    `json:"reason,omitempty"`
		CheckedAt time.Time `json:"checkedAt"`
		Region    string    `json:"region,omitempty"`
	}{
		Eligible:  decision.Eligible,
		Reason:    decision.Reason,
		CheckedAt: decision.CheckedAt,
		Region:    decision.Region,
	})
	if err != nil {
		t.Fatal(err)
	}

	var body map[string]any
	if err := json.Unmarshal(raw, &body); err != nil {
		t.Fatal(err)
	}
	if body["eligible"] != false {
		t.Fatalf("eligible %v", body["eligible"])
	}
	if body["reason"] != eligibility.ReasonGeoblockUpstreamUnavailable {
		t.Fatalf("reason %v", body["reason"])
	}
	if body["checkedAt"] == "" {
		t.Fatal("missing checkedAt")
	}
	if body["region"] != "US" {
		t.Fatalf("region %v", body["region"])
	}
}
