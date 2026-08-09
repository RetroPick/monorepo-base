package orders

import (
	"context"
	"testing"
	"time"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/clob"
	"retropick/apps/backend/internal/markets/wallet"
)

func TestSubmitOrderStoreRoundTrip(t *testing.T) {
	fixed := time.Date(2026, 8, 9, 10, 0, 0, 0, time.UTC)
	disc := wallet.NewDiscoverer(wallet.MemoryStore{Rows: map[string][]wallet.LinkedAccount{
		"user-1|0x2222222222222222222222222222222222222222": {{
			AccountWallet: "0x1111111111111111111111111111111111111111",
			LinkStatus:    wallet.LinkStatusLinked,
			ChainID:       137,
		}},
	}}, nil)
	svc := NewService(ServiceConfig{
		Discoverer: disc,
		Markets:    stubMarketsForTest{},
		Books:      stubBooksForTest{},
		Now:        func() time.Time { return fixed },
		SaltFn:     func() (string, error) { return "42", nil },
		Submit: SubmitConfig{
			OrderSubmitEnabled: true,
			Venue:              &stubVenue{result: clob.SubmitResult{OrderID: "v1", Status: "live", Success: true}},
		},
	})
	session := wallet.SessionContext{UserID: "user-1", SignerAddress: "0x2222222222222222222222222222222222222222"}
	preview, err := svc.Preview(context.Background(), session, PreviewRequest{
		MarketID: "polymarket:market:1", TokenID: "999001", Side: SideBuy,
		Price: "0.42", Size: "100", MakerAddress: "0x1111111111111111111111111111111111111111",
	})
	if err != nil {
		t.Fatal(err)
	}
	rec, ok := svc.store.Get(preview.PreviewID)
	if !ok {
		t.Fatal("preview missing from store")
	}
	if rec.UserID != "user-1" {
		t.Fatalf("userID = %q", rec.UserID)
	}
	sig := "0x" + repeatHexChar('a', 128)
	_, status, err := svc.SubmitOrder(context.Background(), session, "idem-1", SubmitRequest{
		PreviewID: preview.PreviewID, ContentHash: preview.ContentHash, Signature: sig,
	})
	if err != nil || status != 201 {
		t.Fatalf("status=%d err=%v rec=%+v", status, err, rec)
	}
}

type stubBooksForTest struct{}

func (stubBooksForTest) GetOrderBook(context.Context, string) (clob.OrderBook, error) {
	return clob.OrderBook{TickSize: "0.01", MinOrderSize: "1"}, nil
}

type stubMarketsForTest struct{}

func (stubMarketsForTest) GetMarket(context.Context, string) (markets.MarketDetail, error) {
	return markets.MarketDetail{Question: "Q", Outcomes: []markets.Outcome{{UpstreamID: "999001", Name: "Yes"}}}, nil
}

type stubVenue struct {
	result clob.SubmitResult
	err    error
}

func (s *stubVenue) SubmitOrder(context.Context, clob.SubmitRequest) (clob.SubmitResult, error) {
	return s.result, s.err
}

func repeatHexChar(c byte, n int) string {
	b := make([]byte, n)
	for i := range b {
		b[i] = c
	}
	return string(b)
}
