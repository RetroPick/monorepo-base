package clob

import "errors"

const (
	orderSubmitPath = "/order"

	OrderTypeGTC = "GTC"
	OrderTypeFOK = "FOK"
	OrderTypeGTD = "GTD"
	OrderTypeFAK = "FAK"

	defaultTradingTimeout = defaultTimeout
)

var (
	ErrSubmitUnknown  = errors.New("clob submit unknown")
	ErrSubmitRejected = errors.New("clob submit rejected")
	ErrAuthInvalid    = errors.New("clob auth invalid")
)

// OrderPayload mirrors the CLOB V2 unsigned/signed order fields used on the wire.
// Field names align with preview UnsignedOrderPayload for glue-layer mapping.
type OrderPayload struct {
	Salt          string
	Maker         string
	Signer        string
	TokenID       string
	MakerAmount   string
	TakerAmount   string
	Side          int
	SignatureType int
	Timestamp     string
	Metadata      string
	Builder       string
}

// SubmitRequest carries a user-signed order ready for CLOB POST /order.
type SubmitRequest struct {
	Order       OrderPayload
	Signature   string
	OrderType   string
	Expiration  string
	DeferExec   bool
	PostOnly    bool
	Credentials L2Credentials
}

// SubmitResult is the normalized CLOB acknowledgement for a successful submit.
type SubmitResult struct {
	OrderID   string
	Status    string
	Success   bool
	ErrorMsg  string
	RawStatus int
}

type wireSendOrder struct {
	Order     wireOrder `json:"order"`
	Owner     string    `json:"owner"`
	OrderType string    `json:"orderType"`
	DeferExec bool      `json:"deferExec"`
	PostOnly  bool      `json:"postOnly"`
}

type wireOrder struct {
	Salt          jsonNumber `json:"salt"`
	Maker         string     `json:"maker"`
	Signer        string     `json:"signer"`
	TokenID       string     `json:"tokenId"`
	MakerAmount   string     `json:"makerAmount"`
	TakerAmount   string     `json:"takerAmount"`
	Side          string     `json:"side"`
	SignatureType int        `json:"signatureType"`
	Timestamp     string     `json:"timestamp"`
	Metadata      string     `json:"metadata"`
	Builder       string     `json:"builder"`
	Signature     string     `json:"signature"`
	Expiration    string     `json:"expiration"`
}

type wireSendOrderResponse struct {
	Success  bool   `json:"success"`
	OrderID  string `json:"orderID"`
	Status   string `json:"status"`
	ErrorMsg string `json:"errorMsg"`
}

// jsonNumber marshals numeric salt values without quotes when possible.
type jsonNumber string

func (n jsonNumber) MarshalJSON() ([]byte, error) {
	s := string(n)
	if s == "" {
		return []byte(`""`), nil
	}
	for _, r := range s {
		if r < '0' || r > '9' {
			return []byte(`"` + s + `"`), nil
		}
	}
	return []byte(s), nil
}
