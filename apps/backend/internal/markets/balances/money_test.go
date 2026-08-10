package balances_test

import (
	"testing"

	"retropick/apps/backend/internal/markets/balances"
)

func TestParseBaseUnits_Zero(t *testing.T) {
	t.Parallel()

	got, err := balances.ParseBaseUnits("0", "pUSD", 6)
	if err != nil {
		t.Fatal(err)
	}
	if got.Amount != "0" || got.Currency != "pUSD" || got.Decimals != 6 {
		t.Fatalf("got %+v", got)
	}
}

func TestParseBaseUnits_Large(t *testing.T) {
	t.Parallel()

	raw := "999999999999999999999999"
	got, err := balances.ParseBaseUnits(raw, "pUSD", 6)
	if err != nil {
		t.Fatal(err)
	}
	if got.Amount != raw {
		t.Fatalf("amount = %q", got.Amount)
	}
}

func TestCollateralFromWei(t *testing.T) {
	t.Parallel()

	got, err := balances.CollateralFromWei("10500000")
	if err != nil {
		t.Fatal(err)
	}
	if got.Amount != "10500000" || got.Currency != "pUSD" || got.Decimals != 6 {
		t.Fatalf("got %+v", got)
	}
}

func TestParseBaseUnits_RejectsNegative(t *testing.T) {
	t.Parallel()

	_, err := balances.ParseBaseUnits("-1", "pUSD", 6)
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestParseBaseUnits_RejectsInvalid(t *testing.T) {
	t.Parallel()

	_, err := balances.ParseBaseUnits("1.5", "pUSD", 6)
	if err == nil {
		t.Fatal("expected error")
	}
}
