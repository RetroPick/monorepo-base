package signals

import (
	"errors"
	"fmt"
	"time"
)

var (
	ErrInvalidTransition = errors.New("invalid lifecycle transition")
	ErrHashMismatch      = errors.New("evidence envelope hash mismatch")
)

// Publish transitions draft → active after validation.
func Publish(envelope EvidenceEnvelope) (EvidenceEnvelope, error) {
	if envelope.Lifecycle != LifecycleDraft {
		return EvidenceEnvelope{}, fmt.Errorf("%w: publish requires draft", ErrInvalidTransition)
	}
	if err := Validate(envelope); err != nil {
		return EvidenceEnvelope{}, err
	}
	envelope.Lifecycle = LifecycleActive
	return envelope, nil
}

// MarkStale transitions active → stale.
func MarkStale(envelope EvidenceEnvelope) (EvidenceEnvelope, error) {
	if envelope.Lifecycle != LifecycleActive {
		return EvidenceEnvelope{}, fmt.Errorf("%w: stale requires active", ErrInvalidTransition)
	}
	envelope.Lifecycle = LifecycleStale
	return envelope, nil
}

// StaleAfter reports whether an active envelope exceeds maxAge relative to now.
func StaleAfter(envelope EvidenceEnvelope, now time.Time, maxAge time.Duration) bool {
	if envelope.Lifecycle != LifecycleActive || maxAge <= 0 {
		return false
	}
	return !now.Before(envelope.ComputedAt.UTC().Add(maxAge))
}

// RetractEvidence transitions active|stale → retracted while preserving content hash.
func RetractEvidence(envelope EvidenceEnvelope, reasonCode string, retractedAt time.Time) (EvidenceEnvelope, error) {
	if envelope.Lifecycle != LifecycleActive && envelope.Lifecycle != LifecycleStale {
		return EvidenceEnvelope{}, fmt.Errorf("%w: retract requires active or stale", ErrInvalidTransition)
	}
	if reasonCode == "" || retractedAt.IsZero() {
		return EvidenceEnvelope{}, ErrInvalidEnvelope
	}
	t := retractedAt.UTC()
	envelope.Lifecycle = LifecycleRetracted
	envelope.RetractedAt = &t
	envelope.ReasonCodes = append(append([]string(nil), envelope.ReasonCodes...), reasonCode)
	return envelope, nil
}

// Supersede transitions active|stale → superseded and links to successorRef.
func Supersede(envelope EvidenceEnvelope, successorRef string) (EvidenceEnvelope, error) {
	if envelope.Lifecycle != LifecycleActive && envelope.Lifecycle != LifecycleStale {
		return EvidenceEnvelope{}, fmt.Errorf("%w: supersede requires active or stale", ErrInvalidTransition)
	}
	if successorRef == "" {
		return EvidenceEnvelope{}, ErrInvalidEnvelope
	}
	ref := successorRef
	envelope.Lifecycle = LifecycleSuperseded
	envelope.SupersededBy = &ref
	return envelope, nil
}

// DetectHashMismatch reports whether recomputed content differs from existing envelope.
func DetectHashMismatch(existing, recomputed EvidenceEnvelope) bool {
	existingHash, err := CanonicalHash(existing)
	if err != nil {
		return true
	}
	recomputedHash, err := CanonicalHash(recomputed)
	if err != nil {
		return true
	}
	return existingHash != recomputedHash
}
