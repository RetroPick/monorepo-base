package clob

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func sampleSubmitRequest() SubmitRequest {
	creds := SandboxCredentials()
	return SubmitRequest{
		Order: OrderPayload{
			Salt:          "479249096354",
			Maker:         "0x1234567890123456789012345678901234567890",
			Signer:        "0x1234567890123456789012345678901234567890",
			TokenID:       "102936123456789",
			MakerAmount:   "5200000",
			TakerAmount:   "10000000",
			Side:          0,
			SignatureType: 0,
			Timestamp:     "1735689600000",
			Metadata:      "0x0000000000000000000000000000000000000000000000000000000000000000",
			Builder:       "0000000000000000000000000000000000000000000000000000000000000001",
		},
		Signature:   "0xabc123signature",
		OrderType:   OrderTypeGTC,
		Credentials: creds,
	}
}

func TestSubmitOrderHappyPath(t *testing.T) {
	t.Parallel()

	var capturedBody []byte
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/order" {
			t.Fatalf("path %s", r.URL.Path)
		}
		if r.Method != http.MethodPost {
			t.Fatalf("method %s", r.Method)
		}
		if r.Header.Get("POLY_API_KEY") == "" || r.Header.Get("POLY_SIGNATURE") == "" {
			t.Fatal("missing L2 headers")
		}
		body, err := io.ReadAll(r.Body)
		if err != nil {
			t.Fatal(err)
		}
		capturedBody = body

		var payload map[string]any
		if err := json.Unmarshal(body, &payload); err != nil {
			t.Fatal(err)
		}
		order, _ := payload["order"].(map[string]any)
		if order == nil {
			t.Fatalf("order missing in %s", body)
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
		if payload["owner"] != SandboxCredentials().APIKey {
			t.Fatalf("owner = %v", payload["owner"])
		}

		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"success":true,"orderID":"ord-123","status":"live"}`))
	}))
	defer srv.Close()

	client := NewTradingClient(TradingClientConfig{
		BaseURL: srv.URL,
		Creds:   StaticCredentialProvider{Creds: SandboxCredentials()},
	})
	got, err := client.SubmitOrder(context.Background(), sampleSubmitRequest())
	if err != nil {
		t.Fatal(err)
	}
	if got.OrderID != "ord-123" || got.Status != "live" || !got.Success {
		t.Fatalf("result %+v", got)
	}
	if len(capturedBody) == 0 {
		t.Fatal("expected captured body")
	}
}

func TestSubmitOrderL2SignatureIncludesBody(t *testing.T) {
	t.Parallel()

	req := sampleSubmitRequest()
	body, err := BuildSendOrderBody(req)
	if err != nil {
		t.Fatal(err)
	}

	var gotSig string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotSig = r.Header.Get("POLY_SIGNATURE")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"success":true,"orderID":"ord-1","status":"live"}`))
	}))
	defer srv.Close()

	creds := SandboxCredentials()
	ts := "1700000099"
	wantSig, err := buildL2Signature(creds.Secret, ts, http.MethodPost, orderSubmitPath, string(body))
	if err != nil {
		t.Fatal(err)
	}

	client := NewTradingClient(TradingClientConfig{
		BaseURL: srv.URL,
		Creds:   StaticCredentialProvider{Creds: creds},
	})
	client.now = func() time.Time { return time.Unix(1700000099, 0).UTC() }

	_, err = client.SubmitOrder(context.Background(), req)
	if err != nil {
		t.Fatal(err)
	}
	if gotSig != wantSig {
		t.Fatalf("signature = %q want %q", gotSig, wantSig)
	}
}

func TestSubmitOrderRejected400(t *testing.T) {
	t.Parallel()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, "invalid order", http.StatusBadRequest)
	}))
	defer srv.Close()

	client := NewTradingClient(TradingClientConfig{
		BaseURL: srv.URL,
		Creds:   StaticCredentialProvider{Creds: SandboxCredentials()},
	})
	_, err := client.SubmitOrder(context.Background(), sampleSubmitRequest())
	if !errors.Is(err, ErrSubmitRejected) {
		t.Fatalf("error %v", err)
	}
}

func TestSubmitOrderRateLimited429(t *testing.T) {
	t.Parallel()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, "throttled", http.StatusTooManyRequests)
	}))
	defer srv.Close()

	client := NewTradingClient(TradingClientConfig{
		BaseURL: srv.URL,
		Creds:   StaticCredentialProvider{Creds: SandboxCredentials()},
	})
	_, err := client.SubmitOrder(context.Background(), sampleSubmitRequest())
	if !errors.Is(err, ErrRateLimited) {
		t.Fatalf("error %v", err)
	}
}

func TestSubmitOrderTimeoutUnknown(t *testing.T) {
	t.Parallel()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		time.Sleep(200 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	client := NewTradingClient(TradingClientConfig{
		BaseURL: srv.URL,
		Timeout: 50 * time.Millisecond,
		Creds:   StaticCredentialProvider{Creds: SandboxCredentials()},
	})
	_, err := client.SubmitOrder(context.Background(), sampleSubmitRequest())
	if !errors.Is(err, ErrSubmitUnknown) {
		t.Fatalf("error %v", err)
	}
}

func TestSubmitOrderMissingSignature(t *testing.T) {
	t.Parallel()

	client := NewTradingClient(TradingClientConfig{
		BaseURL: "http://unused",
		Creds:   StaticCredentialProvider{Creds: SandboxCredentials()},
	})
	req := sampleSubmitRequest()
	req.Signature = ""
	_, err := client.SubmitOrder(context.Background(), req)
	if !errors.Is(err, ErrInvalidRequest) {
		t.Fatalf("error %v", err)
	}
}

func TestSubmitOrderAuthInvalid401(t *testing.T) {
	t.Parallel()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
	}))
	defer srv.Close()

	client := NewTradingClient(TradingClientConfig{
		BaseURL: srv.URL,
		Creds:   StaticCredentialProvider{Creds: SandboxCredentials()},
	})
	_, err := client.SubmitOrder(context.Background(), sampleSubmitRequest())
	if !errors.Is(err, ErrAuthInvalid) {
		t.Fatalf("error %v", err)
	}
}

func TestSideWireFromInt(t *testing.T) {
	t.Parallel()

	buy, err := SideWireFromInt(0)
	if err != nil || buy != "BUY" {
		t.Fatalf("buy = %q err = %v", buy, err)
	}
	sell, err := SideWireFromInt(1)
	if err != nil || sell != "SELL" {
		t.Fatalf("sell = %q err = %v", sell, err)
	}
	if _, err := SideWireFromInt(2); !errors.Is(err, ErrInvalidRequest) {
		t.Fatalf("error %v", err)
	}
}

func TestBuildSendOrderBodySellSide(t *testing.T) {
	t.Parallel()

	req := sampleSubmitRequest()
	req.Order.Side = 1
	body, err := BuildSendOrderBody(req)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(body), `"side":"SELL"`) {
		t.Fatalf("body %s", body)
	}
}

func TestNoV1OrderPaths(t *testing.T) {
	t.Parallel()

	if orderSubmitPath == "/v1/order" || strings.Contains(orderSubmitPath, "/v1/") {
		t.Fatalf("submit path must be V2: %q", orderSubmitPath)
	}
}

func TestUnwiredCredentialProvider(t *testing.T) {
	t.Parallel()

	client := NewTradingClient(TradingClientConfig{BaseURL: "http://unused"})
	req := sampleSubmitRequest()
	req.Credentials = L2Credentials{}
	_, err := client.SubmitOrder(context.Background(), req)
	if !errors.Is(err, ErrCredentialsUnwired) {
		t.Fatalf("error %v", err)
	}
}

func TestSubmitOrderUpstreamFalseSuccess(t *testing.T) {
	t.Parallel()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"success":false,"errorMsg":"duplicate signature"}`))
	}))
	defer srv.Close()

	client := NewTradingClient(TradingClientConfig{
		BaseURL: srv.URL,
		Creds:   StaticCredentialProvider{Creds: SandboxCredentials()},
	})
	_, err := client.SubmitOrder(context.Background(), sampleSubmitRequest())
	if !errors.Is(err, ErrSubmitRejected) {
		t.Fatalf("error %v", err)
	}
}
