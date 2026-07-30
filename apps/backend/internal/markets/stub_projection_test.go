package markets

import (
	"context"
	"time"
)

type stubProjection struct {
	events  []EventSummary
	event   EventDetail
	market  MarketDetail
	observed time.Time
}

func (s stubProjection) ListEvents(_ context.Context, _ string, limit, offset int) ([]EventSummary, error) {
	if offset >= len(s.events) {
		return []EventSummary{}, nil
	}
	end := offset + limit
	if end > len(s.events) {
		end = len(s.events)
	}
	return s.events[offset:end], nil
}

func (s stubProjection) GetEvent(_ context.Context, eventID string) (EventDetail, error) {
	if s.event.ID != "" && s.event.ID == eventID {
		return s.event, nil
	}
	return EventDetail{}, ErrNotFound
}

func (s stubProjection) GetMarket(_ context.Context, marketID string) (MarketDetail, error) {
	if s.market.ID != "" && s.market.ID == marketID {
		return s.market, nil
	}
	return MarketDetail{}, ErrNotFound
}

func (s stubProjection) ProjectionStatus(context.Context) (CatalogProjectionStatus, error) {
	observed := s.observed
	if observed.IsZero() {
		observed = time.Now().UTC()
	}
	return CatalogProjectionStatus{
		EventCount:     int64(len(s.events)),
		LatestObserved: observed,
		HasProjection:  len(s.events) > 0 || s.event.ID != "" || s.market.ID != "",
	}, nil
}

func projectionTestWorker() CatalogWorkerState {
	return CatalogWorkerSnapshotFrom(true, false, true)
}
