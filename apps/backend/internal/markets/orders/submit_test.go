package orders_test

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/clob"
	"retropick/apps/backend/internal/markets/orders"
	"retropick/apps/backend/internal/markets/wallet"
)

type stubSubmitter struct {
	result clob.SubmitResult
	err    error
	calls  int
}

func (s *stubSubmitter) SubmitOrder(context.Context, clob.SubmitRequest) (clob.SubmitResult, error) {
	s.calls++
	return s.result, s.err
}

type stubBooks struct{}

func (stubBooks) GetOrderBook(context.Context, string) (clob.OrderBook, error) {
	return clob.OrderBook{TickSize: "0.01", MinOrderSize: "1"}, nil
}

type stubMarkets struct{}

func (stubMarkets) GetMarket(context.Context, string) (markets.MarketDetail, error) {
	return markets.MarketDetail{Question: "Test?", Outcomes: []markets.Outcome{{UpstreamID: "999001", Name: "Yes"}}}, nil
}

const testMaker = "0x1111111111111111111111111111111111111111"
const testSigner = "0x2222222222222222222222222222222222222222"

func testSubmitService(t *testing.T, submitter orders.VenueSubmitter, enabled bool, store *orders.PreviewStore) *orders.Service {
	t.Helper()
	fixed := time.Date(2026, 8, 9, 10, 0, 0, 0, time.UTC)
	disc := wallet.NewDiscoverer(wallet.MemoryStore{Rows: map[string][]wallet.LinkedAccount{
		"user-1|" + testSigner: {{
			AccountWallet: testMaker,
			LinkStatus:    wallet.LinkStatusLinked,
			ChainID:       137,
		}},
	}}, nil)
	return orders.NewService(orders.ServiceConfig{
		Store:      store,
		Discoverer: disc,
		Markets:    stubMarkets{},
		Books:      stubBooks{},
		Now:        func() time.Time { return fixed },
		SaltFn:     func() (string, error) { return "42", nil },
		Submit: orders.SubmitConfig{
			OrderSubmitEnabled: enabled,
			Venue:              submitter,
		},
	})
}

func seedPreview(t *testing.T, svc *orders.Service) orders.SubmitRequest {
	t.Helper()
	session := wallet.SessionContext{UserID: "user-1", SignerAddress: testSigner}
	preview, err := svc.Preview(context.Background(), session, orders.PreviewRequest{
		MarketID:     "polymarket:market:1",
		TokenID:      "999001",
		Side:         orders.SideBuy,
		Price:        "0.42",
		Size:         "100",
		MakerAddress: testMaker,
	})
	if err != nil {
		t.Fatalf("preview: %v", err)
	}
	sig := "0x" + repeatHex("ab", 64)
	return orders.SubmitRequest{
		PreviewID:   preview.PreviewID,
		ContentHash: preview.ContentHash,
		Signature:   sig,
	}
}

func repeatHex(pair string, n int) string {
	out := ""
	for i := 0; i < n; i++ {
		out += pair
	}
	return out
}

func TestSubmitOrderCapabilityDisabled(t *testing.T) {
	t.Parallel()

	svc := testSubmitService(t, &stubSubmitter{}, false, nil)
	_, status, err := svc.SubmitOrder(context.Background(), wallet.SessionContext{UserID: "user-1", SignerAddress: testSigner}, "key-1", orders.SubmitRequest{
		PreviewID:   "p1",
		ContentHash: "0x" + repeatHex("00", 32),
		Signature:   "0x01",
	})
	if !errors.Is(err, orders.ErrCapabilityDisabled) || status != 503 {
		t.Fatalf("status=%d err=%v", status, err)
	}
}

func TestSubmitOrderIntegrityMismatch409(t *testing.T) {
	t.Parallel()

	submitter := &stubSubmitter{result: clob.SubmitResult{OrderID: "v1", Status: "live", Success: true}}
	svc := testSubmitService(t, submitter, true, nil)
	req := seedPreview(t, svc)
	req.ContentHash = "0x" + repeatHex("ff", 32)

	_, status, err := svc.SubmitOrder(context.Background(), wallet.SessionContext{UserID: "user-1", SignerAddress: testSigner}, "key-1", req)
	if !errors.Is(err, orders.ErrIntegrityMismatch) || status != 409 {
		t.Fatalf("status=%d err=%v", status, err)
	}
	if submitter.calls != 0 {
		t.Fatalf("clob calls = %d", submitter.calls)
	}
}

func TestSubmitOrderPreviewExpired410(t *testing.T) {
	t.Parallel()

	fixed := time.Date(2026, 8, 9, 10, 0, 0, 0, time.UTC)
	store := orders.NewPreviewStore()
	disc := wallet.NewDiscoverer(wallet.MemoryStore{Rows: map[string][]wallet.LinkedAccount{
		"user-1|" + testSigner: {{
			AccountWallet: testMaker,
			LinkStatus:    wallet.LinkStatusLinked,
			ChainID:       137,
		}},
	}}, nil)
	baseCfg := orders.ServiceConfig{
		Store:      store,
		Discoverer: disc,
		Markets:    stubMarkets{},
		Books:      stubBooks{},
		SaltFn:     func() (string, error) { return "42", nil },
		Submit:     orders.SubmitConfig{OrderSubmitEnabled: true, Venue: &stubSubmitter{}},
	}
	seedCfg := baseCfg
	seedCfg.Now = func() time.Time { return fixed }
	seedSvc := orders.NewService(seedCfg)
	req := seedPreview(t, seedSvc)

	lateCfg := baseCfg
	lateCfg.Now = func() time.Time { return fixed.Add(6 * time.Minute) }
	svc := orders.NewService(lateCfg)

	_, status, err := svc.SubmitOrder(context.Background(), wallet.SessionContext{UserID: "user-1", SignerAddress: testSigner}, "key-1", req)
	if !errors.Is(err, orders.ErrPreviewExpired) || status != 410 {
		t.Fatalf("status=%d err=%v", status, err)
	}
}

func TestSubmitOrderHappyPath(t *testing.T) {
	t.Parallel()

	submitter := &stubSubmitter{result: clob.SubmitResult{OrderID: "venue-99", Status: "live", Success: true}}
	svc := testSubmitService(t, submitter, true, nil)
	req := seedPreview(t, svc)

	resp, status, err := svc.SubmitOrder(context.Background(), wallet.SessionContext{UserID: "user-1", SignerAddress: testSigner}, "key-1", req)
	if err != nil || status != 201 {
		t.Fatalf("status=%d err=%v", status, err)
	}
	if resp.VenueOrderID != "venue-99" || resp.Status != "open" {
		t.Fatalf("resp %+v", resp)
	}
	if submitter.calls != 1 {
		t.Fatalf("calls = %d", submitter.calls)
	}
}

func TestSubmitOrderIdempotencyReplay(t *testing.T) {
	t.Parallel()

	submitter := &stubSubmitter{result: clob.SubmitResult{OrderID: "venue-99", Status: "live", Success: true}}
	svc := testSubmitService(t, submitter, true, nil)
	req := seedPreview(t, svc)

	_, _, err := svc.SubmitOrder(context.Background(), wallet.SessionContext{UserID: "user-1", SignerAddress: testSigner}, "key-1", req)
	if err != nil {
		t.Fatal(err)
	}
	resp2, status, err := svc.SubmitOrder(context.Background(), wallet.SessionContext{UserID: "user-1", SignerAddress: testSigner}, "key-1", req)
	if err != nil || status != 201 {
		t.Fatalf("status=%d err=%v", status, err)
	}
	if submitter.calls != 1 {
		t.Fatalf("expected 1 venue call, got %d", submitter.calls)
	}
	if resp2.VenueOrderID != "venue-99" {
		t.Fatalf("resp %+v", resp2)
	}
}

func TestSubmitOrderSameIdempotencyKeyConcurrentSingleVenueCall(t *testing.T) {
	t.Parallel()

	submitter := &countingSubmitter{result: clob.SubmitResult{OrderID: "venue-99", Status: "live", Success: true}}
	svc := testSubmitService(t, submitter, true, nil)
	req := seedPreview(t, svc)
	session := wallet.SessionContext{UserID: "user-1", SignerAddress: testSigner}

	const n = 100
	start := make(chan struct{})
	var wg sync.WaitGroup
	responses := make(chan orders.SubmitResponse, n)
	errs := make(chan error, n)
	statuses := make(chan int, n)
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-start
			resp, status, err := svc.SubmitOrder(context.Background(), session, "key-concurrent", req)
			responses <- resp
			statuses <- status
			errs <- err
		}()
	}
	close(start)
	wg.Wait()
	close(responses)
	close(statuses)
	close(errs)

	for err := range errs {
		if err != nil {
			t.Fatalf("submit error: %v", err)
		}
	}
	for status := range statuses {
		if status != 201 {
			t.Fatalf("status = %d", status)
		}
	}
	var first orders.SubmitResponse
	for resp := range responses {
		if first.OrderID == "" {
			first = resp
			continue
		}
		if resp.OrderID != first.OrderID || resp.VenueOrderID != first.VenueOrderID || resp.Status != first.Status {
			t.Fatalf("non-idempotent replay: first=%+v next=%+v", first, resp)
		}
	}
	if calls := submitter.calls.Load(); calls != 1 {
		t.Fatalf("venue calls = %d, want 1", calls)
	}
}

func TestSubmitOrderIdempotencyConflict422(t *testing.T) {
	t.Parallel()

	submitter := &stubSubmitter{result: clob.SubmitResult{OrderID: "venue-99", Status: "live", Success: true}}
	svc := testSubmitService(t, submitter, true, nil)
	req := seedPreview(t, svc)

	_, _, err := svc.SubmitOrder(context.Background(), wallet.SessionContext{UserID: "user-1", SignerAddress: testSigner}, "key-1", req)
	if err != nil {
		t.Fatal(err)
	}
	req2 := req
	req2.Signature = "0x02"
	_, status, err := svc.SubmitOrder(context.Background(), wallet.SessionContext{UserID: "user-1", SignerAddress: testSigner}, "key-1", req2)
	if !errors.Is(err, orders.ErrIdempotencyConflict) || status != 422 {
		t.Fatalf("status=%d err=%v", status, err)
	}
}

type countingSubmitter struct {
	result clob.SubmitResult
	err    error
	calls  atomic.Int32
}

func (s *countingSubmitter) SubmitOrder(context.Context, clob.SubmitRequest) (clob.SubmitResult, error) {
	s.calls.Add(1)
	time.Sleep(10 * time.Millisecond)
	return s.result, s.err
}

func TestSubmitOrderUnknownReconciling(t *testing.T) {
	t.Parallel()

	submitter := &stubSubmitter{err: clob.ErrSubmitUnknown}
	svc := testSubmitService(t, submitter, true, nil)
	req := seedPreview(t, svc)

	resp, status, err := svc.SubmitOrder(context.Background(), wallet.SessionContext{UserID: "user-1", SignerAddress: testSigner}, "key-1", req)
	if err != nil || status != 201 {
		t.Fatalf("status=%d err=%v", status, err)
	}
	if resp.Status != "unknown" {
		t.Fatalf("status = %q", resp.Status)
	}
}
