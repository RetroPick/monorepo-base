package signals

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"retropick/apps/backend/internal/markets"
)

const (
	RuleVersionP13 = "signals-v1-p13"

	DirectionUp   = "up"
	DirectionDown = "down"
)

var ErrNoObservation = errors.New("no valid observation")

// PriceRuleConfig configures deterministic price_move detection.
type PriceRuleConfig struct {
	ObservationBucket  time.Duration
	ReferenceWindow    time.Duration
	ThresholdOnMicroPP MicroProbabilityPoints
	ThresholdOffMicroPP MicroProbabilityPoints
	Cooldown           time.Duration
	Expiry             time.Duration
	MinObservations    int
	LastTradeFreshness time.Duration
}

// LiquidityRuleConfig configures liquidity_change detection.
type LiquidityRuleConfig struct {
	EpsilonMicro       MicroDecimal
	DepthFloorMicro    MicroDecimal
	ThresholdOnMicro   MicroDecimal
	ThresholdOffMicro  MicroDecimal
	MinBaselineDepth   MicroDecimal
	MinObservations    int
	Cooldown           time.Duration
	Expiry             time.Duration
	ObservationBucket  time.Duration
	ReferenceWindow    time.Duration
}

// PriceBucket is a closed observation bucket for price.
type PriceBucket struct {
	MarketID     string
	TokenID      string
	BucketStart  time.Time
	BucketEnd    time.Time
	Price        markets.DecimalString
	BestBid      *markets.DecimalString
	BestAsk      *markets.DecimalString
	Spread       *markets.DecimalString
	SnapshotHash string
	RuleVersion  string
}

// LiquidityBucket is a closed observation bucket for liquidity.
type LiquidityBucket struct {
	MarketID     string
	TokenID      string
	BucketStart  time.Time
	BucketEnd    time.Time
	TotalDepth   markets.DecimalString
	BidDepth     markets.DecimalString
	AskDepth     markets.DecimalString
	Spread       *markets.DecimalString
	Epsilon      MicroDecimal
	SnapshotHash string
	RuleVersion  string
}

// ComputeMidpointPrice returns p(t) = (bestBid + bestAsk) / 2 when valid.
func ComputeMidpointPrice(bestBid, bestAsk *markets.DecimalString) (*markets.DecimalString, error) {
	if bestBid == nil || bestAsk == nil {
		return nil, ErrNoObservation
	}
	bid, ok := new(big.Rat).SetString(string(*bestBid))
	if !ok {
		return nil, ErrNoObservation
	}
	ask, ok := new(big.Rat).SetString(string(*bestAsk))
	if !ok {
		return nil, ErrNoObservation
	}
	if bid.Cmp(ask) >= 0 {
		return nil, ErrNoObservation
	}
	mid := new(big.Rat).Add(bid, ask)
	mid.Quo(mid, big.NewRat(2, 1))
	if mid.Sign() < 0 || mid.Cmp(big.NewRat(1, 1)) > 0 {
		return nil, ErrNoObservation
	}
	digits := mid.FloatString(6)
	value, err := markets.ParseDecimalString(strings.TrimRight(strings.TrimRight(digits, "0"), "."))
	if err != nil {
		return nil, err
	}
	return &value, nil
}

// DeltaProbabilityPoints computes 100 × (p(t) - p(ref)) in micro-PP.
func DeltaProbabilityPoints(current, reference markets.DecimalString) (MicroProbabilityPoints, error) {
	return DeltaMicroPP(current, reference)
}

// EvaluatePriceMove checks threshold with hysteresis using micro-PP.
func EvaluatePriceMove(deltaPP MicroProbabilityPoints, cfg PriceRuleConfig, priorDirection string) (emit bool, direction string) {
	if compareMicroPP(deltaPP, cfg.ThresholdOnMicroPP) >= 0 {
		return true, DirectionUp
	}
	if compareMicroPP(-deltaPP, cfg.ThresholdOnMicroPP) >= 0 {
		return true, DirectionDown
	}
	if priorDirection == DirectionUp && compareMicroPP(deltaPP, cfg.ThresholdOffMicroPP) > 0 {
		return false, priorDirection
	}
	if priorDirection == DirectionDown && compareMicroPP(-deltaPP, cfg.ThresholdOffMicroPP) > 0 {
		return false, priorDirection
	}
	return false, ""
}

// BandDepth computes Σ(price × size) within epsilon of best price.
func BandDepth(levels []markets.OrderBookLevel, bestPrice markets.DecimalString, epsilon MicroDecimal, isBid bool) (markets.DecimalString, error) {
	best, ok := new(big.Rat).SetString(string(bestPrice))
	if !ok {
		return "", ErrNoObservation
	}
	epsRat := new(big.Rat).SetInt64(int64(epsilon))
	epsRat.Quo(epsRat, big.NewRat(microDecimalScale, 1))
	total := new(big.Rat)
	for _, level := range levels {
		price, ok := new(big.Rat).SetString(string(level.Price))
		if !ok {
			continue
		}
		size, ok := new(big.Rat).SetString(string(level.Size))
		if !ok {
			continue
		}
		diff := new(big.Rat).Sub(price, best)
		if isBid {
			diff.Neg(diff)
		}
		if diff.Cmp(epsRat) > 0 {
			continue
		}
		notional := new(big.Rat).Mul(price, size)
		total.Add(total, notional)
	}
	if total.Sign() < 0 {
		return "", ErrNoObservation
	}
	digits := total.FloatString(4)
	return markets.ParseDecimalString(strings.TrimRight(strings.TrimRight(digits, "0"), "."))
}

// ComputeLiquidityDepths returns band depths for a synchronized snapshot.
func ComputeLiquidityDepths(snapshot markets.OrderBookSnapshot, epsilon MicroDecimal) (bid, ask, total markets.DecimalString, err error) {
	if snapshot.BestBid == nil || snapshot.BestAsk == nil {
		return "", "", "", ErrNoObservation
	}
	if snapshot.Freshness.State != markets.FreshnessFresh {
		return "", "", "", ErrNoObservation
	}
	bid, err = BandDepth(snapshot.Bids, *snapshot.BestBid, epsilon, true)
	if err != nil {
		return "", "", "", err
	}
	ask, err = BandDepth(snapshot.Asks, *snapshot.BestAsk, epsilon, false)
	if err != nil {
		return "", "", "", err
	}
	bidRat, _ := new(big.Rat).SetString(string(bid))
	askRat, _ := new(big.Rat).SetString(string(ask))
	sum := new(big.Rat).Add(bidRat, askRat)
	digits := sum.FloatString(4)
	total, err = markets.ParseDecimalString(strings.TrimRight(strings.TrimRight(digits, "0"), "."))
	return bid, ask, total, err
}

// EvaluateLiquidityChange checks relative depth change with hysteresis.
func EvaluateLiquidityChange(change MicroDecimal, cfg LiquidityRuleConfig, priorDirection string) (emit bool, direction string) {
	if int64(change) >= int64(cfg.ThresholdOnMicro) {
		return true, DirectionUp
	}
	if int64(-change) >= int64(cfg.ThresholdOnMicro) {
		return true, DirectionDown
	}
	if priorDirection == DirectionUp && int64(change) > int64(cfg.ThresholdOffMicro) {
		return false, priorDirection
	}
	if priorDirection == DirectionDown && int64(-change) > int64(cfg.ThresholdOffMicro) {
		return false, priorDirection
	}
	return false, ""
}

// RelativeDepthChange computes (current - ref) / max(ref, floor) as micro-decimal ratio.
func RelativeDepthChange(current, reference markets.DecimalString, floor MicroDecimal) (MicroDecimal, error) {
	return RelativeDepthChangeMicro(current, reference, floor)
}

// PriceMoveIdempotencyKey builds a deterministic signal key.
func PriceMoveIdempotencyKey(ruleVersion, marketID, tokenID string, bucketEnd time.Time, direction string, threshold MicroProbabilityPoints) string {
	canonical := fmt.Sprintf("%s|%s|%s|price_move|%s|%s|%s",
		ruleVersion, marketID, tokenID, bucketEnd.UTC().Format(time.RFC3339), direction, threshold.CanonicalString())
	sum := sha256.Sum256([]byte(canonical))
	return hex.EncodeToString(sum[:])
}

// LiquidityChangeIdempotencyKey builds a deterministic signal key.
func LiquidityChangeIdempotencyKey(ruleVersion, marketID, tokenID string, bucketEnd time.Time, direction string, threshold MicroDecimal, epsilon MicroDecimal) string {
	canonical := fmt.Sprintf("%s|%s|%s|liquidity_change|%s|%s|%s|%s",
		ruleVersion, marketID, tokenID, bucketEnd.UTC().Format(time.RFC3339), direction, threshold.CanonicalString(), epsilon.CanonicalString())
	sum := sha256.Sum256([]byte(canonical))
	return hex.EncodeToString(sum[:])
}

// BuildPriceMoveObservation creates an engine observation from buckets.
func BuildPriceMoveObservation(current, reference PriceBucket, threshold markets.DecimalString, deltaPP MicroProbabilityPoints, direction string) (Observation, error) {
	evidence := []markets.SignalEvidence{
		{
			Kind:        "price_bucket",
			ReferenceID: current.MarketID + ":" + current.TokenID,
			ObservedAt:  current.BucketEnd,
			ContentHash: current.SnapshotHash,
		},
	}
	details, _ := json.Marshal(map[string]string{
		"deltaMicroPP":     fmt.Sprintf("%d", deltaPP),
		"direction":        direction,
		"currentPrice":     string(current.Price),
		"referencePrice":   string(reference.Price),
		"ruleVersion":      current.RuleVersion,
		"thresholdMicroPP": string(threshold),
	})
	sum := sha256.Sum256(details)
	evidence = append(evidence, markets.SignalEvidence{
		Kind:        "price_move_evidence",
		ReferenceID: current.MarketID,
		ObservedAt:  current.BucketEnd,
		ContentHash: hex.EncodeToString(sum[:]),
	})
	return Observation{
		Kind:         TypePriceMove,
		MarketID:     current.MarketID,
		ObservedAt:   current.BucketEnd,
		Previous:     reference.Price,
		Current:      current.Price,
		Threshold:    threshold,
		PreviousHash: reference.SnapshotHash,
		CurrentHash:  current.SnapshotHash,
		Evidence:     evidence,
	}, nil
}

// BuildLiquidityChangeObservation creates an engine observation from liquidity buckets.
func BuildLiquidityChangeObservation(current, reference LiquidityBucket, threshold markets.DecimalString, change MicroDecimal, direction string) (Observation, error) {
	evidence := []markets.SignalEvidence{
		{
			Kind:        "liquidity_bucket",
			ReferenceID: current.MarketID + ":" + current.TokenID,
			ObservedAt:  current.BucketEnd,
			ContentHash: current.SnapshotHash,
		},
	}
	details, _ := json.Marshal(map[string]string{
		"changeMicro":       fmt.Sprintf("%d", change),
		"direction":         direction,
		"currentTotalDepth": string(current.TotalDepth),
		"referenceDepth":    string(reference.TotalDepth),
		"epsilon":           current.Epsilon.CanonicalString(),
		"ruleVersion":       current.RuleVersion,
	})
	sum := sha256.Sum256(details)
	evidence = append(evidence, markets.SignalEvidence{
		Kind:        "liquidity_change_evidence",
		ReferenceID: current.MarketID,
		ObservedAt:  current.BucketEnd,
		ContentHash: hex.EncodeToString(sum[:]),
	})
	return Observation{
		Kind:         TypeLiquidityChange,
		MarketID:     current.MarketID,
		ObservedAt:   current.BucketEnd,
		Previous:     reference.TotalDepth,
		Current:      current.TotalDepth,
		Threshold:    threshold,
		PreviousHash: reference.SnapshotHash,
		CurrentHash:  current.SnapshotHash,
		Evidence:     evidence,
	}, nil
}

// DefaultPriceRuleConfig returns Phase 1.3 default price_move thresholds.
func DefaultPriceRuleConfig(bucket time.Duration) PriceRuleConfig {
	on, _ := ParseMicroPP("2")
	off, _ := ParseMicroPP("1")
	return PriceRuleConfig{
		ObservationBucket:   bucket,
		ReferenceWindow:     5 * bucket,
		ThresholdOnMicroPP:  on,
		ThresholdOffMicroPP: off,
		Cooldown:            bucket,
		Expiry:              24 * time.Hour,
		MinObservations:     2,
	}
}

// DefaultLiquidityRuleConfig returns Phase 1.3 default liquidity_change thresholds.
func DefaultLiquidityRuleConfig(bucket time.Duration) LiquidityRuleConfig {
	epsilon, _ := ParseMicroDecimal("0.01")
	floor, _ := ParseMicroDecimal("10")
	on, _ := ParseMicroDecimal("0.25")
	off, _ := ParseMicroDecimal("0.10")
	baseline, _ := ParseMicroDecimal("1")
	return LiquidityRuleConfig{
		EpsilonMicro:      epsilon,
		DepthFloorMicro:   floor,
		ThresholdOnMicro:  on,
		ThresholdOffMicro: off,
		MinBaselineDepth:  baseline,
		MinObservations:   2,
		Cooldown:          bucket,
		Expiry:            24 * time.Hour,
		ObservationBucket: bucket,
		ReferenceWindow:   5 * bucket,
	}
}
