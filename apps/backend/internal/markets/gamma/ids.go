package gamma

import (
	"errors"
	"strings"
)

var ErrInvalidID = errors.New("gamma invalid id")

// CanonicalEventID returns the RetroPick canonical ID for a Gamma event upstream ID.
func CanonicalEventID(upstream string) string {
	return canonicalID("event", upstream)
}

// CanonicalMarketID returns the RetroPick canonical ID for a Gamma market upstream ID.
func CanonicalMarketID(upstream string) string {
	return canonicalID("market", upstream)
}

// CanonicalTokenID returns the RetroPick canonical ID for a CLOB token upstream ID.
func CanonicalTokenID(upstream string) string {
	return canonicalID("token", upstream)
}

func canonicalID(kind, upstreamID string) string {
	return "polymarket:" + kind + ":" + strings.TrimSpace(upstreamID)
}

// ParseUpstreamID extracts the upstream ID from a canonical RetroPick ID.
func ParseUpstreamID(canonical, kind string) (string, error) {
	canonical = strings.TrimSpace(canonical)
	if canonical == "" || len(canonical) > 256 {
		return "", ErrInvalidID
	}
	prefix := "polymarket:" + kind + ":"
	if strings.HasPrefix(canonical, prefix) {
		canonical = strings.TrimPrefix(canonical, prefix)
	}
	if canonical == "" || strings.ContainsAny(canonical, "/?#") {
		return "", ErrInvalidID
	}
	return canonical, nil
}
