package clob

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
)

// CancelOrder deletes a resting order via CLOB V2 DELETE /order.
func (c *TradingClient) CancelOrder(ctx context.Context, req CancelRequest) (CancelResult, error) {
	creds := req.Credentials
	if strings.TrimSpace(creds.APIKey) == "" {
		var err error
		creds, err = c.creds.Credentials(ctx)
		if err != nil {
			return CancelResult{}, err
		}
	}

	orderID := strings.TrimSpace(req.OrderID)
	if orderID == "" {
		return CancelResult{}, fmt.Errorf("%w: order id is required", ErrInvalidRequest)
	}

	body, err := json.Marshal(wireCancelOrderBody{OrderID: orderID})
	if err != nil {
		return CancelResult{}, err
	}

	ts := strconv.FormatInt(c.now().UTC().Unix(), 10)
	headers, err := l2AuthHeaders(creds, ts, http.MethodDelete, orderCancelPath, string(body))
	if err != nil {
		return CancelResult{}, &UpstreamError{Kind: ErrUpstream, Operation: "cancel order"}
	}

	url := c.baseURL + orderCancelPath
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodDelete, url, bytes.NewReader(body))
	if err != nil {
		return CancelResult{}, &UpstreamError{Kind: ErrUpstream, Operation: "cancel order"}
	}
	httpReq.Header.Set("Accept", "application/json")
	httpReq.Header.Set("Content-Type", "application/json")
	for key, value := range headers {
		httpReq.Header.Set(key, value)
	}

	res, err := c.httpClient.Do(httpReq)
	if err != nil {
		if isSubmitTimeout(err) {
			return CancelResult{}, &UpstreamError{Kind: ErrSubmitUnknown, Operation: "cancel order"}
		}
		return CancelResult{}, &UpstreamError{Kind: ErrSubmitUnknown, Operation: "cancel order"}
	}
	defer res.Body.Close()

	rawBody, err := io.ReadAll(io.LimitReader(res.Body, maxResponseBytes+1))
	if err != nil {
		return CancelResult{}, &UpstreamError{Kind: ErrSubmitUnknown, Operation: "cancel order"}
	}
	if len(rawBody) > maxResponseBytes {
		return CancelResult{}, fmt.Errorf("%w: response exceeds %d bytes", ErrInvalidPayload, maxResponseBytes)
	}

	if res.StatusCode != http.StatusOK {
		return CancelResult{}, classifySubmitStatus("cancel order", res.StatusCode)
	}

	var parsed wireCancelOrderResponse
	decoder := json.NewDecoder(bytes.NewReader(rawBody))
	if err := decoder.Decode(&parsed); err != nil {
		return CancelResult{}, fmt.Errorf("%w: cancel order decode", ErrInvalidPayload)
	}

	return CancelResult{
		Canceled:    parsed.Canceled,
		NotCanceled: parsed.NotCanceled,
		Success:     len(parsed.Canceled) > 0,
		RawStatus:   res.StatusCode,
	}, nil
}
