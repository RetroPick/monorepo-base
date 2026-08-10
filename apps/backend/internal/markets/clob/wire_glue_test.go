package clob_test

import (
	"encoding/json"
	"strings"
	"testing"

	"retropick/apps/backend/internal/markets/clob"
	"retropick/apps/backend/internal/markets/orders"
)

// Validates glue contract: preview payload fields map to CLOB wire body without import cycle in production.
func TestBuildSendOrderBody_PreviewVectorSideBuy(t *testing.T) {
	t.Parallel()

	payload := orders.UnsignedOrderPayload{
		Salt:          "12345",
		Maker:         "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
		Signer:        "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
		TokenID:       "102936123456789",
		MakerAmount:   "1000000",
		TakerAmount:   "2000000",
		Side:          0,
		SignatureType: 1,
		Timestamp:     "1713398400000",
		Metadata:      "0x0000000000000000000000000000000000000000000000000000000000000000",
		Builder:       "0000000000000000000000000000000000000000000000000000000000000001",
	}

	body, err := clob.BuildSendOrderBody(clob.SubmitRequest{
		Order: clob.OrderPayload{
			Salt:          payload.Salt,
			Maker:         payload.Maker,
			Signer:        payload.Signer,
			TokenID:       payload.TokenID,
			MakerAmount:   payload.MakerAmount,
			TakerAmount:   payload.TakerAmount,
			Side:          payload.Side,
			SignatureType: payload.SignatureType,
			Timestamp:     payload.Timestamp,
			Metadata:      payload.Metadata,
			Builder:       payload.Builder,
		},
		Signature:   "0xsig",
		OrderType:   clob.OrderTypeGTC,
		Credentials: clob.SandboxCredentials(),
	})
	if err != nil {
		t.Fatal(err)
	}

	var wire map[string]any
	if err := json.Unmarshal(body, &wire); err != nil {
		t.Fatal(err)
	}
	order, ok := wire["order"].(map[string]any)
	if !ok {
		t.Fatalf("order field missing: %s", body)
	}
	if order["side"] != "BUY" {
		t.Fatalf("side = %v", order["side"])
	}
	builder, _ := order["builder"].(string)
	if !strings.HasPrefix(builder, "0x") {
		t.Fatalf("builder = %q", builder)
	}
	if order["expiration"] != "0" {
		t.Fatalf("expiration = %v", order["expiration"])
	}
}
