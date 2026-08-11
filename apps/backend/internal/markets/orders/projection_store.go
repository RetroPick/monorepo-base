package orders

import (
	"sync"
	"time"

	"retropick/apps/backend/internal/markets"
)

const (
	orderStatusCancelPending = OrderStatusCancelPending
	orderStatusCanceled      = OrderStatusCanceled
)

// UserOrderRecord is the internal projection for a user order.
type UserOrderRecord struct {
	OrderID            string
	AttemptID          string
	UserID             string
	VenueOrderID       string
	ClientOrderID      string
	ContentHash        string
	RequestFingerprint string
	MarketID           string
	TokenID            string
	Side               string
	Price              string
	OriginalSize       string
	FilledSize         string
	RemainingSize      string
	MakerAmount        string
	TakerAmount        string
	Salt               string
	Status             string
	RejectionReason    string
	ExchangeDomain     string
	Maker              string
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

// ReconcilePatch applies venue truth to an unknown order projection.
type ReconcilePatch struct {
	VenueOrderID    string
	Status          string
	RejectionReason string
	FilledSize      string
	RemainingSize   string
}

// UserFillRecord is the internal projection for a fill.
type UserFillRecord struct {
	FillID       string
	OrderID      string
	UserID       string
	VenueTradeID string
	MarketID     string
	TokenID      string
	Side         string
	Price        string
	Size         string
	FeeAmount    int64
	FeeCurrency  string
	FeeDecimals  int
	FilledAt     time.Time
	Provenance   markets.UpstreamProvenance
}

// ProjectionStore retains in-memory order and fill projections (v1 until Postgres swap).
type ProjectionStore struct {
	mu     sync.Mutex
	orders map[string]UserOrderRecord
	fills  []UserFillRecord
	now    func() time.Time
}

func NewProjectionStore() *ProjectionStore {
	return &ProjectionStore{
		orders: make(map[string]UserOrderRecord),
		now:    time.Now,
	}
}

func (s *ProjectionStore) PutOrder(rec UserOrderRecord) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.orders[rec.OrderID] = rec
}

func (s *ProjectionStore) GetOrder(orderID string) (UserOrderRecord, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	rec, ok := s.orders[orderID]
	return rec, ok
}

func (s *ProjectionStore) UpdateOrder(orderID string, fn func(*UserOrderRecord)) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	rec, ok := s.orders[orderID]
	if !ok {
		return false
	}
	fn(&rec)
	s.orders[orderID] = rec
	return true
}

func (s *ProjectionStore) ListOrders(userID string, filter ListOrdersFilter) []UserOrderRecord {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]UserOrderRecord, 0)
	for _, rec := range s.orders {
		if rec.UserID != userID {
			continue
		}
		if filter.MarketID != "" && rec.MarketID != filter.MarketID {
			continue
		}
		if filter.TokenID != "" && rec.TokenID != filter.TokenID {
			continue
		}
		if filter.Status != "" && !statusMatchesFilter(rec.Status, filter.Status) {
			continue
		}
		out = append(out, rec)
	}
	return out
}

func (s *ProjectionStore) AddFill(rec UserFillRecord) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.fills = append(s.fills, rec)
}

func (s *ProjectionStore) ListFills(userID string, filter ListFillsFilter) []UserFillRecord {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]UserFillRecord, 0)
	for _, rec := range s.fills {
		if rec.UserID != userID {
			continue
		}
		if filter.OrderID != "" && rec.OrderID != filter.OrderID {
			continue
		}
		if filter.MarketID != "" && rec.MarketID != filter.MarketID {
			continue
		}
		if filter.TokenID != "" && rec.TokenID != filter.TokenID {
			continue
		}
		if filter.Since != nil && rec.FilledAt.Before(*filter.Since) {
			continue
		}
		out = append(out, rec)
	}
	return out
}

// ListUnknown returns orders in unknown status up to limit (0 = all).
func (s *ProjectionStore) ListUnknown(limit int) []UserOrderRecord {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]UserOrderRecord, 0)
	for _, rec := range s.orders {
		if rec.Status != orderStatusUnknown {
			continue
		}
		out = append(out, rec)
		if limit > 0 && len(out) >= limit {
			break
		}
	}
	return out
}

// ApplyReconcile updates an order from reconciliation worker results.
func (s *ProjectionStore) ApplyReconcile(orderID string, patch ReconcilePatch, now time.Time) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	rec, ok := s.orders[orderID]
	if !ok {
		return false
	}
	if patch.VenueOrderID != "" {
		rec.VenueOrderID = patch.VenueOrderID
	}
	if patch.Status != "" {
		rec.Status = patch.Status
	}
	if patch.RejectionReason != "" {
		rec.RejectionReason = patch.RejectionReason
	}
	if patch.FilledSize != "" {
		rec.FilledSize = patch.FilledSize
	}
	if patch.RemainingSize != "" {
		rec.RemainingSize = patch.RemainingSize
	}
	rec.UpdatedAt = now.UTC()
	s.orders[orderID] = rec
	return true
}

// ListOrdersNeedingReconcile returns orders in unknown or cancel_pending status across all users.
func (s *ProjectionStore) ListOrdersNeedingReconcile() []UserOrderRecord {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]UserOrderRecord, 0)
	for _, rec := range s.orders {
		switch rec.Status {
		case orderStatusUnknown, orderStatusCancelPending:
			out = append(out, rec)
		}
	}
	return out
}

// HasFillByVenueTradeID reports whether a fill with the venue trade id already exists for the user.
func (s *ProjectionStore) HasFillByVenueTradeID(userID, venueTradeID string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, rec := range s.fills {
		if rec.UserID == userID && rec.VenueTradeID == venueTradeID {
			return true
		}
	}
	return false
}

// FindOrderByVenueOrderID locates a projection by venue order id.
func (s *ProjectionStore) FindOrderByVenueOrderID(venueOrderID string) (UserOrderRecord, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, rec := range s.orders {
		if rec.VenueOrderID == venueOrderID {
			return rec, true
		}
	}
	return UserOrderRecord{}, false
}

func statusMatchesFilter(status, filter string) bool {
	if filter == "open" {
		switch status {
		case orderStatusOpen, "partially_filled", orderStatusCancelPending, orderStatusUnknown:
			return true
		default:
			return false
		}
	}
	return status == filter
}

// ListOrdersFilter scopes GET /me/orders.
type ListOrdersFilter struct {
	Status   string
	MarketID string
	TokenID  string
	Limit    int
}

// ListFillsFilter scopes GET /me/fills.
type ListFillsFilter struct {
	OrderID  string
	MarketID string
	TokenID  string
	Since    *time.Time
	Limit    int
}

func isCancelableStatus(status string) bool {
	switch status {
	case orderStatusOpen, "partially_filled", orderStatusUnknown:
		return true
	default:
		return false
	}
}
