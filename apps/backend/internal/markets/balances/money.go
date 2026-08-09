package balances

import (
	"fmt"
	"math/big"
	"strings"
)

// ParseBaseUnits converts an upstream integer base-units string into MoneyAmount.
// Never uses binary floating point.
func ParseBaseUnits(raw string, currency string, decimals int) (MoneyAmount, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return MoneyAmount{}, fmt.Errorf("empty base units")
	}
	if strings.HasPrefix(raw, "-") {
		return MoneyAmount{}, fmt.Errorf("negative base units")
	}
	if _, ok := new(big.Int).SetString(raw, 10); !ok {
		return MoneyAmount{}, fmt.Errorf("invalid base units")
	}
	if strings.TrimSpace(currency) == "" {
		return MoneyAmount{}, fmt.Errorf("currency required")
	}
	if decimals < 0 || decimals > 18 {
		return MoneyAmount{}, fmt.Errorf("invalid decimals")
	}
	return MoneyAmount{
		Amount:   raw,
		Currency: currency,
		Decimals: decimals,
	}, nil
}

// CollateralFromWei maps CLOB V2 collateral wei to pUSD MoneyAmount.
func CollateralFromWei(wei string) (MoneyAmount, error) {
	return ParseBaseUnits(wei, CollateralCurrency, CollateralDecimals)
}
