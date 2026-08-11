package orders

import "testing"

func TestComputeAmountsUsesLimitOrderShareSize(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		side      string
		price     string
		size      string
		makerWant string
		takerWant string
	}{
		{
			name:      "buy offers collateral and requests shares",
			side:      SideBuy,
			price:     "0.42",
			size:      "100",
			makerWant: "42000000",
			takerWant: "100000000",
		},
		{
			name:      "sell offers shares and requests collateral",
			side:      SideSell,
			price:     "0.42",
			size:      "100",
			makerWant: "100000000",
			takerWant: "42000000",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			maker, taker, err := computeAmounts(tt.side, tt.price, tt.size)
			if err != nil {
				t.Fatal(err)
			}
			if got := maker.String(); got != tt.makerWant {
				t.Fatalf("maker amount = %s, want %s", got, tt.makerWant)
			}
			if got := taker.String(); got != tt.takerWant {
				t.Fatalf("taker amount = %s, want %s", got, tt.takerWant)
			}
		})
	}
}
