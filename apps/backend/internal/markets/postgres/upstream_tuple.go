package postgres

import (
	"strings"

	"retropick/apps/backend/internal/markets/gamma"
)

func upstreamSource(source string) string {
	source = strings.TrimSpace(source)
	if source == "" {
		return "unknown"
	}
	return source
}

func eventUpstreamTuple(source, canonicalID, explicitUpstreamID string) (string, string) {
	return catalogUpstreamTuple(source, canonicalID, explicitUpstreamID, "event")
}

func marketUpstreamTuple(source, canonicalID, explicitUpstreamID string) (string, string) {
	return catalogUpstreamTuple(source, canonicalID, explicitUpstreamID, "market")
}

func outcomeUpstreamTuple(source, upstreamTokenID string) (string, string) {
	return upstreamSource(source), strings.TrimSpace(upstreamTokenID)
}

func ruleUpstreamTuple(marketSource, marketUpstreamID string) (string, string) {
	return upstreamSource(marketSource), strings.TrimSpace(marketUpstreamID)
}

func rawEventUpstreamTuple(source, upstreamEventID string) (string, string) {
	return upstreamSource(source), strings.TrimSpace(upstreamEventID)
}

func checkpointUpstreamSource(source string) string {
	return upstreamSource(source)
}

func catalogUpstreamTuple(source, canonicalID, explicitUpstreamID, kind string) (string, string) {
	upstreamSrc := upstreamSource(source)
	if explicitUpstreamID = strings.TrimSpace(explicitUpstreamID); explicitUpstreamID != "" {
		return upstreamSrc, explicitUpstreamID
	}
	if parsed, err := gamma.ParseUpstreamID(canonicalID, kind); err == nil {
		return upstreamSrc, parsed
	}
	return upstreamSrc, strings.TrimSpace(canonicalID)
}
