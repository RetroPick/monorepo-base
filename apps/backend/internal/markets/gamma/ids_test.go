package gamma

import (
	"errors"
	"testing"
)

func TestCanonicalMarketIDNumericUpstream(t *testing.T) {
	t.Parallel()

	got := CanonicalMarketID("123")
	if got != "polymarket:market:123" {
		t.Fatalf("got %q", got)
	}
}

func TestCanonicalIDsTrimWhitespace(t *testing.T) {
	t.Parallel()

	if got := CanonicalEventID(" 456 "); got != "polymarket:event:456" {
		t.Fatalf("event %q", got)
	}
	if got := CanonicalTokenID("\ttoken-a\t"); got != "polymarket:token:token-a" {
		t.Fatalf("token %q", got)
	}
}

func TestParseUpstreamIDRoundtrip(t *testing.T) {
	t.Parallel()

	cases := []struct {
		kind     string
		upstream string
	}{
		{"event", "123"},
		{"market", "456"},
		{"token", "token-yes"},
	}
	for _, tc := range cases {
		var canonical string
		switch tc.kind {
		case "event":
			canonical = CanonicalEventID(tc.upstream)
		case "market":
			canonical = CanonicalMarketID(tc.upstream)
		case "token":
			canonical = CanonicalTokenID(tc.upstream)
		}
		got, err := ParseUpstreamID(canonical, tc.kind)
		if err != nil {
			t.Fatalf("%s: %v", tc.kind, err)
		}
		if got != tc.upstream {
			t.Fatalf("%s: got %q want %q", tc.kind, got, tc.upstream)
		}
	}
}

func TestParseUpstreamIDBareUpstream(t *testing.T) {
	t.Parallel()

	got, err := ParseUpstreamID("789", "market")
	if err != nil {
		t.Fatal(err)
	}
	if got != "789" {
		t.Fatalf("got %q", got)
	}
}

func TestParseUpstreamIDRejectsInvalid(t *testing.T) {
	t.Parallel()

	cases := []string{"", "polymarket:market:", "polymarket:market:bad/id", "polymarket:market:bad?id"}
	for _, input := range cases {
		_, err := ParseUpstreamID(input, "market")
		if !errors.Is(err, ErrInvalidID) {
			t.Fatalf("input %q: error %v", input, err)
		}
	}
}
