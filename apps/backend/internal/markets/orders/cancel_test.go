package orders_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"retropick/apps/backend/internal/markets/clob"
	"retropick/apps/backend/internal/markets/orders"
	"retropick/apps/backend/internal/markets/wallet"
)

type stubCancelVenue struct {
	result clob.CancelResult
	err    error
	calls  int
}

func (s *stubCancelVenue) CancelOrder(context.Context, string) (clob.CancelResult, error) {
	s.calls++
	return s.result, s.err
}

func testCancelService(t *testing.T, venue *stubCancelVenue, enabled bool) *orders.Service {
	t.Helper()
	fixed := time.Date(2026, 8, 9, 10, 0, 0, 0, time.UTC)
	store := orders.NewProjectionStore()
	svc := orders.NewService(orders.ServiceConfig{
		Projections: store,
		Markets:     stubMarkets{},
		Now:         func() time.Time { return fixed },
		SaltFn:      func() (string, error) { return "99", nil },
		Cancel: orders.CancelConfig{
			OrderSubmitEnabled: enabled,
			Venue:              venue,
		},
	})
	store.PutOrder(orders.UserOrderRecord{
		OrderID:        "order-1",
		UserID:         "user-1",
		VenueOrderID:   "0xvenue-1",
		MarketID:       "polymarket:market:1",
		TokenID:        "999001",
		Side:           orders.SideBuy,
		Price:          "0.42",
		OriginalSize:   "100",
		FilledSize:     "0",
		RemainingSize:  "100",
		Status:         "open",
		ExchangeDomain: orders.ExchangeDomainStandard,
		Maker:          testMaker,
		CreatedAt:      fixed,
		UpdatedAt:      fixed,
	})
	return svc
}

func TestCancelOrderHappyPath(t *testing.T) {
	t.Parallel()

	venue := &stubCancelVenue{result: clob.CancelResult{Canceled: []string{"0xvenue-1"}, Success: true}}
	svc := testCancelService(t, venue, true)
	session := wallet.SessionContext{UserID: "user-1", SignerAddress: testSigner}

	preview, err := svc.PreviewCancel(context.Background(), session, "order-1")
	if err != nil {
		t.Fatal(err)
	}

	resp, status, err := svc.CancelOrder(context.Background(), session, "order-1", "cancel-key-1", orders.CancelRequest{
		PreviewID:   preview.PreviewID,
		ContentHash: preview.ContentHash,
		Signature:   "0x01",
	})
	if err != nil || status != 200 {
		t.Fatalf("status=%d err=%v", status, err)
	}
	if resp.Status != "canceled" || venue.calls != 1 {
		t.Fatalf("resp %+v calls=%d", resp, venue.calls)
	}
}

func TestCancelOrderCapabilityDisabled(t *testing.T) {
	t.Parallel()

	svc := testCancelService(t, &stubCancelVenue{}, false)
	_, status, err := svc.CancelOrder(context.Background(), wallet.SessionContext{UserID: "user-1", SignerAddress: testSigner}, "order-1", "key", orders.CancelRequest{
		PreviewID: "p1", ContentHash: "0x" + repeatHex("00", 32), Signature: "0x01",
	})
	if !errors.Is(err, orders.ErrCapabilityDisabled) || status != 503 {
		t.Fatalf("status=%d err=%v", status, err)
	}
}

func seedCancelPreview(t *testing.T, svc *orders.Service) (orders.CancelRequest, string) {
	t.Helper()
	session := wallet.SessionContext{UserID: "user-1", SignerAddress: testSigner}
	preview, err := svc.PreviewCancel(context.Background(), session, "order-1")
	if err != nil {
		t.Fatalf("preview cancel: %v", err)
	}
	return orders.CancelRequest{
		PreviewID:   preview.PreviewID,
		ContentHash: preview.ContentHash,
		Signature:   "0x" + repeatHex("ab", 64),
	}, preview.PreviewID
}

func TestCancelOrderIdempotencyReplay(t *testing.T) {
	t.Parallel()

	venue := &stubCancelVenue{result: clob.CancelResult{Canceled: []string{"0xvenue-1"}, Success: true}}
	svc := testCancelService(t, venue, true)
	session := wallet.SessionContext{UserID: "user-1", SignerAddress: testSigner}
	req, _ := seedCancelPreview(t, svc)

	resp1, status, err := svc.CancelOrder(context.Background(), session, "order-1", "cancel-key-1", req)
	if err != nil || status != 200 {
		t.Fatalf("status=%d err=%v", status, err)
	}
	resp2, status2, err := svc.CancelOrder(context.Background(), session, "order-1", "cancel-key-1", req)
	if err != nil || status2 != 200 {
		t.Fatalf("replay status=%d err=%v", status2, err)
	}
	if venue.calls != 1 {
		t.Fatalf("expected 1 venue call, got %d", venue.calls)
	}
	if resp2.Status != resp1.Status {
		t.Fatalf("resp1=%+v resp2=%+v", resp1, resp2)
	}
}

func TestCancelOrderIdempotencyConflict422(t *testing.T) {
	t.Parallel()

	venue := &stubCancelVenue{result: clob.CancelResult{Canceled: []string{"0xvenue-1"}, Success: true}}
	svc := testCancelService(t, venue, true)
	session := wallet.SessionContext{UserID: "user-1", SignerAddress: testSigner}
	req, _ := seedCancelPreview(t, svc)

	_, _, err := svc.CancelOrder(context.Background(), session, "order-1", "cancel-key-422", req)
	if err != nil {
		t.Fatal(err)
	}
	req2 := req
	req2.Signature = "0x02"
	_, status, err := svc.CancelOrder(context.Background(), session, "order-1", "cancel-key-422", req2)
	if !errors.Is(err, orders.ErrIdempotencyConflict) || status != 422 {
		t.Fatalf("status=%d err=%v", status, err)
	}
}

func TestCancelOrderUnknownCancelPending(t *testing.T) {
	t.Parallel()

	venue := &stubCancelVenue{err: clob.ErrSubmitUnknown}
	svc := testCancelService(t, venue, true)
	session := wallet.SessionContext{UserID: "user-1", SignerAddress: testSigner}
	req, _ := seedCancelPreview(t, svc)

	resp, status, err := svc.CancelOrder(context.Background(), session, "order-1", "cancel-key-unknown", req)
	if err != nil || status != 200 {
		t.Fatalf("status=%d err=%v", status, err)
	}
	if resp.Status != "cancel_pending" {
		t.Fatalf("status = %q", resp.Status)
	}
}

func TestListMyOrdersAfterSubmit(t *testing.T) {
	t.Parallel()

	submitter := &stubSubmitter{result: clob.SubmitResult{OrderID: "venue-99", Status: "live", Success: true}}
	svc := testSubmitService(t, submitter, true, nil)
	session := wallet.SessionContext{UserID: "user-1", SignerAddress: testSigner}
	req := seedPreview(t, svc)

	_, _, err := svc.SubmitOrder(context.Background(), session, "key-1", req)
	if err != nil {
		t.Fatal(err)
	}

	list, err := svc.ListMyOrders(context.Background(), session, orders.ListOrdersFilter{})
	if err != nil {
		t.Fatal(err)
	}
	if len(list.Orders) != 1 || list.Orders[0].VenueOrderID != "venue-99" {
		t.Fatalf("orders %+v", list.Orders)
	}
}

func TestListMyFillsEmpty(t *testing.T) {
	t.Parallel()

	svc := testSubmitService(t, &stubSubmitter{}, true, nil)
	session := wallet.SessionContext{UserID: "user-1", SignerAddress: testSigner}

	list, err := svc.ListMyFills(context.Background(), session, orders.ListFillsFilter{})
	if err != nil {
		t.Fatal(err)
	}
	if len(list.Fills) != 0 {
		t.Fatalf("fills %+v", list.Fills)
	}
}

func TestListMyOrdersOpenFilterIncludesUnknown(t *testing.T) {
	t.Parallel()

	fixed := time.Date(2026, 8, 9, 10, 0, 0, 0, time.UTC)
	store := orders.NewProjectionStore()
	disc := wallet.NewDiscoverer(wallet.MemoryStore{Rows: map[string][]wallet.LinkedAccount{
		"user-1|" + testSigner: {{
			AccountWallet: testMaker,
			LinkStatus:    wallet.LinkStatusLinked,
			ChainID:       137,
		}},
	}}, nil)
	svc := orders.NewService(orders.ServiceConfig{
		Projections: store,
		Discoverer:  disc,
		Markets:     stubMarkets{},
		Books:       stubBooks{},
		Now:         func() time.Time { return fixed },
		SaltFn:      func() (string, error) { return "42", nil },
	})
	store.PutOrder(orders.UserOrderRecord{
		OrderID: "order-open", UserID: "user-1", Status: "open",
		MarketID: "polymarket:market:1", TokenID: "999001", Side: orders.SideBuy,
		Price: "0.42", OriginalSize: "100", RemainingSize: "100",
		CreatedAt: fixed, UpdatedAt: fixed,
	})
	store.PutOrder(orders.UserOrderRecord{
		OrderID: "order-unknown", UserID: "user-1", Status: "unknown",
		MarketID: "polymarket:market:1", TokenID: "999001", Side: orders.SideBuy,
		Price: "0.42", OriginalSize: "100", RemainingSize: "100",
		CreatedAt: fixed, UpdatedAt: fixed,
	})
	store.PutOrder(orders.UserOrderRecord{
		OrderID: "order-filled", UserID: "user-1", Status: "filled",
		MarketID: "polymarket:market:1", TokenID: "999001", Side: orders.SideBuy,
		Price: "0.42", OriginalSize: "100", RemainingSize: "0",
		CreatedAt: fixed, UpdatedAt: fixed,
	})

	session := wallet.SessionContext{UserID: "user-1", SignerAddress: testSigner}
	list, err := svc.ListMyOrders(context.Background(), session, orders.ListOrdersFilter{Status: "open"})
	if err != nil {
		t.Fatal(err)
	}
	if len(list.Orders) != 2 {
		t.Fatalf("expected 2 open-filtered orders, got %+v", list.Orders)
	}
}
