package orders

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"

	"retropick/apps/backend/internal/markets/wallet"
)

// PreviewCancel assembles a cancel preview for an open order.
func (s *Service) PreviewCancel(ctx context.Context, session wallet.SessionContext, orderID string) (CancelPreviewResponse, error) {
	if err := s.validateSession(session); err != nil {
		return CancelPreviewResponse{}, err
	}
	orderID = strings.TrimSpace(orderID)
	if orderID == "" {
		return CancelPreviewResponse{}, ErrInvalidRequest
	}

	order, ok := s.projections.GetOrder(orderID)
	if !ok {
		return CancelPreviewResponse{}, ErrOrderNotFound
	}
	if order.UserID != session.UserID {
		return CancelPreviewResponse{}, ErrOrderNotOwned
	}
	if !isCancelableStatus(order.Status) {
		return CancelPreviewResponse{}, ErrOrderNotCancelable
	}
	if strings.TrimSpace(order.VenueOrderID) == "" {
		return CancelPreviewResponse{}, ErrOrderNotCancelable
	}

	marketDetail, outcomeName, err := s.loadMarketOutcome(ctx, order.MarketID, order.TokenID)
	if err != nil {
		return CancelPreviewResponse{}, err
	}

	salt, err := s.saltFn()
	if err != nil {
		return CancelPreviewResponse{}, err
	}
	ts := s.now().UTC()
	payload := UnsignedCancelPayload{
		OrderID:   order.VenueOrderID,
		Maker:     strings.ToLower(order.Maker),
		TokenID:   order.TokenID,
		Salt:      salt,
		Timestamp: fmt.Sprintf("%d", ts.UnixMilli()),
	}
	meta := hashMetadata{
		ChainID:  polygonChainID,
		MarketID: order.MarketID,
		TokenID:  order.TokenID,
	}
	contentHash, err := ComputeCancelContentHash(payload, meta)
	if err != nil {
		return CancelPreviewResponse{}, err
	}

	previewID := uuid.NewString()
	expiresAt := ts.Add(previewTTL)
	s.cancelStore.Put(cancelPreviewRecord{
		PreviewID:       previewID,
		UserID:          session.UserID,
		TargetOrderID:   orderID,
		ContentHash:     contentHash,
		ExpiresAt:       expiresAt,
		UnsignedPayload: payload,
		Metadata:        meta,
	})

	sizeLabel := order.RemainingSize + " USDC"
	if strings.EqualFold(order.Side, SideSell) {
		sizeLabel = order.RemainingSize + " shares"
	}

	return CancelPreviewResponse{
		SchemaVersion: SchemaVersion,
		PreviewID:     previewID,
		ContentHash:   contentHash,
		ExpiresAt:     expiresAt,
		HumanSummary: CancelHumanSummary{
			Action:  "CANCEL",
			Market:  marketDetail.Question,
			Outcome: outcomeName,
			Size:    sizeLabel,
			Price:   order.Price,
			ChainID: polygonChainID,
		},
		UnsignedPayload: payload,
		OrderID:         orderID,
	}, nil
}
