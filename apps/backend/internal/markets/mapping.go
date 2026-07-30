package markets

import (
	"crypto/sha256"
	"fmt"
	"strings"
	"time"

	"retropick/apps/backend/internal/markets/gamma"
)

func mapGammaEvent(row gamma.Event, observedAt time.Time) (EventDetail, []MarketDetail) {
	observedAt = observedAt.UTC()
	eventID := canonicalID("event", row.ID)
	freshness := MarketFreshness{State: FreshnessFresh, ObservedAt: observedAt}
	provenance := UpstreamProvenance{
		Source:          "polymarket_gamma",
		UpstreamID:      row.ID,
		ObservedAt:      observedAt,
		UpstreamUpdated: utcPointer(row.UpdatedAt),
	}
	summaries := make([]MarketSummary, 0, len(row.Markets))
	details := make([]MarketDetail, 0, len(row.Markets))
	for _, market := range row.Markets {
		summary, detail := mapGammaMarket(market, eventID, observedAt)
		summaries = append(summaries, summary)
		details = append(details, detail)
	}
	return EventDetail{
		SchemaVersion: SchemaVersion,
		ID:            eventID,
		UpstreamID:    row.ID,
		Slug:          row.Slug,
		Title:         row.Title,
		Description:   row.Description,
		Status:        mapGammaStatus(row.Active, row.Closed, row.Archived),
		StartAt:       utcPointer(row.StartDate),
		EndAt:         utcPointer(row.EndDate),
		MarketCount:   len(summaries),
		Markets:       summaries,
		Freshness:     freshness,
		Provenance:    provenance,
	}, details
}

func mapGammaMarket(row gamma.Market, eventID string, observedAt time.Time) (MarketSummary, MarketDetail) {
	observedAt = observedAt.UTC()
	marketID := canonicalID("market", row.ID)
	outcomes := make([]Outcome, 0, len(row.Outcomes))
	hasTokens := len(row.Outcomes) > 0
	for index, outcome := range row.Outcomes {
		outcomeID := canonicalID("token", outcome.TokenID)
		if outcome.TokenID == "" {
			hasTokens = false
			outcomeID = fmt.Sprintf("polymarket:outcome:%s:%d", row.ID, index)
		}
		var price *DecimalString
		if outcome.Price != "" {
			if value, err := ParseDecimalString(outcome.Price); err == nil {
				price = &value
			}
		}
		outcomes = append(outcomes, Outcome{
			ID:         outcomeID,
			UpstreamID: outcome.TokenID,
			Name:       outcome.Name,
			Price:      price,
		})
	}
	freshness := MarketFreshness{State: FreshnessFresh, ObservedAt: observedAt}
	provenance := UpstreamProvenance{
		Source:          "polymarket_gamma",
		UpstreamID:      row.ID,
		ObservedAt:      observedAt,
		UpstreamUpdated: utcPointer(row.UpdatedAt),
	}
	capabilities := MarketCapability{
		OrderBook: row.EnableOrderBook && hasTokens,
		History:   row.EnableOrderBook && hasTokens,
		Realtime:  row.EnableOrderBook && hasTokens,
		NegRisk:   row.NegRisk,
		Trading:   false,
	}
	summary := MarketSummary{
		SchemaVersion: SchemaVersion,
		ID:            marketID,
		UpstreamID:    row.ID,
		ConditionID:   row.ConditionID,
		Slug:          row.Slug,
		Question:      row.Question,
		Status:        mapGammaStatus(row.Active, row.Closed, row.Archived),
		EndAt:         utcPointer(row.EndDate),
		Outcomes:      outcomes,
		Capabilities:  capabilities,
		Freshness:     freshness,
		Provenance:    provenance,
	}
	source := strings.TrimSpace(row.ResolutionSource)
	sources := make([]ResolutionSource, 0, 1)
	if source != "" {
		sources = append(sources, ResolutionSource{
			Name: "Polymarket resolution source",
			URL:  source,
		})
	}
	detail := MarketDetail{
		SchemaVersion: summary.SchemaVersion,
		ID:            summary.ID,
		UpstreamID:    summary.UpstreamID,
		EventID:       eventID,
		ConditionID:   summary.ConditionID,
		Slug:          summary.Slug,
		Question:      summary.Question,
		Description:   row.Description,
		Status:        summary.Status,
		EndAt:         summary.EndAt,
		Outcomes:      summary.Outcomes,
		Resolution: ResolutionRule{
			Description: row.Description,
			Sources:     sources,
			ContentHash: ruleHash(row.Description, source),
			UpdatedAt:   utcPointer(row.UpdatedAt),
		},
		Capabilities: summary.Capabilities,
		Freshness:    summary.Freshness,
		Provenance:   summary.Provenance,
	}
	return summary, detail
}

func canonicalID(kind, upstreamID string) string {
	return "polymarket:" + kind + ":" + strings.TrimSpace(upstreamID)
}

func upstreamID(canonical, kind string) (string, error) {
	canonical = strings.TrimSpace(canonical)
	if canonical == "" || len(canonical) > 256 {
		return "", ErrInvalidArgument
	}
	prefix := "polymarket:" + kind + ":"
	if strings.HasPrefix(canonical, prefix) {
		canonical = strings.TrimPrefix(canonical, prefix)
	}
	if canonical == "" || strings.ContainsAny(canonical, "/?#") {
		return "", ErrInvalidArgument
	}
	return canonical, nil
}

func mapGammaStatus(active, closed, archived bool) MarketStatus {
	switch {
	case archived:
		return MarketStatusArchived
	case closed:
		return MarketStatusClosed
	case active:
		return MarketStatusOpen
	default:
		return MarketStatusUnknown
	}
}

func ruleHash(description, source string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(description) + "\x00" + strings.TrimSpace(source)))
	return fmt.Sprintf("%x", sum[:])
}

func utcPointer(value *time.Time) *time.Time {
	if value == nil {
		return nil
	}
	utc := value.UTC()
	return &utc
}

// NormalizeEventDetail fills derived EventDetail fields required by the public contract.
func NormalizeEventDetail(event EventDetail) EventDetail {
	if event.MarketCount <= 0 && len(event.Markets) > 0 {
		event.MarketCount = len(event.Markets)
	}
	return event
}
