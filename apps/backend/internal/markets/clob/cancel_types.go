package clob

const orderCancelPath = "/order"

// CancelRequest identifies a venue order to cancel via CLOB DELETE /order.
type CancelRequest struct {
	OrderID     string
	Credentials L2Credentials
}

// CancelResult is the normalized CLOB cancellation acknowledgement.
type CancelResult struct {
	Canceled    []string
	NotCanceled map[string]string
	Success     bool
	RawStatus   int
}

type wireCancelOrderBody struct {
	OrderID string `json:"orderID"`
}

type wireCancelOrderResponse struct {
	Canceled    []string          `json:"canceled"`
	NotCanceled map[string]string `json:"not_canceled"`
}
