package signals

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"
)

const EnvelopeSchemaVersion = 1

const (
	SignalTypeWhaleTrade      = "whale_trade"
	SignalTypeSmartMoneyScore = "smart_money_score"
	SignalTypeBacktestResult  = "backtest_result"
)

type LifecycleState string

const (
	LifecycleDraft      LifecycleState = "draft"
	LifecycleActive     LifecycleState = "active"
	LifecycleStale      LifecycleState = "stale"
	LifecycleRetracted  LifecycleState = "retracted"
	LifecycleSuperseded LifecycleState = "superseded"
)

func (s LifecycleState) Valid() bool {
	switch s {
	case LifecycleDraft, LifecycleActive, LifecycleStale, LifecycleRetracted, LifecycleSuperseded:
		return true
	default:
		return false
	}
}

// EvidenceEnvelope is the ADR-008 intelligence publish envelope aligned with
// INTELLIGENCE_DATA_MODEL slim schema. It is separate from markets.SignalEnvelope.
type EvidenceEnvelope struct {
	Version      int                `json:"version"`
	SignalType   string             `json:"signalType"`
	ComputedAt   time.Time          `json:"computedAt"`
	Inputs       map[string]string  `json:"inputs"`
	Metrics      map[string]int64   `json:"metrics"`
	ParamsRef    string             `json:"paramsRef"`
	ReasonCodes  []string           `json:"reasonCodes"`
	Hash         string             `json:"hash"`
	Lifecycle    LifecycleState     `json:"lifecycle"`
	ProvenanceID string             `json:"provenanceId,omitempty"`
	RetractedAt  *time.Time         `json:"retractedAt,omitempty"`
	SupersededBy *string            `json:"supersededBy,omitempty"`
}

// BuildOptions supplies required fields for a new draft envelope.
type BuildOptions struct {
	SignalType  string
	ComputedAt  time.Time
	Inputs      map[string]string
	Metrics     map[string]int64
	ParamsRef   string
	ReasonCodes []string
}

var ErrInvalidEnvelope = errors.New("invalid evidence envelope")

// ProvenanceID derives the ADR-008 provenanceId from a paramsRef anchor.
func ProvenanceID(paramsRef string) string {
	paramsRef = strings.TrimSpace(paramsRef)
	if idx := strings.LastIndex(paramsRef, "#"); idx >= 0 && idx < len(paramsRef)-1 {
		return paramsRef[idx+1:]
	}
	return paramsRef
}

// Validate checks required fields, lifecycle, provenanceId, and content hash.
func Validate(envelope EvidenceEnvelope) error {
	if envelope.Version != EnvelopeSchemaVersion {
		return fmt.Errorf("%w: version must be %d", ErrInvalidEnvelope, EnvelopeSchemaVersion)
	}
	if strings.TrimSpace(envelope.SignalType) == "" {
		return fmt.Errorf("%w: signalType required", ErrInvalidEnvelope)
	}
	if envelope.ComputedAt.IsZero() {
		return fmt.Errorf("%w: computedAt required", ErrInvalidEnvelope)
	}
	if len(envelope.Inputs) == 0 {
		return fmt.Errorf("%w: inputs required", ErrInvalidEnvelope)
	}
	if len(envelope.Metrics) == 0 {
		return fmt.Errorf("%w: metrics required", ErrInvalidEnvelope)
	}
	if strings.TrimSpace(envelope.ParamsRef) == "" {
		return fmt.Errorf("%w: paramsRef required", ErrInvalidEnvelope)
	}
	if len(envelope.ReasonCodes) == 0 {
		return fmt.Errorf("%w: reasonCodes required", ErrInvalidEnvelope)
	}
	if strings.TrimSpace(envelope.Hash) == "" {
		return fmt.Errorf("%w: hash required", ErrInvalidEnvelope)
	}
	if !strings.HasPrefix(envelope.Hash, "sha256:") {
		return fmt.Errorf("%w: hash must have sha256: prefix", ErrInvalidEnvelope)
	}
	if !envelope.Lifecycle.Valid() {
		return fmt.Errorf("%w: invalid lifecycle", ErrInvalidEnvelope)
	}
	expectedProvenance := ProvenanceID(envelope.ParamsRef)
	if envelope.ProvenanceID != "" && envelope.ProvenanceID != expectedProvenance {
		return fmt.Errorf("%w: provenanceId mismatch", ErrInvalidEnvelope)
	}
	switch envelope.Lifecycle {
	case LifecycleRetracted, LifecycleSuperseded:
		// Content hash is fixed at build; lifecycle metadata may append reason codes later.
	default:
		if !VerifyHash(envelope) {
			return fmt.Errorf("%w: hash mismatch", ErrInvalidEnvelope)
		}
	}
	return nil
}

// BuildEvidenceEnvelope constructs a draft envelope with a canonical content hash.
func BuildEvidenceEnvelope(opts BuildOptions) (EvidenceEnvelope, error) {
	if strings.TrimSpace(opts.SignalType) == "" || opts.ComputedAt.IsZero() ||
		len(opts.Inputs) == 0 || len(opts.Metrics) == 0 ||
		strings.TrimSpace(opts.ParamsRef) == "" || len(opts.ReasonCodes) == 0 {
		return EvidenceEnvelope{}, ErrInvalidEnvelope
	}
	envelope := EvidenceEnvelope{
		Version:      EnvelopeSchemaVersion,
		SignalType:   opts.SignalType,
		ComputedAt:   opts.ComputedAt.UTC(),
		Inputs:       copyStringMap(opts.Inputs),
		Metrics:      copyInt64Map(opts.Metrics),
		ParamsRef:    opts.ParamsRef,
		ReasonCodes:  append([]string(nil), opts.ReasonCodes...),
		Lifecycle:    LifecycleDraft,
		ProvenanceID: ProvenanceID(opts.ParamsRef),
	}
	hash, err := CanonicalHash(envelope)
	if err != nil {
		return EvidenceEnvelope{}, err
	}
	envelope.Hash = hash
	return envelope, nil
}

type canonicalEnvelope struct {
	Version     int               `json:"version"`
	SignalType  string            `json:"signalType"`
	ComputedAt  string            `json:"computedAt"`
	Inputs      map[string]string `json:"inputs"`
	Metrics     map[string]int64  `json:"metrics"`
	ParamsRef   string            `json:"paramsRef"`
	ReasonCodes []string          `json:"reasonCodes"`
}

// CanonicalHash returns a deterministic sha256: content hash for envelope fields
// excluding lifecycle metadata (Hash, Lifecycle, RetractedAt, SupersededBy).
func CanonicalHash(envelope EvidenceEnvelope) (string, error) {
	canonical := canonicalEnvelope{
		Version:     envelope.Version,
		SignalType:  envelope.SignalType,
		ComputedAt:  envelope.ComputedAt.UTC().Format(time.RFC3339Nano),
		Inputs:      sortedStringMap(envelope.Inputs),
		Metrics:     sortedInt64Map(envelope.Metrics),
		ParamsRef:   envelope.ParamsRef,
		ReasonCodes: sortedStrings(append([]string(nil), envelope.ReasonCodes...)),
	}
	body, err := json.Marshal(canonical)
	if err != nil {
		return "", fmt.Errorf("canonical hash: %w", err)
	}
	sum := sha256.Sum256(body)
	return "sha256:" + hex.EncodeToString(sum[:]), nil
}

// VerifyHash reports whether envelope.Hash matches the canonical content hash.
func VerifyHash(envelope EvidenceEnvelope) bool {
	expected, err := CanonicalHash(envelope)
	if err != nil {
		return false
	}
	return envelope.Hash == expected
}

func copyStringMap(in map[string]string) map[string]string {
	out := make(map[string]string, len(in))
	for key, value := range in {
		out[key] = value
	}
	return out
}

func copyInt64Map(in map[string]int64) map[string]int64 {
	out := make(map[string]int64, len(in))
	for key, value := range in {
		out[key] = value
	}
	return out
}

func sortedStringMap(in map[string]string) map[string]string {
	if len(in) == 0 {
		return map[string]string{}
	}
	keys := make([]string, 0, len(in))
	for key := range in {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	out := make(map[string]string, len(in))
	for _, key := range keys {
		out[key] = in[key]
	}
	return out
}

func sortedInt64Map(in map[string]int64) map[string]int64 {
	if len(in) == 0 {
		return map[string]int64{}
	}
	keys := make([]string, 0, len(in))
	for key := range in {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	out := make(map[string]int64, len(in))
	for _, key := range keys {
		out[key] = in[key]
	}
	return out
}

func sortedStrings(in []string) []string {
	if len(in) == 0 {
		return []string{}
	}
	out := append([]string(nil), in...)
	sort.Strings(out)
	return out
}
