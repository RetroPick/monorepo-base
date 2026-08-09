package postgres

import (
	"testing"
)

func TestEventUpstreamTuple(t *testing.T) {
	t.Parallel()

	src, id := eventUpstreamTuple("polymarket_gamma", "polymarket:event:seed-multi", "seed-multi")
	if src != "polymarket_gamma" || id != "seed-multi" {
		t.Fatalf("explicit upstream: src=%q id=%q", src, id)
	}

	src, id = eventUpstreamTuple("polymarket_gamma", "polymarket:event:456", "")
	if src != "polymarket_gamma" || id != "456" {
		t.Fatalf("parsed upstream: src=%q id=%q", src, id)
	}

	src, id = eventUpstreamTuple("", "event-test-1", "")
	if src != "unknown" || id != "event-test-1" {
		t.Fatalf("fallback upstream: src=%q id=%q", src, id)
	}
}

func TestOutcomeUpstreamTuple(t *testing.T) {
	t.Parallel()

	src, id := outcomeUpstreamTuple("retropick_projection", "seed-token-yes")
	if src != "retropick_projection" || id != "seed-token-yes" {
		t.Fatalf("outcome tuple: src=%q id=%q", src, id)
	}
}
