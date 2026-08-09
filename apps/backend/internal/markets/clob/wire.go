package clob

import (
	"encoding/json"
	"fmt"
	"strings"
)

// SideWireFromInt maps preview EIP-712 side integers to CLOB wire strings.
func SideWireFromInt(side int) (string, error) {
	switch side {
	case 0:
		return "BUY", nil
	case 1:
		return "SELL", nil
	default:
		return "", fmt.Errorf("%w: side must be 0 or 1", ErrInvalidRequest)
	}
}

// BuildSendOrderBody serializes a signed order for CLOB POST /order.
func BuildSendOrderBody(req SubmitRequest) ([]byte, error) {
	if err := validateSubmitRequest(req); err != nil {
		return nil, err
	}

	side, err := SideWireFromInt(req.Order.Side)
	if err != nil {
		return nil, err
	}

	orderType := strings.TrimSpace(req.OrderType)
	if orderType == "" {
		orderType = OrderTypeGTC
	}
	if !validOrderType(orderType) {
		return nil, fmt.Errorf("%w: invalid order type", ErrInvalidRequest)
	}

	expiration := strings.TrimSpace(req.Expiration)
	if expiration == "" {
		expiration = "0"
	}

	metadata := strings.TrimSpace(req.Order.Metadata)
	if metadata == "" {
		metadata = "0x0000000000000000000000000000000000000000000000000000000000000000"
	}

	builder := normalizeBuilderWire(req.Order.Builder)

	payload := wireSendOrder{
		Order: wireOrder{
			Salt:          jsonNumber(strings.TrimSpace(req.Order.Salt)),
			Maker:         strings.ToLower(strings.TrimSpace(req.Order.Maker)),
			Signer:        strings.ToLower(strings.TrimSpace(req.Order.Signer)),
			TokenID:       strings.TrimSpace(req.Order.TokenID),
			MakerAmount:   strings.TrimSpace(req.Order.MakerAmount),
			TakerAmount:   strings.TrimSpace(req.Order.TakerAmount),
			Side:          side,
			SignatureType: req.Order.SignatureType,
			Timestamp:     strings.TrimSpace(req.Order.Timestamp),
			Metadata:      metadata,
			Builder:       builder,
			Signature:     strings.TrimSpace(req.Signature),
			Expiration:    expiration,
		},
		Owner:     strings.TrimSpace(req.Credentials.APIKey),
		OrderType: orderType,
		DeferExec: req.DeferExec,
		PostOnly:  req.PostOnly,
	}

	return json.Marshal(payload)
}

func validateSubmitRequest(req SubmitRequest) error {
	if strings.TrimSpace(req.Signature) == "" {
		return fmt.Errorf("%w: signature is required", ErrInvalidRequest)
	}
	if strings.TrimSpace(req.Credentials.APIKey) == "" {
		return fmt.Errorf("%w: owner api key is required", ErrInvalidRequest)
	}
	o := req.Order
	if strings.TrimSpace(o.Maker) == "" ||
		strings.TrimSpace(o.Signer) == "" ||
		strings.TrimSpace(o.TokenID) == "" ||
		strings.TrimSpace(o.MakerAmount) == "" ||
		strings.TrimSpace(o.TakerAmount) == "" ||
		strings.TrimSpace(o.Timestamp) == "" ||
		strings.TrimSpace(o.Salt) == "" {
		return fmt.Errorf("%w: order fields are incomplete", ErrInvalidRequest)
	}
	return nil
}

func validOrderType(orderType string) bool {
	switch orderType {
	case OrderTypeGTC, OrderTypeFOK, OrderTypeGTD, OrderTypeFAK:
		return true
	default:
		return false
	}
}

func normalizeBuilderWire(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "0x" + strings.Repeat("0", 64)
	}
	if strings.HasPrefix(raw, "0x") {
		return raw
	}
	return "0x" + raw
}
