package ingest

import (
	"context"
	"fmt"
	"time"

	"retropick/apps/backend/internal/markets/intelligence/adapter/datatrades"
	"retropick/apps/backend/internal/markets/intelligence/model"
	"retropick/apps/backend/internal/markets/intelligence/params"
	"retropick/apps/backend/internal/markets/intelligence/provenance"
	"retropick/apps/backend/internal/markets/intelligence/store"
	"retropick/apps/backend/internal/markets/intelligence/whale"
)

// Ingestor normalizes Data /trades rows and runs whale classification.
type Ingestor struct {
	Store      *store.MemoryStore
	Classifier *whale.Classifier
	Writer     provenance.Writer
	Now        func() time.Time
}

// Input is one trade ingest + classify operation.
type Input struct {
	Trade   model.NormalizedTrade
	Context model.MarketContext
}

// Result reports classification and persistence outcome.
type Result struct {
	Classify  whale.ClassifyResult
	Stored    bool
	Published bool
}

func (ing *Ingestor) nowUTC() time.Time {
	if ing.Now != nil {
		return ing.Now().UTC()
	}
	return time.Now().UTC()
}

// Run upserts trade and optionally publishes whale event.
func (ing *Ingestor) Run(_ context.Context, in Input) (Result, error) {
	trade := in.Trade
	if trade.IngestedAt.IsZero() {
		trade.IngestedAt = ing.nowUTC()
	}
	if err := trade.Validate(); err != nil {
		return Result{}, err
	}

	if _, _, err := ing.Store.UpsertTrade(trade); err != nil {
		return Result{}, err
	}

	tradeRef := trade.UpstreamTradeID
	priorID, hasPrior := ing.Store.PriorWhaleEventID(tradeRef)
	priorSeen, _ := ing.Store.FingerprintLastSeen(whale.Fingerprint(trade))

	now := ing.nowUTC()
	var priorIDStr string
	if hasPrior {
		priorIDStr = priorID
	}
	result := ing.Classifier.ClassifyWithDedup(whale.ClassifyInput{
		Trade:   trade,
		Context: in.Context,
	}, priorIDStr, priorSeen, now)

	if hasPrior {
		result.Duplicate = true
		result.PublishNew = false
	}

	out := Result{Classify: result, Stored: true}
	if !result.IsWhale || !result.PublishNew {
		return out, nil
	}

	envelope, err := ing.Writer.BuildWhaleEnvelope(trade, result, now)
	if err != nil {
		return Result{}, fmt.Errorf("provenance: %w", err)
	}

	lag := now.Sub(trade.TradedAt)
	if lag < 0 {
		lag = 0
	}

	event := store.WhaleEvent{
		ID:            provenance.WhaleEventID(tradeRef),
		TradeRef:      tradeRef,
		Fingerprint:   result.Fingerprint,
		WalletAddress: trade.WalletAddress,
		MarketID:      trade.MarketID,
		MarketTitle:   trade.MarketTitle,
		Outcome:       trade.Outcome,
		Side:          trade.Side,
		NotionalMinor: trade.NotionalMinor,
		SizeMinor:     trade.SizeMinor,
		PriceMinor:    trade.PriceMinor,
		TradedAt:      trade.TradedAt,
		IngestedAt:    trade.IngestedAt,
		WhaleScore:    result.WhaleScore,
		ReasonCodes:   append([]string(nil), result.ReasonCodes...),
		DisplayName:   trade.DisplayName,
		Envelope:      envelope,
		ParamsVersion: params.FormulaVersion,
		LagSeconds:    int64(lag.Seconds()),
	}
	if err := ing.Store.InsertWhaleEvent(event); err != nil {
		return Result{}, err
	}
	out.Published = true
	return out, nil
}

// Raw converts datatrades.RawTrade and ingests.
func (ing *Ingestor) Raw(ctx context.Context, raw datatrades.RawTrade, ctxData model.MarketContext) (Result, error) {
	trade := datatrades.ToNormalized(raw, ing.nowUTC())
	return ing.Run(ctx, Input{Trade: trade, Context: ctxData})
}
