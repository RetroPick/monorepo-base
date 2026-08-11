package positions

import (
	"context"
	"strings"
	"time"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/wallet"
)

// ReaderConfig wires position read dependencies.
type ReaderConfig struct {
	Discoverer *wallet.Discoverer
	Store      *ProjectionStore
	Venue      VenuePositionReader
	Fills      FillSource
	Now        func() time.Time
}

// Reader orchestrates session → wallet discovery → projection read.
type Reader struct {
	discoverer *wallet.Discoverer
	store      *ProjectionStore
	venue      VenuePositionReader
	fills      FillSource
	now        func() time.Time
}

// NewReader builds a position reader with safe defaults.
func NewReader(cfg ReaderConfig) *Reader {
	disc := cfg.Discoverer
	if disc == nil {
		disc = wallet.DefaultDiscoverer()
	}
	store := cfg.Store
	if store == nil {
		store = NewProjectionStore()
	}
	venue := cfg.Venue
	if venue == nil {
		venue = UnwiredVenueSource{}
	}
	now := cfg.Now
	if now == nil {
		now = time.Now
	}
	return &Reader{
		discoverer: disc,
		store:      store,
		venue:      venue,
		fills:      cfg.Fills,
		now:        now,
	}
}

// ListPositions returns position projections for the authenticated user.
func (r *Reader) ListPositions(ctx context.Context, session SessionContext) (PositionsListResponse, error) {
	if strings.TrimSpace(session.UserID) == "" || strings.TrimSpace(session.SignerAddress) == "" {
		return PositionsListResponse{}, ErrUnauthorized
	}

	walletsResp, err := r.discoverer.ListWallets(ctx, session)
	if err != nil {
		return PositionsListResponse{}, err
	}

	primary, ok := primaryLinkedWallet(walletsResp.Wallets)
	if !ok {
		return PositionsListResponse{}, ErrAccountNotLinked
	}

	r.store.RegisterUserAccount(session.UserID, primary.AccountWallet)

	records := r.store.List(session.UserID)
	if len(records) == 0 && r.fills != nil {
		r.seedFromFills(session.UserID, primary.AccountWallet)
		records = r.store.List(session.UserID)
	}

	checkedAt := r.now().UTC()
	provenance := markets.UpstreamProvenance{
		Source:     "polymarket_bff_projection",
		ObservedAt: checkedAt,
	}
	freshness := &markets.MarketFreshness{
		State:      markets.FreshnessFresh,
		ObservedAt: checkedAt,
		AgeMillis:  0,
	}

	venueRows, observedAt, venueErr := r.venue.ListPositions(ctx, VenuePositionRequest{
		AccountWallet: primary.AccountWallet,
	})
	if venueErr != nil {
		freshness.State = markets.FreshnessStale
		freshness.Reason = "venue_unavailable"
	} else {
		provenance = markets.UpstreamProvenance{
			Source:     upstreamSourceDataAPI,
			ObservedAt: observedAt.UTC(),
		}
		drift := ComparePositions(records, venueRows)
		if drift.Count > 0 {
			written := r.store.ApplyVenueRebuild(session.UserID, primary.AccountWallet, venueRows, observedAt)
			if written > 0 {
				records = r.store.List(session.UserID)
			} else {
				r.store.MarkReconciling(session.UserID)
				records = r.store.List(session.UserID)
			}
		} else if len(records) == 0 && len(venueRows) > 0 {
			r.store.ApplyVenueRebuild(session.UserID, primary.AccountWallet, venueRows, observedAt)
			records = r.store.List(session.UserID)
		}
	}

	wireRows, listSync := recordsToWire(records)
	if listSync != SyncStatusSynced {
		freshness.State = markets.FreshnessResyncing
		freshness.Reason = "position_sync_pending"
	}

	return PositionsListResponse{
		SchemaVersion: SchemaVersion,
		SignerAddress: walletsResp.SignerAddress,
		AccountWallet: primary.AccountWallet,
		Positions:     wireRows,
		CheckedAt:     checkedAt,
		SyncStatus:    listSync,
		Provenance:    provenance,
		Freshness:     freshness,
	}, nil
}

func (r *Reader) seedFromFills(userID, accountWallet string) {
	if r.fills == nil {
		return
	}
	now := r.now().UTC()
	for _, fill := range r.fills.ListFillSnapshots(userID) {
		if strings.TrimSpace(fill.TokenID) == "" || strings.TrimSpace(fill.Size) == "" {
			continue
		}
		r.store.Upsert(PositionRecord{
			UserID:         userID,
			AccountWallet:  accountWallet,
			TokenID:        fill.TokenID,
			MarketID:       fill.MarketID,
			Size:           fill.Size,
			SyncStatus:     SyncStatusUpdating,
			UpstreamSource: "polymarket_clob_fills",
			ObservedAt:     now,
			UpdatedAt:      now,
		})
	}
}

func recordsToWire(records []PositionRecord) ([]UserPosition, SyncStatus) {
	out := make([]UserPosition, 0, len(records))
	listSync := SyncStatusSynced
	for _, rec := range records {
		if rec.TokenID == "" {
			continue
		}
		switch rec.SyncStatus {
		case SyncStatusUpdating:
			listSync = SyncStatusUpdating
		case SyncStatusReconciling:
			if listSync != SyncStatusUpdating {
				listSync = SyncStatusReconciling
			}
		}
		row := UserPosition{
			PositionID:   rec.PositionID,
			MarketID:     rec.MarketID,
			TokenID:      rec.TokenID,
			OutcomeLabel: rec.OutcomeLabel,
			Size:         markets.DecimalString(rec.Size),
			SyncStatus:   rec.SyncStatus,
			Provenance: markets.UpstreamProvenance{
				Source:     rec.UpstreamSource,
				UpstreamID: rec.UpstreamID,
				ObservedAt: rec.ObservedAt.UTC(),
			},
		}
		if rec.AvgPrice != "" {
			price := markets.DecimalString(rec.AvgPrice)
			row.AvgPrice = &price
		}
		if row.SyncStatus == "" {
			row.SyncStatus = SyncStatusSynced
		}
		out = append(out, row)
	}
	return out, listSync
}

func primaryLinkedWallet(wallets []wallet.LinkedWallet) (wallet.LinkedWallet, bool) {
	for _, w := range wallets {
		if w.IsPrimary && w.LinkStatus == wallet.LinkStatusLinked {
			return w, true
		}
	}
	for _, w := range wallets {
		if w.LinkStatus == wallet.LinkStatusLinked {
			return w, true
		}
	}
	return wallet.LinkedWallet{}, false
}
