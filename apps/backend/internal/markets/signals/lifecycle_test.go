package signals

import (
	"errors"
	"testing"
	"time"
)

func sampleDraft(t *testing.T) EvidenceEnvelope {
	t.Helper()
	envelope, err := BuildEvidenceEnvelope(BuildOptions{
		SignalType: SignalTypeWhaleTrade,
		ComputedAt: time.Date(2026, 8, 9, 0, 0, 0, 0, time.UTC),
		Inputs: map[string]string{
			"tradeId": "data:trades:abc",
		},
		Metrics: map[string]int64{
			"notional": 42500000000,
		},
		ParamsRef:   "intelligence_params_v1.yaml#large_trade_v1",
		ReasonCodes: []string{"LARGE_NOTIONAL"},
	})
	if err != nil {
		t.Fatal(err)
	}
	return envelope
}

func TestPublishDraftToActive(t *testing.T) {
	t.Parallel()

	active, err := Publish(sampleDraft(t))
	if err != nil {
		t.Fatal(err)
	}
	if active.Lifecycle != LifecycleActive {
		t.Fatalf("lifecycle %q", active.Lifecycle)
	}
}

func TestPublishRejectsNonDraft(t *testing.T) {
	t.Parallel()

	draft := sampleDraft(t)
	active, err := Publish(draft)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := Publish(active); !errors.Is(err, ErrInvalidTransition) {
		t.Fatalf("err=%v", err)
	}
}

func TestMarkStaleFromActive(t *testing.T) {
	t.Parallel()

	active, err := Publish(sampleDraft(t))
	if err != nil {
		t.Fatal(err)
	}
	stale, err := MarkStale(active)
	if err != nil {
		t.Fatal(err)
	}
	if stale.Lifecycle != LifecycleStale {
		t.Fatalf("lifecycle %q", stale.Lifecycle)
	}
}

func TestRetractEvidencePreservesContentHash(t *testing.T) {
	t.Parallel()

	active, err := Publish(sampleDraft(t))
	if err != nil {
		t.Fatal(err)
	}
	originalHash := active.Hash
	originalInputs := copyStringMap(active.Inputs)
	originalMetrics := copyInt64Map(active.Metrics)
	retractedAt := time.Date(2026, 8, 9, 1, 0, 0, 0, time.UTC)
	retracted, err := RetractEvidence(active, "SOURCE_CORRECTED", retractedAt)
	if err != nil {
		t.Fatal(err)
	}
	if retracted.Hash != originalHash {
		t.Fatalf("hash changed %q -> %q", originalHash, retracted.Hash)
	}
	if retracted.Inputs["tradeId"] != originalInputs["tradeId"] {
		t.Fatal("inputs changed")
	}
	if retracted.Metrics["notional"] != originalMetrics["notional"] {
		t.Fatal("metrics changed")
	}
	if retracted.RetractedAt == nil || !retracted.RetractedAt.Equal(retractedAt) {
		t.Fatalf("retractedAt %+v", retracted.RetractedAt)
	}
	if err := Validate(retracted); err != nil {
		t.Fatal(err)
	}
}

func TestSupersedeLinksSuccessor(t *testing.T) {
	t.Parallel()

	active, err := Publish(sampleDraft(t))
	if err != nil {
		t.Fatal(err)
	}
	successor := "sha256:deadbeef"
	superseded, err := Supersede(active, successor)
	if err != nil {
		t.Fatal(err)
	}
	if superseded.Lifecycle != LifecycleSuperseded {
		t.Fatalf("lifecycle %q", superseded.Lifecycle)
	}
	if superseded.SupersededBy == nil || *superseded.SupersededBy != successor {
		t.Fatalf("supersededBy %+v", superseded.SupersededBy)
	}
}

func TestRetractRejectsDraft(t *testing.T) {
	t.Parallel()

	if _, err := RetractEvidence(sampleDraft(t), "SOURCE_CORRECTED", time.Now().UTC()); !errors.Is(err, ErrInvalidTransition) {
		t.Fatalf("err=%v", err)
	}
}

func TestDetectHashMismatch(t *testing.T) {
	t.Parallel()

	existing, err := BuildEvidenceEnvelope(BuildOptions{
		SignalType:  SignalTypeWhaleTrade,
		ComputedAt:  time.Date(2026, 8, 9, 0, 0, 0, 0, time.UTC),
		Inputs:      map[string]string{"tradeId": "data:trades:abc"},
		Metrics:     map[string]int64{"notional": 42500000000},
		ParamsRef:   "intelligence_params_v1.yaml#large_trade_v1",
		ReasonCodes: []string{"LARGE_NOTIONAL"},
	})
	if err != nil {
		t.Fatal(err)
	}
	recomputed, err := BuildEvidenceEnvelope(BuildOptions{
		SignalType:  SignalTypeWhaleTrade,
		ComputedAt:  time.Date(2026, 8, 9, 0, 0, 0, 0, time.UTC),
		Inputs:      map[string]string{"tradeId": "data:trades:abc"},
		Metrics:     map[string]int64{"notional": 999},
		ParamsRef:   "intelligence_params_v1.yaml#large_trade_v1",
		ReasonCodes: []string{"LARGE_NOTIONAL"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if !DetectHashMismatch(existing, recomputed) {
		t.Fatal("expected hash mismatch")
	}
	same, err := BuildEvidenceEnvelope(BuildOptions{
		SignalType:  SignalTypeWhaleTrade,
		ComputedAt:  time.Date(2026, 8, 9, 0, 0, 0, 0, time.UTC),
		Inputs:      map[string]string{"tradeId": "data:trades:abc"},
		Metrics:     map[string]int64{"notional": 42500000000},
		ParamsRef:   "intelligence_params_v1.yaml#large_trade_v1",
		ReasonCodes: []string{"LARGE_NOTIONAL"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if DetectHashMismatch(existing, same) {
		t.Fatal("expected matching hash")
	}
}

func TestStaleAfter(t *testing.T) {
	t.Parallel()

	active, err := Publish(sampleDraft(t))
	if err != nil {
		t.Fatal(err)
	}
	computedAt := active.ComputedAt
	if StaleAfter(active, computedAt.Add(time.Hour), 2*time.Hour) {
		t.Fatal("should not be stale yet")
	}
	if !StaleAfter(active, computedAt.Add(3*time.Hour), 2*time.Hour) {
		t.Fatal("expected stale")
	}
}
