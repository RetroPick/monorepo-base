package signals

import (
	"fmt"
	"math/big"
	"strings"

	"retropick/apps/backend/internal/markets"
)

// MicroProbabilityPoints stores probability points at 1e-6 resolution (2.0 PP = 2_000_000).
type MicroProbabilityPoints int64

const microPPScale int64 = 1_000_000

// ParseMicroPP parses a decimal probability-points value into micro-PP.
func ParseMicroPP(value string) (MicroProbabilityPoints, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return 0, fmt.Errorf("empty probability points")
	}
	rat, ok := new(big.Rat).SetString(value)
	if !ok {
		return 0, fmt.Errorf("invalid probability points %q", value)
	}
	rat.Mul(rat, big.NewRat(microPPScale, 1))
	if !rat.IsInt() {
		// truncate toward zero for canonical storage
	}
	f, _ := rat.Float64()
	return MicroProbabilityPoints(int64(f)), nil
}

// CanonicalString returns a stable decimal representation without float formatting.
func (m MicroProbabilityPoints) CanonicalString() string {
	rat := new(big.Rat).SetInt64(int64(m))
	rat.Quo(rat, big.NewRat(microPPScale, 1))
	return strings.TrimRight(strings.TrimRight(rat.FloatString(6), "0"), ".")
}

// DeltaMicroPP computes 100 × (current - reference) in micro-PP.
func DeltaMicroPP(current, reference markets.DecimalString) (MicroProbabilityPoints, error) {
	cur, ok := new(big.Rat).SetString(string(current))
	if !ok {
		return 0, ErrNoObservation
	}
	ref, ok := new(big.Rat).SetString(string(reference))
	if !ok {
		return 0, ErrNoObservation
	}
	delta := new(big.Rat).Sub(cur, ref)
	delta.Mul(delta, big.NewRat(100*microPPScale, 1))
	if !delta.IsInt() {
		f, _ := delta.Float64()
		return MicroProbabilityPoints(int64(f)), nil
	}
	return MicroProbabilityPoints(delta.Num().Int64()), nil
}

func compareMicroPP(delta, threshold MicroProbabilityPoints) int {
	if int64(delta) < int64(threshold) {
		return -1
	}
	if int64(delta) > int64(threshold) {
		return 1
	}
	return 0
}

// MicroDecimal stores a deterministic decimal scalar at 1e-6 resolution.
type MicroDecimal int64

const microDecimalScale int64 = 1_000_000

func ParseMicroDecimal(value string) (MicroDecimal, error) {
	value = strings.TrimSpace(value)
	rat, ok := new(big.Rat).SetString(value)
	if !ok {
		return 0, fmt.Errorf("invalid decimal %q", value)
	}
	rat.Mul(rat, big.NewRat(microDecimalScale, 1))
	f, _ := rat.Float64()
	return MicroDecimal(int64(f)), nil
}

func (m MicroDecimal) CanonicalString() string {
	rat := new(big.Rat).SetInt64(int64(m))
	rat.Quo(rat, big.NewRat(microDecimalScale, 1))
	return strings.TrimRight(strings.TrimRight(rat.FloatString(6), "0"), ".")
}

// RelativeDepthChangeMicro computes ((current-ref)/max(ref,floor)) as micro-decimal ratio.
func RelativeDepthChangeMicro(current, reference markets.DecimalString, floor MicroDecimal) (MicroDecimal, error) {
	cur, ok := new(big.Rat).SetString(string(current))
	if !ok {
		return 0, ErrNoObservation
	}
	ref, ok := new(big.Rat).SetString(string(reference))
	if !ok {
		return 0, ErrNoObservation
	}
	floorRat := new(big.Rat).SetInt64(int64(floor))
	floorRat.Quo(floorRat, big.NewRat(microDecimalScale, 1))
	denom := ref
	if denom.Cmp(floorRat) < 0 {
		denom = floorRat
	}
	if denom.Sign() == 0 {
		return 0, ErrNoObservation
	}
	change := new(big.Rat).Sub(cur, ref)
	change.Quo(change, denom)
	change.Mul(change, big.NewRat(microDecimalScale, 1))
	f, _ := change.Float64()
	return MicroDecimal(int64(f)), nil
}
