package signals

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"retropick/apps/backend/internal/markets"
)

const (
	RuleVersion = "signals-v1"

	TypeNewMarket       = "new_market"
	TypePriceMove       = "price_move"
	TypeLiquidityChange = "liquidity_change"
	TypeRuleChanged     = "rule_changed"

	StateConfirmed = "confirmed"
	StateExpired   = "expired"
	StateRetracted = "retracted"
)

var ErrInvalidObservation = errors.New("invalid signal observation")

type EngineConfig struct {
	Now func() time.Time
	TTL time.Duration
}

type Engine struct {
	now func() time.Time
	ttl time.Duration
}

type Observation struct {
	Kind         string
	MarketID     string
	ObservedAt   time.Time
	Previous     markets.DecimalString
	Current      markets.DecimalString
	Threshold    markets.DecimalString
	PreviousHash string
	CurrentHash  string
	Evidence     []markets.SignalEvidence
}

func NewEngine(cfg EngineConfig) *Engine {
	now := time.Now
	if cfg.Now != nil {
		now = cfg.Now
	}
	ttl := cfg.TTL
	if ttl <= 0 {
		ttl = 24 * time.Hour
	}
	return &Engine{now: now, ttl: ttl}
}

func (e *Engine) Evaluate(observation Observation) (*markets.SignalEnvelope, error) {
	if strings.TrimSpace(observation.MarketID) == "" || observation.ObservedAt.IsZero() ||
		len(observation.Evidence) == 0 {
		return nil, ErrInvalidObservation
	}
	for _, evidence := range observation.Evidence {
		if evidence.Kind == "" || evidence.ReferenceID == "" || evidence.ObservedAt.IsZero() || evidence.ContentHash == "" {
			return nil, ErrInvalidObservation
		}
	}

	var reasonCodes []string
	switch observation.Kind {
	case TypeNewMarket:
		reasonCodes = []string{"market_first_observed"}
	case TypePriceMove:
		emit, direction, err := thresholdChange(observation)
		if err != nil {
			return nil, err
		}
		if !emit {
			return nil, nil
		}
		reasonCodes = []string{"price_" + direction}
	case TypeLiquidityChange:
		emit, direction, err := thresholdChange(observation)
		if err != nil {
			return nil, err
		}
		if !emit {
			return nil, nil
		}
		reasonCodes = []string{"liquidity_" + direction}
	case TypeRuleChanged:
		if observation.PreviousHash == "" || observation.CurrentHash == "" {
			return nil, ErrInvalidObservation
		}
		if observation.PreviousHash == observation.CurrentHash {
			return nil, nil
		}
		reasonCodes = []string{"resolution_rule_changed"}
	default:
		return nil, ErrInvalidObservation
	}

	idempotencyKey, err := observationKey(observation)
	if err != nil {
		return nil, err
	}
	createdAt := e.now().UTC()
	expiresAt := createdAt.Add(e.ttl)
	evidence := append([]markets.SignalEvidence(nil), observation.Evidence...)
	return &markets.SignalEnvelope{
		SchemaVersion:  markets.SchemaVersion,
		ID:             "signal:" + idempotencyKey,
		Type:           observation.Kind,
		MarketID:       observation.MarketID,
		State:          StateConfirmed,
		RuleVersion:    RuleVersion,
		ReasonCodes:    reasonCodes,
		CreatedAt:      createdAt,
		ExpiresAt:      &expiresAt,
		IdempotencyKey: idempotencyKey,
		Evidence:       evidence,
	}, nil
}

func Retract(signal markets.SignalEnvelope, reasonCode, evidenceReference string, retractedAt time.Time) (markets.SignalEnvelope, error) {
	if signal.ID == "" || reasonCode == "" || evidenceReference == "" || retractedAt.IsZero() {
		return markets.SignalEnvelope{}, ErrInvalidObservation
	}
	retractedAt = retractedAt.UTC()
	signal.State = StateRetracted
	signal.RetractedAt = &retractedAt
	signal.ReasonCodes = append(append([]string(nil), signal.ReasonCodes...), reasonCode)
	sum := sha256.Sum256([]byte(reasonCode + "\x00" + evidenceReference))
	signal.Evidence = append(append([]markets.SignalEvidence(nil), signal.Evidence...), markets.SignalEvidence{
		Kind:        "retraction",
		ReferenceID: evidenceReference,
		ObservedAt:  retractedAt,
		ContentHash: hex.EncodeToString(sum[:]),
	})
	return signal, nil
}

func Expire(signal markets.SignalEnvelope, at time.Time) markets.SignalEnvelope {
	if signal.ExpiresAt != nil && !at.Before(*signal.ExpiresAt) && signal.State != StateRetracted {
		signal.State = StateExpired
	}
	return signal
}

func thresholdChange(observation Observation) (bool, string, error) {
	previous, ok := new(big.Rat).SetString(string(observation.Previous))
	if !ok {
		return false, "", ErrInvalidObservation
	}
	current, ok := new(big.Rat).SetString(string(observation.Current))
	if !ok {
		return false, "", ErrInvalidObservation
	}
	threshold, ok := new(big.Rat).SetString(string(observation.Threshold))
	if !ok || threshold.Sign() <= 0 || previous.Sign() < 0 || current.Sign() < 0 {
		return false, "", ErrInvalidObservation
	}
	change := new(big.Rat).Sub(current, previous)
	direction := "increased"
	if change.Sign() < 0 {
		direction = "decreased"
		change.Neg(change)
	}
	return change.Cmp(threshold) >= 0, direction, nil
}

func observationKey(observation Observation) (string, error) {
	canonical := struct {
		RuleVersion  string
		Kind         string
		MarketID     string
		ObservedAt   string
		Previous     markets.DecimalString
		Current      markets.DecimalString
		Threshold    markets.DecimalString
		PreviousHash string
		CurrentHash  string
		Evidence     []markets.SignalEvidence
	}{
		RuleVersion:  RuleVersion,
		Kind:         observation.Kind,
		MarketID:     observation.MarketID,
		ObservedAt:   observation.ObservedAt.UTC().Format(time.RFC3339Nano),
		Previous:     observation.Previous,
		Current:      observation.Current,
		Threshold:    observation.Threshold,
		PreviousHash: observation.PreviousHash,
		CurrentHash:  observation.CurrentHash,
		Evidence:     observation.Evidence,
	}
	body, err := json.Marshal(canonical)
	if err != nil {
		return "", fmt.Errorf("signal observation key: %w", err)
	}
	sum := sha256.Sum256(body)
	return hex.EncodeToString(sum[:]), nil
}
