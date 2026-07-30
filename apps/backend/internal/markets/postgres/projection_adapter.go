package postgres

import (
	"context"
	"errors"

	"retropick/apps/backend/internal/markets"
)

// ProjectionAdapter exposes CatalogReader as markets.CatalogProjection.
type ProjectionAdapter struct {
	reader *CatalogReader
}

func NewProjectionAdapter(reader *CatalogReader) *ProjectionAdapter {
	return &ProjectionAdapter{reader: reader}
}

func (a *ProjectionAdapter) ListEvents(ctx context.Context, statusFilter string, limit, offset int) ([]markets.EventSummary, error) {
	return a.reader.ListEvents(ctx, statusFilter, limit, offset)
}

func (a *ProjectionAdapter) GetEvent(ctx context.Context, eventID string) (markets.EventDetail, error) {
	event, err := a.reader.GetEvent(ctx, eventID)
	if err != nil {
		return markets.EventDetail{}, mapCatalogError(err)
	}
	return event, nil
}

func (a *ProjectionAdapter) GetMarket(ctx context.Context, marketID string) (markets.MarketDetail, error) {
	market, err := a.reader.GetMarket(ctx, marketID)
	if err != nil {
		return markets.MarketDetail{}, mapCatalogError(err)
	}
	return market, nil
}

func (a *ProjectionAdapter) ProjectionStatus(ctx context.Context) (markets.CatalogProjectionStatus, error) {
	status, err := a.reader.ProjectionStatus(ctx)
	if err != nil {
		return markets.CatalogProjectionStatus{}, err
	}
	return markets.CatalogProjectionStatus{
		EventCount:     status.EventCount,
		LatestObserved: status.LatestObserved,
		HasProjection:  status.HasProjection,
	}, nil
}

func mapCatalogError(err error) error {
	if errors.Is(err, ErrCatalogNotFound) {
		return markets.ErrNotFound
	}
	return err
}
