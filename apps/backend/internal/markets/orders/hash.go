package orders

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
)

type hashEnvelope struct {
	UnsignedPayload UnsignedOrderPayload `json:"unsignedPayload"`
	Metadata        hashMetadata         `json:"metadata"`
}

type cancelHashEnvelope struct {
	UnsignedPayload UnsignedCancelPayload `json:"unsignedPayload"`
	Metadata        hashMetadata          `json:"metadata"`
}

// ComputeContentHash returns SHA-256 hex prefixed with 0x over canonical JSON.
func ComputeContentHash(payload UnsignedOrderPayload, meta hashMetadata) (string, error) {
	env := hashEnvelope{
		UnsignedPayload: payload,
		Metadata:        meta,
	}
	raw, err := json.Marshal(env)
	if err != nil {
		return "", fmt.Errorf("marshal hash envelope: %w", err)
	}
	sum := sha256.Sum256(raw)
	return "0x" + hex.EncodeToString(sum[:]), nil
}

// ComputeCancelContentHash returns the cancel preview binding hash.
func ComputeCancelContentHash(payload UnsignedCancelPayload, meta hashMetadata) (string, error) {
	env := cancelHashEnvelope{
		UnsignedPayload: payload,
		Metadata:        meta,
	}
	raw, err := json.Marshal(env)
	if err != nil {
		return "", fmt.Errorf("marshal cancel hash envelope: %w", err)
	}
	sum := sha256.Sum256(raw)
	return "0x" + hex.EncodeToString(sum[:]), nil
}

// VerifyCancelContentHash recomputes and compares the cancel binding hash.
func VerifyCancelContentHash(payload UnsignedCancelPayload, meta hashMetadata, want string) bool {
	got, err := ComputeCancelContentHash(payload, meta)
	if err != nil {
		return false
	}
	return got == want
}

// VerifyContentHash recomputes and compares the binding hash.
func VerifyContentHash(payload UnsignedOrderPayload, meta hashMetadata, want string) bool {
	got, err := ComputeContentHash(payload, meta)
	if err != nil {
		return false
	}
	return got == want
}
