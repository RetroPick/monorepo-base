package clob

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCancelOrderHappyPath(t *testing.T) {
	t.Parallel()

	var capturedBody []byte
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/order" {
			t.Fatalf("path %s", r.URL.Path)
		}
		if r.Method != http.MethodDelete {
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

		var payload map[string]string
		if err := json.Unmarshal(body, &payload); err != nil {
			t.Fatal(err)
		}
		if payload["orderID"] != "0xvenue-order-1" {
			t.Fatalf("orderID = %q", payload["orderID"])
		}

		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"canceled":["0xvenue-order-1"],"not_canceled":{}}`))
	}))
	defer srv.Close()

	client := NewTradingClient(TradingClientConfig{
		BaseURL: srv.URL,
		Creds:   StaticCredentialProvider{Creds: SandboxCredentials()},
	})

	result, err := client.CancelOrder(context.Background(), CancelRequest{OrderID: "0xvenue-order-1"})
	if err != nil {
		t.Fatal(err)
	}
	if !result.Success || len(result.Canceled) != 1 {
		t.Fatalf("result %+v", result)
	}
	if string(capturedBody) != `{"orderID":"0xvenue-order-1"}` {
		t.Fatalf("body %s", capturedBody)
	}
}
