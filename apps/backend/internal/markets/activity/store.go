package activity

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrInvalidEvent = errors.New("invalid activity event")
var decimal = regexp.MustCompile(`^-?[0-9]+(?:\.[0-9]+)?$`)

const (
	KindFill  = "fill"
	KindOrder = "order"
)

type Event struct {
	ID             string
	UserID         string
	AccountWallet  string
	Kind           string
	MarketID       string
	TokenID        string
	OrderID        string
	FillID         string
	ReferenceID    string
	Amount         string
	UpstreamSource string
	UpstreamID     string
	ObservedAt     time.Time
}

type PageRequest struct {
	Limit         int
	Cursor        string
	AccountWallet string
	Since         *time.Time
	Kind          string
}
type Page struct {
	Events     []Event
	NextCursor string
}

// PostgresStore is an append-only activity projection store. Replayed upstream
// events are ignored by their immutable source identity.
type PostgresStore struct{ pool *pgxpool.Pool }

func NewPostgresStore(pool *pgxpool.Pool) *PostgresStore { return &PostgresStore{pool: pool} }

func (s *PostgresStore) Append(ctx context.Context, event Event) error {
	if s == nil || s.pool == nil || strings.TrimSpace(event.UserID) == "" || strings.TrimSpace(event.UpstreamSource) == "" || strings.TrimSpace(event.UpstreamID) == "" || !validKind(event.Kind) || (event.Amount != "" && !decimal.MatchString(event.Amount)) {
		return ErrInvalidEvent
	}
	if event.ObservedAt.IsZero() {
		event.ObservedAt = time.Now().UTC()
	} else {
		event.ObservedAt = event.ObservedAt.UTC()
	}
	id := uuid.New()
	if strings.TrimSpace(event.ID) != "" {
		parsed, err := uuid.Parse(event.ID)
		if err != nil {
			return ErrInvalidEvent
		}
		id = parsed
	}
	wallet := nullableString(strings.ToLower(strings.TrimSpace(event.AccountWallet)))
	amount := nullableString(event.Amount)
	marketID := nullableString(event.MarketID)
	tokenID := nullableString(event.TokenID)
	refID := nullableString(event.ReferenceID)
	var orderID, fillID *uuid.UUID
	if event.OrderID != "" {
		parsed, err := uuid.Parse(event.OrderID)
		if err != nil {
			return ErrInvalidEvent
		}
		orderID = &parsed
	}
	if event.FillID != "" {
		parsed, err := uuid.Parse(event.FillID)
		if err != nil {
			return ErrInvalidEvent
		}
		fillID = &parsed
	}
	_, err := s.pool.Exec(ctx, `
INSERT INTO markets_activity_events (
    id, user_id, account_wallet, event_kind, market_id, token_id, order_id, fill_id,
    reference_id, amount, upstream_source, upstream_id, observed_at, created_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
ON CONFLICT (upstream_source, upstream_id) DO NOTHING
`, id, event.UserID, wallet, event.Kind, marketID, tokenID, orderID, fillID, refID, amount, event.UpstreamSource, event.UpstreamID, event.ObservedAt)
	if err != nil {
		return fmt.Errorf("append activity event: %w", err)
	}
	return nil
}

func (s *PostgresStore) List(ctx context.Context, userID string, req PageRequest) (Page, error) {
	if s == nil || s.pool == nil || strings.TrimSpace(userID) == "" {
		return Page{}, ErrInvalidEvent
	}
	limit := req.Limit
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	cursorAt, cursorID, err := parseCursor(req.Cursor)
	if err != nil {
		return Page{}, ErrInvalidEvent
	}
	rows, err := s.pool.Query(ctx, `
SELECT id::text, user_id, COALESCE(account_wallet, ''), event_kind, COALESCE(market_id, ''),
       COALESCE(token_id, ''), COALESCE(order_id::text, ''), COALESCE(fill_id::text, ''),
       COALESCE(reference_id, ''), COALESCE(amount, ''), upstream_source, upstream_id, observed_at
FROM markets_activity_events
WHERE user_id = $1
  AND ($2 = '' OR account_wallet = $2)
  AND ($3::timestamptz IS NULL OR observed_at >= $3)
  AND ($4 = '' OR event_kind = $4)
  AND ($5::timestamptz IS NULL OR (observed_at, id) < ($5, $6::uuid))
ORDER BY observed_at DESC, id DESC
LIMIT $7
`, userID, strings.ToLower(strings.TrimSpace(req.AccountWallet)), req.Since, strings.TrimSpace(req.Kind), cursorAt, cursorID, limit+1)
	if err != nil {
		return Page{}, fmt.Errorf("list activity events: %w", err)
	}
	defer rows.Close()
	page := Page{Events: make([]Event, 0, limit)}
	for rows.Next() {
		var event Event
		if err := rows.Scan(&event.ID, &event.UserID, &event.AccountWallet, &event.Kind, &event.MarketID, &event.TokenID, &event.OrderID, &event.FillID, &event.ReferenceID, &event.Amount, &event.UpstreamSource, &event.UpstreamID, &event.ObservedAt); err != nil {
			return Page{}, fmt.Errorf("scan activity event: %w", err)
		}
		if len(page.Events) == limit {
			last := page.Events[len(page.Events)-1]
			page.NextCursor = makeCursor(last.ObservedAt, last.ID)
			break
		}
		page.Events = append(page.Events, event)
	}
	if err := rows.Err(); err != nil {
		return Page{}, fmt.Errorf("iterate activity events: %w", err)
	}
	return page, nil
}

func validKind(kind string) bool { return kind == KindFill || kind == KindOrder }
func nullableString(value string) any {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return value
}
func makeCursor(at time.Time, id string) string { return at.UTC().Format(time.RFC3339Nano) + "," + id }
func parseCursor(cursor string) (*time.Time, *uuid.UUID, error) {
	if cursor == "" {
		return nil, nil, nil
	}
	parts := strings.Split(cursor, ",")
	if len(parts) != 2 {
		return nil, nil, ErrInvalidEvent
	}
	at, err := time.Parse(time.RFC3339Nano, parts[0])
	if err != nil {
		return nil, nil, err
	}
	id, err := uuid.Parse(parts[1])
	if err != nil {
		return nil, nil, err
	}
	return &at, &id, nil
}

// Healthy verifies the database dependency behind the durable activity log.
func (s *PostgresStore) Healthy(ctx context.Context) bool {
	return s != nil && s.pool != nil && s.pool.Ping(ctx) == nil
}

var _ = pgx.ErrNoRows
