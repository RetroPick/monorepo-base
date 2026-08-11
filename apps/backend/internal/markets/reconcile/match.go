package reconcile

import (
	"strings"

	"retropick/apps/backend/internal/markets/clob"
	"retropick/apps/backend/internal/markets/orders"
)

// MatchResult describes how a local order matched venue rows.
type MatchResult struct {
	Order  clob.VenueOpenOrder
	Reason string
}

// MatchUnknownOrder finds a unique venue open order for a local unknown projection.
// Returns ok=false when no match or when multiple venue rows tie on fingerprint.
func MatchUnknownOrder(local orders.UserOrderRecord, venueRows []clob.VenueOpenOrder) (MatchResult, bool) {
	if local.ClientOrderID != "" {
		var matches []clob.VenueOpenOrder
		for _, row := range venueRows {
			if row.ClientOrderID == local.ClientOrderID || row.Salt == local.ClientOrderID {
				matches = append(matches, row)
			}
		}
		if len(matches) == 1 {
			return MatchResult{Order: matches[0], Reason: "client_order_id"}, true
		}
		if len(matches) > 1 {
			return MatchResult{}, false
		}
	}

	fingerprint := orderFingerprint(local)
	var matches []clob.VenueOpenOrder
	for _, row := range venueRows {
		if venueFingerprint(row) == fingerprint {
			matches = append(matches, row)
		}
	}
	if len(matches) == 1 {
		return MatchResult{Order: matches[0], Reason: "fingerprint"}, true
	}
	if len(matches) > 1 {
		return MatchResult{}, false
	}

	// Durable journal rows have signed-payload identity and must never fall back
	// to mutable display fields that can collide with another logical order.
	if local.RequestFingerprint == "" {
		if match, ok := matchOpenOrderLegacy(local, venueRows); ok {
			return MatchResult{Order: match, Reason: "legacy_fields"}, true
		}
	}
	return MatchResult{}, false
}

func orderFingerprint(local orders.UserOrderRecord) string {
	return strings.ToLower(strings.Join([]string{
		strings.TrimSpace(local.Maker),
		strings.TrimSpace(local.TokenID),
		strings.TrimSpace(local.Salt),
		strings.TrimSpace(local.MakerAmount),
		strings.TrimSpace(local.TakerAmount),
	}, "|"))
}

func venueFingerprint(row clob.VenueOpenOrder) string {
	return strings.ToLower(strings.Join([]string{
		strings.TrimSpace(row.Maker),
		strings.TrimSpace(row.TokenID),
		strings.TrimSpace(row.Salt),
		strings.TrimSpace(row.MakerAmount),
		strings.TrimSpace(row.TakerAmount),
	}, "|"))
}

func matchOpenOrderLegacy(local orders.UserOrderRecord, venueRows []clob.VenueOpenOrder) (clob.VenueOpenOrder, bool) {
	for _, row := range venueRows {
		if row.TokenID != local.TokenID {
			continue
		}
		if !strings.EqualFold(row.Side, local.Side) {
			continue
		}
		if row.Price != local.Price {
			continue
		}
		if row.Size != local.OriginalSize && row.Size != local.RemainingSize {
			continue
		}
		return row, true
	}
	return clob.VenueOpenOrder{}, false
}
