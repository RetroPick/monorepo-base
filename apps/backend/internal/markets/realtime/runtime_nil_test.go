package realtime_test

import (
	"testing"

	"retropick/apps/backend/internal/markets/realtime"
)

func TestRuntimeNilReceiverHealthAndCapabilities(t *testing.T) {
	t.Parallel()
	var r *realtime.Runtime
	if got := r.HealthRealtime(); got != "disabled" {
		t.Fatalf("HealthRealtime=%q want disabled", got)
	}
	if r.CapabilitiesRealtime() {
		t.Fatal("CapabilitiesRealtime want false")
	}
	if r.CapabilitiesLiveSignals() {
		t.Fatal("CapabilitiesLiveSignals want false")
	}
	if r.Operational() {
		t.Fatal("Operational want false")
	}
	r.SetRegistryReady(true) // must not panic
}

func TestRuntimeNilStatusHealthAndCapabilities(t *testing.T) {
	t.Parallel()
	r := &realtime.Runtime{}
	if got := r.HealthRealtime(); got != "disabled" {
		t.Fatalf("HealthRealtime=%q want disabled", got)
	}
	if r.CapabilitiesRealtime() {
		t.Fatal("CapabilitiesRealtime want false")
	}
	if r.CapabilitiesLiveSignals() {
		t.Fatal("CapabilitiesLiveSignals want false")
	}
	if r.Operational() {
		t.Fatal("Operational want false")
	}
	r.SetRegistryReady(true) // must not panic
}
