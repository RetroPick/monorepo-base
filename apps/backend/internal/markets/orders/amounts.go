package orders

import (
	"fmt"
	"math/big"
	"regexp"
	"strings"
)

const collateralDecimals = 6

var decimalPattern = regexp.MustCompile(`^(0|[1-9][0-9]*)(\.[0-9]+)?$`)

func validateDecimalString(raw string) error {
	if !decimalPattern.MatchString(strings.TrimSpace(raw)) {
		return fmt.Errorf("invalid decimal string")
	}
	return nil
}

func parseDecimalUnits(raw string, maxDecimals int) (*big.Int, error) {
	raw = strings.TrimSpace(raw)
	if err := validateDecimalString(raw); err != nil {
		return nil, err
	}
	parts := strings.Split(raw, ".")
	intPart := parts[0]
	intVal, ok := new(big.Int).SetString(intPart, 10)
	if !ok {
		return nil, fmt.Errorf("invalid integer part")
	}
	frac := ""
	if len(parts) == 2 {
		frac = parts[1]
	}
	if len(frac) > maxDecimals {
		return nil, fmt.Errorf("too many decimal places")
	}
	scale := new(big.Int).Exp(big.NewInt(10), big.NewInt(int64(maxDecimals)), nil)
	result := new(big.Int).Mul(intVal, scale)
	if frac != "" {
		fracScale := new(big.Int).Exp(big.NewInt(10), big.NewInt(int64(maxDecimals-len(frac))), nil)
		fracVal, ok := new(big.Int).SetString(frac, 10)
		if !ok {
			return nil, fmt.Errorf("invalid fraction")
		}
		result.Add(result, new(big.Int).Mul(fracVal, fracScale))
	}
	if result.Sign() <= 0 {
		return nil, fmt.Errorf("must be positive")
	}
	return result, nil
}

// computeAmounts derives maker/taker base units for a limit order preview.
func computeAmounts(side, price, size string) (makerAmount, takerAmount *big.Int, err error) {
	priceUnits, err := parseDecimalUnits(price, collateralDecimals)
	if err != nil {
		return nil, nil, fmt.Errorf("price: %w", err)
	}
	sizeUnits, err := parseDecimalUnits(size, collateralDecimals)
	if err != nil {
		return nil, nil, fmt.Errorf("size: %w", err)
	}

	switch strings.ToUpper(strings.TrimSpace(side)) {
	case SideBuy:
		makerAmount = sizeUnits
		takerAmount = new(big.Int).Mul(sizeUnits, priceUnits)
		scale := new(big.Int).Exp(big.NewInt(10), big.NewInt(collateralDecimals), nil)
		takerAmount.Div(takerAmount, scale)
	case SideSell:
		makerAmount = sizeUnits
		takerAmount = new(big.Int).Mul(sizeUnits, priceUnits)
		scale := new(big.Int).Exp(big.NewInt(10), big.NewInt(collateralDecimals), nil)
		takerAmount.Div(takerAmount, scale)
	default:
		return nil, nil, fmt.Errorf("invalid side")
	}
	if takerAmount.Sign() <= 0 || makerAmount.Sign() <= 0 {
		return nil, nil, fmt.Errorf("amount zero")
	}
	return makerAmount, takerAmount, nil
}

func validateTickSize(price, tickSize string) error {
	priceUnits, err := parseDecimalUnits(price, collateralDecimals)
	if err != nil {
		return err
	}
	tickUnits, err := parseDecimalUnits(tickSize, collateralDecimals)
	if err != nil {
		return err
	}
	rem := new(big.Int).Mod(priceUnits, tickUnits)
	if rem.Sign() != 0 {
		return ErrTickSizeViolation
	}
	return nil
}

func validateMinSize(size, minSize string) error {
	sizeUnits, err := parseDecimalUnits(size, collateralDecimals)
	if err != nil {
		return err
	}
	minUnits, err := parseDecimalUnits(minSize, collateralDecimals)
	if err != nil {
		return err
	}
	if sizeUnits.Cmp(minUnits) < 0 {
		return ErrMinSizeViolation
	}
	return nil
}
