package provenance

import (
	"fmt"
	"strconv"
	"time"

	"retropick/apps/backend/internal/markets/intelligence/params"
	"retropick/apps/backend/internal/markets/intelligence/model"
	"retropick/apps/backend/internal/markets/intelligence/whale"
	"retropick/apps/backend/internal/markets/signals"
)

// Writer builds ADR-008 evidence envelopes for whale events.
type Writer struct {
	ParamsRef string
}

func NewWriter() Writer {
	return Writer{ParamsRef: params.ParamsRef}
}

// BuildWhaleEnvelope constructs and publishes an active envelope for a whale event.
func (w Writer) BuildWhaleEnvelope(
	trade model.NormalizedTrade,
	result whale.ClassifyResult,
	computedAt time.Time,
) (signals.EvidenceEnvelope, error) {
	metrics := map[string]int64{
		"notionalMinor":      trade.NotionalMinor,
		"whaleScoreMicro":    int64(result.WhaleScore * 100),
		"pctRecentVolumeBps": result.PctRecentVolumeBps,
		"tauMarketMinor":     result.TauMarketMinor,
	}
	if result.ImpactUnavailable {
		metrics["impactUnavailable"] = 1
	}

	inputs := map[string]string{
		"source":          trade.Source,
		"upstreamTradeId": trade.UpstreamTradeID,
		"marketId":        trade.MarketID,
		"walletAddress":   trade.WalletAddress,
		"side":            string(trade.Side),
		"outcome":         trade.Outcome,
		"fingerprint":     result.Fingerprint,
		"tradedAt":        trade.TradedAt.UTC().Format(time.RFC3339Nano),
	}
	if result.ImpactUnavailable {
		inputs["impactFlag"] = "impact_unavailable"
	}

	reasonCodes := result.ReasonCodes
	if len(reasonCodes) == 0 {
		return signals.EvidenceEnvelope{}, fmt.Errorf("whale envelope requires reason codes")
	}

	draft, err := signals.BuildEvidenceEnvelope(signals.BuildOptions{
		SignalType:  signals.SignalTypeWhaleTrade,
		ComputedAt:  computedAt,
		Inputs:      inputs,
		Metrics:     metrics,
		ParamsRef:   w.ParamsRef,
		ReasonCodes: reasonCodes,
	})
	if err != nil {
		return signals.EvidenceEnvelope{}, err
	}
	return signals.Publish(draft)
}

// WhaleEventID derives a stable event id from upstream trade id.
func WhaleEventID(upstreamTradeID string) string {
	return "we_" + upstreamTradeID + "_" + params.FormulaVersion
}

// FormatWhaleScore returns a stable decimal string for API output.
func FormatWhaleScore(score float64) string {
	return strconv.FormatFloat(score, 'f', 2, 64)
}
