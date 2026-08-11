package orders

import (
	"context"
	"errors"
	"testing"

	"retropick/apps/backend/internal/markets/wallet"
)

func TestProductionServiceFailsClosedWithoutPostgresJournal(t *testing.T) {
	svc := NewProductionService(ProductionConfig{
		OrderSubmitEnabled: true,
		CLOBURL:            "http://127.0.0.1:1",
	})
	_, status, err := svc.SubmitOrder(context.Background(), wallet.SessionContext{
		UserID:        "user-1",
		SignerAddress: "0x1111111111111111111111111111111111111111",
	}, "key", SubmitRequest{})
	if !errors.Is(err, ErrCapabilityDisabled) || status != httpStatusCapabilityDisabled {
		t.Fatalf("status/error = %d/%v, want fail-closed capability disabled", status, err)
	}
}
