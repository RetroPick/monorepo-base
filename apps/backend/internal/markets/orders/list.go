package orders

import (
	"context"
	"fmt"
	"strings"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/wallet"
)

// ListMyOrders returns order projections for the authenticated user.
func (s *Service) ListMyOrders(ctx context.Context, session wallet.SessionContext, filter ListOrdersFilter) (OrdersListResponse, error) {
	if err := s.validateSession(session); err != nil {
		return OrdersListResponse{}, err
	}
	walletsResp, err := s.discoverer.ListWallets(ctx, session)
	if err != nil {
		return OrdersListResponse{}, err
	}
	if !hasLinkedWallet(walletsResp.Wallets) {
		return OrdersListResponse{}, ErrAccountNotLinked
	}

	limit := filter.Limit
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	records := s.projections.ListOrders(session.UserID, filter)
	orders := make([]UserOrder, 0, len(records))
	for i, rec := range records {
		if i >= limit {
			break
		}
		orders = append(orders, recordToUserOrder(rec))
	}

	now := s.now().UTC()
	return OrdersListResponse{
		SchemaVersion: SchemaVersion,
		Orders:        orders,
		Page:          markets.PageInfo{Limit: limit},
		CheckedAt:     now,
		Provenance: markets.UpstreamProvenance{
			Source:     "polymarket_clob",
			ObservedAt: now,
		},
		Freshness: &markets.MarketFreshness{
			State:      "fresh",
			ObservedAt: now,
			AgeMillis:  0,
		},
	}, nil
}

// ListMyFills returns fill projections for the authenticated user.
func (s *Service) ListMyFills(ctx context.Context, session wallet.SessionContext, filter ListFillsFilter) (FillsListResponse, error) {
	if err := s.validateSession(session); err != nil {
		return FillsListResponse{}, err
	}
	walletsResp, err := s.discoverer.ListWallets(ctx, session)
	if err != nil {
		return FillsListResponse{}, err
	}
	if !hasLinkedWallet(walletsResp.Wallets) {
		return FillsListResponse{}, ErrAccountNotLinked
	}

	limit := filter.Limit
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	records := s.projections.ListFills(session.UserID, filter)
	fills := make([]UserFill, 0, len(records))
	for i, rec := range records {
		if i >= limit {
			break
		}
		fills = append(fills, recordToUserFill(rec))
	}

	return FillsListResponse{
		SchemaVersion: SchemaVersion,
		Fills:         fills,
		Page:          markets.PageInfo{Limit: limit},
		CheckedAt:     s.now().UTC(),
	}, nil
}

func recordToUserOrder(rec UserOrderRecord) UserOrder {
	return UserOrder{
		OrderID:        rec.OrderID,
		VenueOrderID:   rec.VenueOrderID,
		MarketID:       rec.MarketID,
		TokenID:        rec.TokenID,
		Side:           rec.Side,
		Price:          rec.Price,
		OriginalSize:   rec.OriginalSize,
		FilledSize:     rec.FilledSize,
		RemainingSize:  rec.RemainingSize,
		Status:         rec.Status,
		ExchangeDomain: rec.ExchangeDomain,
		CreatedAt:      rec.CreatedAt,
		UpdatedAt:      rec.UpdatedAt,
	}
}

func recordToUserFill(rec UserFillRecord) UserFill {
	return UserFill{
		FillID:       rec.FillID,
		OrderID:      rec.OrderID,
		VenueTradeID: rec.VenueTradeID,
		MarketID:     rec.MarketID,
		TokenID:      rec.TokenID,
		Side:         rec.Side,
		Price:        rec.Price,
		Size:         rec.Size,
		Fee: MoneyAmount{
			Amount:   fmt.Sprintf("%d", rec.FeeAmount),
			Currency: rec.FeeCurrency,
			Decimals: rec.FeeDecimals,
		},
		FilledAt:   rec.FilledAt,
		Provenance: rec.Provenance,
	}
}

func persistSubmittedOrder(s *Service, session wallet.SessionContext, orderID string, rec previewRecord, venueOrderID, status string) {
	now := s.now().UTC()
	side := rec.Side
	if side == "" {
		if rec.UnsignedPayload.Side == 1 {
			side = SideSell
		} else {
			side = SideBuy
		}
	}
	contentHash := rec.ContentHash
	if contentHash == "" {
		contentHash, _ = ComputeContentHash(rec.UnsignedPayload, rec.Metadata)
	}
	clientOrderID := strings.TrimSpace(rec.UnsignedPayload.Salt)
	s.projections.PutOrder(UserOrderRecord{
		OrderID:        orderID,
		UserID:         session.UserID,
		VenueOrderID:   venueOrderID,
		ClientOrderID:  clientOrderID,
		ContentHash:    contentHash,
		MarketID:       rec.Metadata.MarketID,
		TokenID:        rec.Metadata.TokenID,
		Side:           side,
		Price:          rec.Price,
		OriginalSize:   rec.Size,
		FilledSize:     "0",
		RemainingSize:  rec.Size,
		MakerAmount:    rec.UnsignedPayload.MakerAmount,
		TakerAmount:    rec.UnsignedPayload.TakerAmount,
		Salt:           rec.UnsignedPayload.Salt,
		Status:         status,
		ExchangeDomain: rec.ExchangeDomain,
		Maker:          rec.UnsignedPayload.Maker,
		CreatedAt:      now,
		UpdatedAt:      now,
	})
}

func persistUnknownOrder(s *Service, session wallet.SessionContext, orderID string, rec previewRecord) {
	persistSubmittedOrder(s, session, orderID, rec, "", orderStatusUnknown)
}
