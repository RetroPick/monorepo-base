package whale

import (
	"math"
	"time"

	"retropick/apps/backend/internal/markets/intelligence/params"
	"retropick/apps/backend/internal/markets/intelligence/model"
)

// ClassifyInput bundles trade + market context for scoring.
type ClassifyInput struct {
	Trade   model.NormalizedTrade
	Context model.MarketContext
}

// ClassifyResult is the deterministic whale classification output.
type ClassifyResult struct {
	IsWhale            bool
	WhaleScore         float64
	ReasonCodes        []string
	Fingerprint        string
	TauMarketMinor     int64
	PctRecentVolumeBps int64
	ImpactUnavailable  bool
	Publish            bool
	Duplicate          bool
	PublishNew         bool
}

// Classifier applies WhaleScore Launch v1 per 01_WHALE_TRADE_FEED.md.
type Classifier struct {
	Params params.WhaleScoreLaunch
}

func NewClassifier(p params.WhaleScoreLaunch) *Classifier {
	return &Classifier{Params: p}
}

func (c *Classifier) Classify(in ClassifyInput) ClassifyResult {
	trade := in.Trade
	ctx := in.Context
	fp := Fingerprint(trade)

	tau := c.tauMarket(in)
	notional := trade.NotionalMinor
	score, _, fVolume, _, impactUnavailable := c.whaleScore(notional, ctx)
	reasons := c.reasonCodes(notional, tau, fVolume, ctx, impactUnavailable)

	isWhale := notional >= tau || score >= c.Params.ScoreThreshold
	pctBps := volumeShareBps(notional, ctx.Vol24hMinor)

	return ClassifyResult{
		IsWhale:            isWhale,
		WhaleScore:         score,
		ReasonCodes:        reasons,
		Fingerprint:        fp,
		TauMarketMinor:     tau,
		PctRecentVolumeBps: pctBps,
		ImpactUnavailable:  impactUnavailable,
		Publish:            isWhale,
		PublishNew:         isWhale,
		Duplicate:          false,
	}
}

// ClassifyWithDedup applies classification and duplicate suppression state.
func (c *Classifier) ClassifyWithDedup(in ClassifyInput, priorEventID string, priorSeenAt time.Time, now time.Time) ClassifyResult {
	result := c.Classify(in)
	if priorEventID != "" {
		result.Duplicate = true
		result.PublishNew = false
		return result
	}
	if priorSeenAt.IsZero() {
		return result
	}
	window := time.Duration(c.Params.DedupWindowMinutes) * time.Minute
	if now.Sub(priorSeenAt) < window {
		result.Duplicate = true
		result.PublishNew = false
		if !result.IsWhale {
			result.Publish = false
		}
	}
	return result
}

func (c *Classifier) tauMarket(in ClassifyInput) int64 {
	tau := c.Params.TauGlobalMinor()
	ctx := in.Context
	if ctx.Vol24hMinor > 0 {
		volTerm := int64(float64(ctx.Vol24hMinor) * c.Params.TauVolumePct)
		if volTerm > tau {
			tau = volTerm
		}
	}
	if ctx.DepthAt2PctMinor > 0 {
		liqTerm := int64(float64(ctx.DepthAt2PctMinor) * c.Params.TauLiquidityPct)
		if liqTerm > tau {
			tau = liqTerm
		}
	}
	return tau
}

func (c *Classifier) whaleScore(notionalMinor int64, ctx model.MarketContext) (score, fNotional, fVolume, fPrice float64, impactUnavailable bool) {
	w := c.Params.Weights
	notionalUSD := float64(notionalMinor) / float64(params.NotionalMinorScale)

	mu := c.Params.NotionalZ.MuUSD
	sigma := c.Params.NotionalZ.SigmaUSD
	if sigma <= 0 {
		sigma = 1
	}
	fNotional = sigmoid((notionalUSD - mu) / sigma)

	epsilon := c.Params.VolumeShareEpsilonUSD * float64(params.NotionalMinorScale)
	denom := math.Max(epsilon, float64(ctx.Vol24hMinor)*0.05)
	fVolume = math.Min(1, float64(notionalMinor)/denom)

	impactUnavailable = ctx.ImpactUnavailable || ctx.ImpactBps <= 0
	if impactUnavailable {
		fPrice = 0
	} else {
		capBps := float64(c.Params.PriceImpactCapBps)
		if capBps <= 0 {
			capBps = 50
		}
		fPrice = math.Min(1, float64(ctx.ImpactBps)/capBps)
	}

	composite := w.NotionalZ*fNotional + w.VolumeShare*fVolume + w.PriceImpact*fPrice
	score = 100 * clamp01(composite)
	return score, fNotional, fVolume, fPrice, impactUnavailable
}

func (c *Classifier) reasonCodes(notionalMinor, tau int64, fVolume float64, ctx model.MarketContext, impactUnavailable bool) []string {
	var codes []string
	if notionalMinor >= tau {
		codes = append(codes, ReasonNotionalThreshold)
	}
	if ctx.Vol24hMinor > 0 {
		bps := volumeShareBps(notionalMinor, ctx.Vol24hMinor)
		if bps >= c.Params.VolumeShareReasonBps {
			codes = append(codes, ReasonVolumeShare)
		}
	} else if fVolume >= float64(c.Params.VolumeShareReasonBps)/10000 {
		codes = append(codes, ReasonVolumeShare)
	}
	if !impactUnavailable && ctx.ImpactBps >= c.Params.PriceImpactReasonBps {
		codes = append(codes, ReasonPriceImpact)
	}
	return codes
}

func volumeShareBps(notionalMinor, volMinor int64) int64 {
	if volMinor <= 0 {
		return 0
	}
	return (notionalMinor*10000 + volMinor/2) / volMinor
}

func sigmoid(x float64) float64 {
	return 1 / (1 + math.Exp(-x))
}

func clamp01(x float64) float64 {
	if x < 0 {
		return 0
	}
	if x > 1 {
		return 1
	}
	return x
}
