package reconcile

import (
	"context"
	"testing"
	"time"

	"retropick/apps/backend/internal/markets/activity"
	"retropick/apps/backend/internal/markets/clob"
	"retropick/apps/backend/internal/markets/orders"
)

func TestWorkerProjectsReconciledFillToActivityAppender(t *testing.T) {
	store := orders.NewProjectionStore()
	store.PutOrder(orders.UserOrderRecord{OrderID: "order-1", UserID: "user-1", VenueOrderID: "venue-order-1", MarketID: "polymarket:market:1", TokenID: "token-1"})
	appender := &recordingActivityAppender{}
	worker := NewWorker(WorkerConfig{
		Store:    store,
		Venue:    activityVenue{trades: []clob.VenueTrade{{TradeID: "trade-1", OrderID: "venue-order-1", Side: "BUY", Price: "0.42", Size: "10"}}},
		Activity: appender,
	})

	worker.RunOnce(context.Background())

	if len(appender.events) != 1 {
		t.Fatalf("activity events = %+v", appender.events)
	}
	event := appender.events[0]
	if event.UserID != "user-1" || event.Kind != activity.KindFill || event.UpstreamID != "trade-1" || event.Amount != "10" {
		t.Fatalf("activity event = %+v", event)
	}
}

type recordingActivityAppender struct{ events []activity.Event }

func (a *recordingActivityAppender) Append(_ context.Context, event activity.Event) error {
	a.events = append(a.events, event)
	return nil
}

type activityVenue struct{ trades []clob.VenueTrade }

func (v activityVenue) ListOpenOrders(context.Context) ([]clob.VenueOpenOrder, error) {
	return nil, nil
}
func (v activityVenue) ListTrades(context.Context) ([]clob.VenueTrade, error) { return v.trades, nil }

var _ = time.Second
