package clob_test

import (
	"testing"

	"retropick/apps/backend/internal/markets/clob"
	"retropick/apps/backend/internal/markets/orders"
)

func TestNegRiskConstantsMatchOrders(t *testing.T) {
	t.Parallel()

	std, err := orders.VerifyingContractForDomain(orders.ExchangeDomainStandard)
	if err != nil {
		t.Fatal(err)
	}
	if std != clob.CTFExchangeV2Address {
		t.Fatalf("standard contract mismatch: orders=%q clob=%q", std, clob.CTFExchangeV2Address)
	}

	nr, err := orders.VerifyingContractForDomain(orders.ExchangeDomainNegRisk)
	if err != nil {
		t.Fatal(err)
	}
	if nr != clob.NegRiskCTFExchangeV2Address {
		t.Fatalf("neg_risk contract mismatch: orders=%q clob=%q", nr, clob.NegRiskCTFExchangeV2Address)
	}
}
