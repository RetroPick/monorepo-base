package marketdata_test

import (
	"testing"
	"time"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/clob"
	"retropick/apps/backend/internal/markets/marketdata"
)

func TestReconcilerSnapshotThenPriceChange(t *testing.T) {
	t.Parallel()
	rec, err := marketdata.NewReconciler(marketdata.ReconcilerConfig{
		MarketID: "market-1",
		TokenID:  "token-1",
	})
	if err != nil {
		t.Fatal(err)
	}
	observed := time.Date(2026, 7, 31, 0, 0, 0, 0, time.UTC)
	book := clob.OrderBook{
		ConditionID:  "0xabc",
		TokenID:      "token-1",
		Timestamp:    observed,
		Hash:         "hash-1",
		Bids:         []clob.Level{{Price: "0.4", Size: "100"}},
		Asks:         []clob.Level{{Price: "0.6", Size: "200"}},
		MinOrderSize: "1",
		TickSize:     "0.01",
	}
	snapshot, err := rec.ApplyBookEvent(book, observed)
	if err != nil {
		t.Fatal(err)
	}
	if !rec.IsSynchronized() {
		t.Fatal("expected synchronized")
	}
	price, _ := markets.ParseDecimalString("0.45")
	size, _ := markets.ParseDecimalString("150")
	updated, err := rec.ApplyPriceChanges([]marketdata.PriceChange{{
		TokenID:   "token-1",
		Price:     price,
		Size:      size,
		Side:      marketdata.SideBid,
		Hash:      "hash-2",
		Timestamp: observed.Add(time.Second),
	}}, observed.Add(time.Second))
	if err != nil {
		t.Fatal(err)
	}
	if len(updated.Bids) == 0 {
		t.Fatal("expected bids")
	}
	_ = snapshot
}

func TestReconcilerUpdateBeforeSnapshotRejected(t *testing.T) {
	t.Parallel()
	rec, err := marketdata.NewReconciler(marketdata.ReconcilerConfig{
		MarketID: "market-1",
		TokenID:  "token-1",
	})
	if err != nil {
		t.Fatal(err)
	}
	price, _ := markets.ParseDecimalString("0.45")
	size, _ := markets.ParseDecimalString("150")
	_, err = rec.ApplyPriceChanges([]marketdata.PriceChange{{
		TokenID: "token-1",
		Price:   price,
		Size:    size,
		Side:    marketdata.SideBid,
	}}, time.Now().UTC())
	if err == nil {
		t.Fatal("expected error before snapshot")
	}
}

func TestReconcilerReconnectRequiresSnapshot(t *testing.T) {
	t.Parallel()
	rec, _ := marketdata.NewReconciler(marketdata.ReconcilerConfig{MarketID: "m1", TokenID: "t1"})
	observed := time.Now().UTC()
	book := clob.OrderBook{
		ConditionID: "0xabc", TokenID: "t1", Timestamp: observed, Hash: "h1",
		Bids: []clob.Level{{Price: "0.4", Size: "1"}}, Asks: []clob.Level{{Price: "0.6", Size: "1"}},
		MinOrderSize: "1", TickSize: "0.01",
	}
	_, _ = rec.ApplyBookEvent(book, observed)
	rec.BeginResync()
	if !rec.NeedsResnapshot() {
		t.Fatal("expected resnapshot required")
	}
	epoch := rec.StreamEpoch()
	if epoch < 1 {
		t.Fatalf("epoch %d", epoch)
	}
}

func TestReconcilerWrongTokenRejected(t *testing.T) {
	t.Parallel()
	rec, _ := marketdata.NewReconciler(marketdata.ReconcilerConfig{MarketID: "m1", TokenID: "t1"})
	book := clob.OrderBook{TokenID: "other", Hash: "h", Timestamp: time.Now().UTC(), MinOrderSize: "1", TickSize: "0.01"}
	_, err := rec.ApplyBookEvent(book, time.Now().UTC())
	if err == nil {
		t.Fatal("expected wrong token error")
	}
}

func TestReconcilerZeroSizeRemovesLevel(t *testing.T) {
	t.Parallel()
	rec, _ := marketdata.NewReconciler(marketdata.ReconcilerConfig{MarketID: "m1", TokenID: "t1"})
	observed := time.Now().UTC()
	book := clob.OrderBook{
		ConditionID: "0xabc", TokenID: "t1", Timestamp: observed, Hash: "h1",
		Bids: []clob.Level{{Price: "0.4", Size: "100"}, {Price: "0.39", Size: "50"}},
		Asks: []clob.Level{{Price: "0.6", Size: "100"}},
		MinOrderSize: "1", TickSize: "0.01",
	}
	_, _ = rec.ApplyBookEvent(book, observed)
	price, _ := markets.ParseDecimalString("0.4")
	zero, _ := markets.ParseDecimalString("0")
	updated, err := rec.ApplyPriceChanges([]marketdata.PriceChange{{
		TokenID: "t1", Price: price, Size: zero, Side: marketdata.SideBid, Timestamp: observed.Add(time.Second),
	}}, observed.Add(time.Second))
	if err != nil {
		t.Fatal(err)
	}
	for _, level := range updated.Bids {
		if string(level.Price) == "0.4" {
			t.Fatal("level should be removed")
		}
	}
}

func TestMidpointOrLastTrade(t *testing.T) {
	t.Parallel()
	rec, _ := marketdata.NewReconciler(marketdata.ReconcilerConfig{MarketID: "m1", TokenID: "t1"})
	observed := time.Now().UTC()
	book := clob.OrderBook{
		ConditionID: "0xabc", TokenID: "t1", Timestamp: observed, Hash: "h1",
		Bids: []clob.Level{{Price: "0.4", Size: "100"}},
		Asks: []clob.Level{{Price: "0.6", Size: "100"}},
		MinOrderSize: "1", TickSize: "0.01",
	}
	_, _ = rec.ApplyBookEvent(book, observed)
	mid, err := rec.MidpointOrLastTrade(time.Minute)
	if err != nil || mid == nil {
		t.Fatalf("mid %v err %v", mid, err)
	}
}
