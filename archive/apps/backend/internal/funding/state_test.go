package funding

import "testing"

func TestValidateTransition_NewStatuses(t *testing.T) {
	if err := ValidateTransition(StatusCreated, StatusBalanceScanning); err != nil {
		t.Fatalf("created -> scanning should be allowed: %v", err)
	}
	if err := ValidateTransition(StatusBalanceScanning, StatusNoFundingOptions); err != nil {
		t.Fatalf("scanning -> no options should be allowed: %v", err)
	}
	if err := ValidateTransition(StatusNoFundingOptions, StatusRouteSelected); err == nil {
		t.Fatal("no options -> route selected should not be allowed")
	}
}
