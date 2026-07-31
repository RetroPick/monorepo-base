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
	ObservationBucket time.Duration
	ReferenceWindow   time.Duration
	ThresholdOnPP     float64 // probability points
	ThresholdOffPP    float64
	Cooldown          time.Duration
	Expiry            time.Duration
	MinObservations   int
	LastTradeFreshness time.Duration
}

// LiquidityRuleConfig configures liquidity_change detection.
type LiquidityRuleConfig struct {
	Epsilon           float64
	DepthFloor        float64
	ThresholdOn       float64
	ThresholdOff      float64
	MinBaselineDepth  float64
	MinObservations   int
	Cooldown          time.Duration
	Expiry            time.Duration
	ObservationBucket time.Duration
}

// PriceBucket is a closed observation bucket for price.
type PriceBucket struct {
	MarketID    string
	TokenID     string
	BucketStart time.Time
	BucketEnd   time.Time
	Price       markets.DecimalString
	BestBid     *markets.DecimalString
	BestAsk     *markets.DecimalString
	Spread      *markets.DecimalString
	SnapshotHash string
	RuleVersion  string
}

// LiquidityBucket is a closed observation bucket for liquidity.
type LiquidityBucket struct {
	MarketID         string
	TokenID          string
	BucketStart      time.Time
	BucketEnd        time.Time
	TotalDepth       markets.DecimalString
	BidDepth         markets.DecimalString
	AskDepth         markets.DecimalString
	Spread           *markets.DecimalString
	Epsilon          float64
	SnapshotHash     string
	RuleVersion      string
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

// DeltaProbabilityPoints computes 100 × (p(t) - p(ref)).
func DeltaProbabilityPoints(current, reference markets.DecimalString) (float64, error) {
	cur, ok := new(big.Rat).SetString(string(current))
	if !ok {
		return 0, ErrNoObservation
	}
	ref, ok := new(big.Rat).SetString(string(reference))
	if !ok {
		return 0, ErrNoObservation
	}
	delta := new(big.Rat).Sub(cur, ref)
	delta.Mul(delta, big.NewRat(100, 1))
	f, _ := delta.Float64()
	return f, nil
}

// EvaluatePriceMove checks threshold with hysteresis.
func EvaluatePriceMove(deltaPP float64, cfg PriceRuleConfig, priorDirection string) (emit bool, direction string) {
	if deltaPP >= cfg.ThresholdOnPP {
		return true, DirectionUp
	}
	if deltaPP <= -cfg.ThresholdOnPP {
		return true, DirectionDown
	}
	if priorDirection == DirectionUp && deltaPP > cfg.ThresholdOffPP {
		return false, priorDirection
	}
	if priorDirection == DirectionDown && deltaPP < -cfg.ThresholdOffPP {
		return false, priorDirection
	}
	return false, ""
}

// BandDepth computes Σ(price × size) within epsilon of best price.
func BandDepth(levels []markets.OrderBookLevel, bestPrice markets.DecimalString, epsilon float64, isBid bool) (markets.DecimalString, error) {
	best, ok := new(big.Rat).SetString(string(bestPrice))
	if !ok {
		return "", ErrNoObservation
	}
	eps := new(big.Rat).SetFloat64(epsilon)
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
		if diff.Cmp(eps) > 0 {
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

// RelativeDepthChange computes (current - ref) / max(ref, floor).
func RelativeDepthChange(current, reference markets.DecimalString, floor float64) (float64, error) {
	cur, ok := new(big.Rat).SetString(string(current))
	if !ok {
		return 0, ErrNoObservation
	}
	ref, ok := new(big.Rat).SetString(string(reference))
	if !ok {
		return 0, ErrNoObservation
	}
	denom := ref
	floorRat := new(big.Rat).SetFloat64(floor)
	if denom.Cmp(floorRat) < 0 {
		denom = floorRat
	}
	if denom.Sign() == 0 {
		return 0, ErrNoObservation
	}
	change := new(big.Rat).Sub(cur, ref)
	change.Quo(change, denom)
	f, _ := change.Float64()
	return f, nil
}

// PriceMoveIdempotencyKey builds a deterministic signal key.
func PriceMoveIdempotencyKey(ruleVersion, marketID, tokenID string, bucketEnd time.Time, direction string, threshold float64) string {
	canonical := fmt.Sprintf("%s|%s|%s|price_move|%s|%s|%.4f",
		ruleVersion, marketID, tokenID, bucketEnd.UTC().Format(time.RFC3339), direction, threshold)
	sum := sha256.Sum256([]byte(canonical))
	return hex.EncodeToString(sum[:])
}

// LiquidityChangeIdempotencyKey builds a deterministic signal key.
func LiquidityChangeIdempotencyKey(ruleVersion, marketID, tokenID string, bucketEnd time.Time, direction string, threshold float64) string {
	canonical := fmt.Sprintf("%s|%s|%s|liquidity_change|%s|%s|%.4f",
		ruleVersion, marketID, tokenID, bucketEnd.UTC().Format(time.RFC3339), direction, threshold)
	sum := sha256.Sum256([]byte(canonical))
	return hex.EncodeToString(sum[:])
}

// BuildPriceMoveObservation creates an engine observation from buckets.
func BuildPriceMoveObservation(current, reference PriceBucket, threshold markets.DecimalString, deltaPP float64, direction string) (Observation, error) {
	evidence := []markets.SignalEvidence{
		{
			Kind:        "price_bucket",
			ReferenceID: current.MarketID + ":" + current.TokenID,
			ObservedAt:  current.BucketEnd,
			ContentHash: current.SnapshotHash,
		},
	}
	details, _ := json.Marshal(map[string]any{
		"deltaPP":      deltaPP,
		"direction":    direction,
		"currentPrice": current.Price,
		"referencePrice": reference.Price,
		"bestBid":      current.BestBid,
		"bestAsk":      current.BestAsk,
		"spread":       current.Spread,
		"ruleVersion":  current.RuleVersion,
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
