package funding

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/realtime"
)

type Service struct {
	pool      *pgxpool.Pool
	provider  QuoteProvider
	allowlist Allowlist
	logger    *slog.Logger
}

type Allowlist struct {
	Providers map[string]struct{}
	Chains    map[int64]struct{}
	Tokens    map[string]struct{}
}

type IntentRecord struct {
	ID                  uuid.UUID
	UserAddress         string
	Status              string
	TargetAmountDecimal string
	TargetUSDCAmount    string
	SettlementChainID   int64
	SettlementToken     string
	RecommendedRouteID  *uuid.UUID
	SelectedRouteID     *uuid.UUID
	ExpiresAt           time.Time
}

func NewService(pool *pgxpool.Pool, provider QuoteProvider, allowlist Allowlist, logger *slog.Logger) *Service {
	if logger == nil {
		logger = slog.Default()
	}
	return &Service{
		pool:      pool,
		provider:  provider,
		allowlist: normalizeAllowlist(allowlist),
		logger:    logger,
	}
}

func normalizeAllowlist(in Allowlist) Allowlist {
	out := Allowlist{
		Providers: map[string]struct{}{},
		Chains:    map[int64]struct{}{},
		Tokens:    map[string]struct{}{},
	}
	for k := range in.Providers {
		out.Providers[strings.ToUpper(strings.TrimSpace(k))] = struct{}{}
	}
	for k := range in.Chains {
		out.Chains[k] = struct{}{}
	}
	for k := range in.Tokens {
		out.Tokens[strings.ToLower(strings.TrimSpace(k))] = struct{}{}
	}
	return out
}

func (s *Service) IntentByID(ctx context.Context, id uuid.UUID) (IntentRecord, error) {
	var out IntentRecord
	var recommended, selected *uuid.UUID
	err := s.pool.QueryRow(ctx, `
SELECT id, user_address, status, target_amount_decimal, target_usdc_amount::text,
       settlement_chain_id, settlement_token_address, recommended_route_id, selected_route_id, expires_at
FROM funding_intents
WHERE id = $1
`, id).Scan(
		&out.ID,
		&out.UserAddress,
		&out.Status,
		&out.TargetAmountDecimal,
		&out.TargetUSDCAmount,
		&out.SettlementChainID,
		&out.SettlementToken,
		&recommended,
		&selected,
		&out.ExpiresAt,
	)
	if err != nil {
		return IntentRecord{}, err
	}
	out.RecommendedRouteID = recommended
	out.SelectedRouteID = selected
	return out, nil
}

func (s *Service) EnsureRouteOptions(ctx context.Context, intentID uuid.UUID) error {
	intent, err := s.IntentByID(ctx, intentID)
	if err != nil {
		return err
	}
	if time.Now().UTC().After(intent.ExpiresAt) {
		return fmt.Errorf("intent expired")
	}
	opts, err := s.provider.QuoteRoutes(ctx, QuoteRequest{
		IntentID:               intent.ID,
		Wallet:                 intent.UserAddress,
		TargetUSDCAmount:       intent.TargetUSDCAmount,
		SettlementChainID:      intent.SettlementChainID,
		SettlementTokenAddress: intent.SettlementToken,
	})
	if err != nil {
		return err
	}
	valid := make([]ScoredRoute, 0, len(opts))
	for _, r := range opts {
		if !s.routeAllowed(r) {
			continue
		}
		if !meetsTarget(r, intent.TargetUSDCAmount) {
			continue
		}
		valid = append(valid, ScoreRoute(r))
	}
	if len(valid) == 0 {
		return fmt.Errorf("no viable routes")
	}
	SortRoutes(valid)

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, `DELETE FROM funding_route_options WHERE funding_intent_id = $1`, intent.ID)
	if err != nil {
		return err
	}
	var recommendedID uuid.UUID
	for i, route := range valid {
		snap, _ := json.Marshal(route.Original.ProviderPayload)
		var id uuid.UUID
		err = tx.QueryRow(ctx, `
INSERT INTO funding_route_options (
    funding_intent_id, provider, provider_route_id, source_chain_id, source_token_address, source_token_symbol,
    source_token_decimals, source_amount, estimated_usdc_received, min_usdc_received, estimated_duration_seconds,
    route_score, route_snapshot, status
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::numeric,$9::numeric,$10::numeric,$11,$12::numeric,$13::jsonb,'AVAILABLE')
RETURNING id
`, intent.ID, route.Original.Provider, route.Original.ProviderRouteID, route.Original.SourceChainID, route.Original.SourceTokenAddress,
			route.Original.SourceTokenSymbol, route.Original.SourceTokenDecimals, route.Original.SourceAmount,
			route.Original.EstimatedUSDCReceived, route.Original.MinUSDCReceived, route.Original.EstimatedDurationSeconds,
			route.Score, string(snap)).Scan(&id)
		if err != nil {
			return err
		}
		if i == 0 {
			recommendedID = id
		}
	}
	_, err = tx.Exec(ctx, `
UPDATE funding_intents
SET status = 'OPTIONS_READY', recommended_route_id = $2, updated_at = NOW()
WHERE id = $1
`, intent.ID, recommendedID)
	if err != nil {
		return err
	}
	seq, inserted, err := realtime.Insert(ctx, tx, realtime.InsertEvent{
		Channel:     "deposit:" + intent.ID.String(),
		Type:        "deposit_options_ready",
		Scope:       "private",
		UserAddress: intent.UserAddress,
		Payload: map[string]any{
			"intentId":           intent.ID.String(),
			"recommendedRouteId": recommendedID.String(),
			"routeCount":         len(valid),
		},
		DedupeKey: "deposit_options_ready:" + intent.ID.String(),
	})
	if err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return err
	}
	if inserted {
		_ = realtime.Notify(ctx, s.pool, seq)
	}
	return nil
}

func (s *Service) routeAllowed(route RouteOption) bool {
	if len(s.allowlist.Providers) > 0 {
		if _, ok := s.allowlist.Providers[strings.ToUpper(route.Provider)]; !ok {
			return false
		}
	}
	if len(s.allowlist.Chains) > 0 {
		if _, ok := s.allowlist.Chains[route.SourceChainID]; !ok {
			return false
		}
	}
	if len(s.allowlist.Tokens) > 0 {
		if _, ok := s.allowlist.Tokens[strings.ToLower(route.SourceTokenAddress)]; !ok {
			return false
		}
	}
	if !strings.EqualFold(route.DestinationTokenAddress, route.ExpectedDestinationTokenAddress) {
		return false
	}
	return true
}

func meetsTarget(route RouteOption, targetUSDC string) bool {
	routeMin, okA := decimalToInt(route.MinUSDCReceived)
	target, okB := decimalToInt(targetUSDC)
	if !okA || !okB {
		return false
	}
	return routeMin >= target
}
