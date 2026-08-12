package positions

import (
	"encoding/json"
	"fmt"
	"math/big"
	"strings"

	"retropick/apps/backend/internal/markets"
)

func optionalWireDecimal(raw *json.Number) (string, bool) {
	if raw == nil {
		return "", false
	}
	value, err := normalizeWireDecimal(raw.String())
	return value, err == nil
}

func optionalSignedWireDecimal(raw *json.Number) (string, bool) {
	if raw == nil {
		return "", false
	}
	value, err := normalizeSignedWireDecimal(raw.String())
	return value, err == nil
}

func optionalUSDCBaseUnits(raw *json.Number) (string, bool) {
	if raw == nil {
		return "", false
	}
	value, err := decimalToUSDCBaseUnits(raw.String())
	return value, err == nil
}

func claimableAmount(redeemable *bool, currentValue *json.Number, size, markPrice string, markPriceAvailable bool) (string, bool) {
	if redeemable == nil {
		return "", false
	}
	if !*redeemable {
		return "", true
	}
	value, available := optionalWireDecimal(currentValue)
	if !available || !markPriceAvailable || !sameDecimalProduct(value, size, markPrice) {
		return "", false
	}
	return value, true
}

func sameDecimalProduct(value, left, right string) bool {
	valueRat, valueOK := new(big.Rat).SetString(value)
	leftRat, leftOK := new(big.Rat).SetString(left)
	rightRat, rightOK := new(big.Rat).SetString(right)
	return valueOK && leftOK && rightOK && valueRat.Cmp(new(big.Rat).Mul(leftRat, rightRat)) == 0
}

func normalizeSignedWireDecimal(raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", fmt.Errorf("empty signed decimal")
	}
	if strings.HasPrefix(raw, "-") {
		value, err := markets.ParseDecimalString(strings.TrimPrefix(raw, "-"))
		if err != nil {
			return "", err
		}
		return "-" + string(value), nil
	}
	return normalizeWireDecimal(raw)
}

func decimalToUSDCBaseUnits(raw string) (string, error) {
	value, err := normalizeWireDecimal(raw)
	if err != nil {
		return "", err
	}
	rat, ok := new(big.Rat).SetString(value)
	if !ok || rat.Sign() < 0 {
		return "", fmt.Errorf("invalid USDC decimal")
	}
	scale := new(big.Int).Exp(big.NewInt(10), big.NewInt(6), nil)
	numerator := new(big.Int).Mul(rat.Num(), scale)
	quotient, remainder := new(big.Int).QuoRem(numerator, rat.Denom(), new(big.Int))
	if remainder.Sign() != 0 {
		return "", fmt.Errorf("USDC decimal exceeds six-decimal precision")
	}
	return quotient.String(), nil
}

func validateEconomics(row VenuePosition) error {
	for label, value := range map[string]string{"mark price": row.MarkPrice, "claimable amount": row.ClaimableAmount} {
		if value != "" {
			if _, err := markets.ParseDecimalString(value); err != nil {
				return fmt.Errorf("position projection %s: %w", label, err)
			}
		}
	}
	for label, value := range map[string]string{"unrealized PnL": row.UnrealizedPnL, "realized PnL": row.RealizedPnL} {
		if value != "" {
			if _, err := normalizeSignedWireDecimal(value); err != nil {
				return fmt.Errorf("position projection %s: %w", label, err)
			}
		}
	}
	if row.CostBasisAmount != "" {
		if _, ok := new(big.Int).SetString(row.CostBasisAmount, 10); !ok || strings.HasPrefix(row.CostBasisAmount, "-") {
			return fmt.Errorf("position projection cost basis amount: invalid base units")
		}
	}
	if row.ClaimableAmountAvailable && row.ClaimableAmount != "" && (!row.RedeemableAvailable || !row.Redeemable) {
		return fmt.Errorf("position projection claimable amount requires redeemable position")
	}
	return nil
}
