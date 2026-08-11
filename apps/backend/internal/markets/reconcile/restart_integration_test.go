package reconcile_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/clob"
	"retropick/apps/backend/internal/markets/orders"
	"retropick/apps/backend/internal/markets/reconcile"
	"retropick/apps/backend/internal/markets/wallet"
)

type restartBooks struct{}

func (restartBooks) GetOrderBook(context.Context, string) (clob.OrderBook, error) {
	return clob.OrderBook{TickSize: "0.01", MinOrderSize: "1"}, nil
}

type restartMarkets struct{}

func (restartMarkets) GetMarket(context.Context, string) (markets.MarketDetail, error) {
	return markets.MarketDetail{
		Question: "Durable recovery?",
		Outcomes: []markets.Outcome{{UpstreamID: "999001", Name: "Yes"}},
	}, nil
}

type fixedSessionResolver struct{ session wallet.SessionContext }

func (r fixedSessionResolver) ResolveSession(*http.Request) (wallet.SessionContext, error) {
	return r.session, nil
}

type acceptedResponseLostVenue struct {
	mu          sync.Mutex
	open        []clob.VenueOpenOrder
	postCalls   atomic.Int32
	lookupCalls atomic.Int32
}

func (v *acceptedResponseLostVenue) SubmitOrder(_ context.Context, req clob.SubmitRequest) (clob.SubmitResult, error) {
	v.postCalls.Add(1)
	side := orders.SideBuy
	if req.Order.Side != 0 {
		side = orders.SideSell
	}
	v.mu.Lock()
	v.open = []clob.VenueOpenOrder{{
		OrderID:       "venue-response-lost-restart",
		ClientOrderID: req.Order.Salt,
		TokenID:       req.Order.TokenID,
		Side:          side,
		MakerAmount:   req.Order.MakerAmount,
		TakerAmount:   req.Order.TakerAmount,
		Salt:          req.Order.Salt,
		Status:        "live",
		Maker:         req.Order.Maker,
	}}
	v.mu.Unlock()
	return clob.SubmitResult{}, clob.ErrSubmitUnknown
}

func (v *acceptedResponseLostVenue) ListOpenOrders(context.Context) ([]clob.VenueOpenOrder, error) {
	v.lookupCalls.Add(1)
	v.mu.Lock()
	defer v.mu.Unlock()
	return append([]clob.VenueOpenOrder(nil), v.open...), nil
}

func (*acceptedResponseLostVenue) ListTrades(context.Context) ([]clob.VenueTrade, error) {
	return nil, nil
}

func TestAcceptedResponseLostRestartUsesWorkerAndNeverResubmits(t *testing.T) {
	pool := reconcileJournalPool(t)
	cleanupReconcileJournalRows(t, pool)
	t.Cleanup(func() { cleanupReconcileJournalRows(t, pool) })

	const (
		userID = "reconcile-journal-user"
		maker  = "0x1111111111111111111111111111111111111111"
		signer = "0x2222222222222222222222222222222222222222"
	)
	fixed := time.Now().UTC()
	venue := &acceptedResponseLostVenue{}
	discoverer := wallet.NewDiscoverer(wallet.MemoryStore{Rows: map[string][]wallet.LinkedAccount{
		userID + "|" + signer: {{AccountWallet: maker, LinkStatus: wallet.LinkStatusLinked, ChainID: 137}},
	}}, nil)
	journalA := orders.NewPostgresMutationJournal(pool)
	serviceA := orders.NewService(orders.ServiceConfig{
		Discoverer: discoverer,
		Markets:    restartMarkets{},
		Books:      restartBooks{},
		Now:        func() time.Time { return fixed },
		SaltFn:     func() (string, error) { return "70001", nil },
		Submit: orders.SubmitConfig{
			OrderSubmitEnabled: true,
			Venue:              venue,
			Journal:            journalA,
		},
	})
	session := wallet.SessionContext{UserID: userID, SignerAddress: signer}
	preview, err := serviceA.Preview(context.Background(), session, orders.PreviewRequest{
		MarketID:     "polymarket:market:restart",
		TokenID:      "999001",
		Side:         orders.SideBuy,
		Price:        "0.42",
		Size:         "100",
		OrderType:    orders.OrderTypeLimit,
		MakerAddress: maker,
	})
	if err != nil {
		t.Fatalf("Preview: %v", err)
	}
	submitBody, err := json.Marshal(orders.SubmitRequest{
		PreviewID:   preview.PreviewID,
		ContentHash: preview.ContentHash,
		Signature:   "0x" + strings.Repeat("ab", 64),
	})
	if err != nil {
		t.Fatal(err)
	}
	handlerA := orders.NewHandler(orders.HandlerConfig{Service: serviceA, Sessions: fixedSessionResolver{session: session}})
	httpRequest := httptest.NewRequest(http.MethodPost, "/api/v1/markets/orders/submit", bytes.NewReader(submitBody))
	httpRequest.Header.Set("Idempotency-Key", "restart-response-lost-key")
	httpResponse := httptest.NewRecorder()
	handlerA.SubmitOrder(httpResponse, httpRequest)
	var response orders.SubmitResponse
	if err := json.Unmarshal(httpResponse.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode SubmitOrder response: %v", err)
	}
	if httpResponse.Code != http.StatusCreated || response.Status != orders.OrderStatusUnknown {
		t.Fatalf("SubmitOrder response/status = %+v/%d", response, httpResponse.Code)
	}

	// Process B owns new in-memory state and a new journal repository instance.
	workerB := reconcile.NewWorker(reconcile.WorkerConfig{
		Store:   orders.NewProjectionStore(),
		Journal: orders.NewPostgresMutationJournal(pool),
		Venue:   venue,
		Metrics: newStubMetrics(),
	})
	workerB.RunOnce(context.Background())

	if calls := venue.postCalls.Load(); calls != 1 {
		t.Fatalf("fake CLOB POST count = %d, want 1", calls)
	}
	if calls := venue.lookupCalls.Load(); calls < 1 {
		t.Fatalf("fake CLOB lookup count = %d, want >= 1", calls)
	}
	var intents, attempts int
	var orderStatus, attemptStatus, venueID string
	var attemptEvidence []byte
	if err := pool.QueryRow(context.Background(), `
SELECT count(*), max(status), max(COALESCE(upstream_id, ''))
FROM markets_user_orders
WHERE user_id = $1 AND idempotency_key = 'restart-response-lost-key'
`, userID).Scan(&intents, &orderStatus, &venueID); err != nil {
		t.Fatal(err)
	}
	if err := pool.QueryRow(context.Background(), `
SELECT count(*), max(attempt_status), max(response_json::text)::bytea
FROM markets_order_attempts
WHERE user_id = $1 AND idempotency_key = 'restart-response-lost-key'
`, userID).Scan(&attempts, &attemptStatus, &attemptEvidence); err != nil {
		t.Fatal(err)
	}
	if intents != 1 || attempts != 1 || orderStatus != orders.OrderStatusOpen || attemptStatus != orders.MutationStateAccepted || venueID != "venue-response-lost-restart" {
		t.Fatalf("durable result = intents:%d attempts:%d order:%s attempt:%s venue:%s", intents, attempts, orderStatus, attemptStatus, venueID)
	}
	if !bytes.Contains(attemptEvidence, []byte(`"source": "polymarket_clob_open_orders"`)) ||
		!bytes.Contains(attemptEvidence, []byte(`"retryable": false`)) {
		t.Fatalf("reconciliation evidence missing classification: %s", attemptEvidence)
	}
}
