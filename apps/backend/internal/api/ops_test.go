package api

import (
	"math/big"
	"testing"
	"time"
)

func TestBuildOracleCheckpointHealthFlagsFreshnessAndConfidence(t *testing.T) {
	now := time.Unix(1_700_000_000, 0).UTC()
	checkpoint := oracleCheckpointSnapshot{
		Written:      true,
		ValueE8:      "100000000",
		ConfidenceE8: "2000000",
		PublishTime:  uint64(now.Add(-15 * time.Minute).Unix()),
	}

	row := buildOracleCheckpointHealth("checkpointA", checkpoint, now, 300, 100)

	if row["stale"] != true {
		t.Fatalf("expected stale=true, got %#v", row["stale"])
	}
	if row["confidenceExceeded"] != true {
		t.Fatalf("expected confidenceExceeded=true, got %#v", row["confidenceExceeded"])
	}
	if row["confidenceBps"] != int64(200) {
		t.Fatalf("confidenceBps = %#v, want 200", row["confidenceBps"])
	}
}

func TestMergeAuditEventsSortsNewestFirst(t *testing.T) {
	now := time.Unix(1_700_000_000, 0).UTC()
	events := mergeAuditEvents(
		[]auditEvent{
			{Kind: "incident", Timestamp: now.Add(-10 * time.Minute), Payload: map[string]any{"id": 1}},
			{Kind: "keeper_execution", Timestamp: now.Add(-1 * time.Minute), Payload: map[string]any{"id": 2}},
			{Kind: "chain_event", Timestamp: now.Add(-5 * time.Minute), Payload: map[string]any{"id": 3}},
		},
		2,
	)

	if len(events) != 2 {
		t.Fatalf("len(events) = %d, want 2", len(events))
	}
	if events[0]["kind"] != "keeper_execution" {
		t.Fatalf("events[0].kind = %#v, want keeper_execution", events[0]["kind"])
	}
	if events[1]["kind"] != "chain_event" {
		t.Fatalf("events[1].kind = %#v, want chain_event", events[1]["kind"])
	}
}

func TestConfidenceBPSFromStrings(t *testing.T) {
	got, ok := confidenceBPSFromStrings(big.NewInt(2_500_000).String(), big.NewInt(100_000_000).String())
	if !ok {
		t.Fatal("expected confidence bps")
	}
	if got != 250 {
		t.Fatalf("got %d, want 250", got)
	}
}
