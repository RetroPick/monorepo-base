package clob

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"strconv"
	"strings"
)

// SubmitOrder posts a signed limit order to CLOB V2 POST /order.
// Network timeouts return ErrSubmitUnknown; callers must reconcile, never auto-resubmit.
func (c *TradingClient) SubmitOrder(ctx context.Context, req SubmitRequest) (SubmitResult, error) {
	creds := req.Credentials
	if strings.TrimSpace(creds.APIKey) == "" {
		var err error
		creds, err = c.creds.Credentials(ctx)
		if err != nil {
			return SubmitResult{}, err
		}
		req.Credentials = creds
	}

	body, err := BuildSendOrderBody(req)
	if err != nil {
		return SubmitResult{}, err
	}

	ts := strconv.FormatInt(c.now().UTC().Unix(), 10)
	headers, err := l2AuthHeaders(creds, ts, http.MethodPost, orderSubmitPath, string(body))
	if err != nil {
		return SubmitResult{}, &UpstreamError{Kind: ErrUpstream, Operation: "submit order"}
	}

	url := c.baseURL + orderSubmitPath
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return SubmitResult{}, &UpstreamError{Kind: ErrUpstream, Operation: "submit order"}
	}
	httpReq.Header.Set("Accept", "application/json")
	httpReq.Header.Set("Content-Type", "application/json")
	for key, value := range headers {
		httpReq.Header.Set(key, value)
	}

	res, err := c.httpClient.Do(httpReq)
	if err != nil {
		if isSubmitTimeout(err) {
			return SubmitResult{}, &UpstreamError{Kind: ErrSubmitUnknown, Operation: "submit order"}
		}
		return SubmitResult{}, &UpstreamError{Kind: ErrSubmitUnknown, Operation: "submit order"}
	}
	defer res.Body.Close()

	rawBody, err := io.ReadAll(io.LimitReader(res.Body, maxResponseBytes+1))
	if err != nil {
		return SubmitResult{}, &UpstreamError{Kind: ErrSubmitUnknown, Operation: "submit order"}
	}
	if len(rawBody) > maxResponseBytes {
		return SubmitResult{}, fmt.Errorf("%w: response exceeds %d bytes", ErrInvalidPayload, maxResponseBytes)
	}

	if res.StatusCode != http.StatusOK {
		return SubmitResult{}, classifySubmitStatus("submit order", res.StatusCode)
	}

	var parsed wireSendOrderResponse
	decoder := json.NewDecoder(bytes.NewReader(rawBody))
	decoder.UseNumber()
	if err := decoder.Decode(&parsed); err != nil {
		return SubmitResult{}, fmt.Errorf("%w: submit order decode", ErrInvalidPayload)
	}

	if !parsed.Success {
		return SubmitResult{}, &UpstreamError{
			Kind:       ErrSubmitRejected,
			Operation:  "submit order",
			StatusCode: http.StatusBadRequest,
		}
	}

	return SubmitResult{
		OrderID:   strings.TrimSpace(parsed.OrderID),
		Status:    strings.TrimSpace(parsed.Status),
		Success:   parsed.Success,
		ErrorMsg:  strings.TrimSpace(parsed.ErrorMsg),
		RawStatus: res.StatusCode,
	}, nil
}

func classifySubmitStatus(operation string, status int) error {
	kind := ErrUpstream
	switch status {
	case http.StatusBadRequest:
		kind = ErrSubmitRejected
	case http.StatusUnauthorized, http.StatusForbidden:
		kind = ErrAuthInvalid
	case http.StatusNotFound:
		kind = ErrNotFound
	case http.StatusTooManyRequests:
		kind = ErrRateLimited
	}
	return &UpstreamError{Kind: kind, Operation: operation, StatusCode: status}
}

func isSubmitTimeout(err error) bool {
	if errors.Is(err, context.DeadlineExceeded) {
		return true
	}
	var netErr net.Error
	return errors.As(err, &netErr) && netErr.Timeout()
}
