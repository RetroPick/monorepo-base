package api

import "testing"

func TestValidateOwnedWalletBindingAllowsEmptyBodyWallet(t *testing.T) {
	got, err := validateOwnedWalletBinding("", "0x1111111111111111111111111111111111111111")
	if err != nil {
		t.Fatalf("expected empty body wallet to bind to owner: %v", err)
	}
	if got != "0x1111111111111111111111111111111111111111" {
		t.Fatalf("unexpected normalized wallet %q", got)
	}
}

func TestValidateOwnedWalletBindingRejectsInvalidWallet(t *testing.T) {
	if _, err := validateOwnedWalletBinding("not-a-wallet", "0x1111111111111111111111111111111111111111"); err != errInvalidWallet {
		t.Fatalf("expected errInvalidWallet, got %v", err)
	}
}

func TestValidateOwnedWalletBindingRejectsOwnerMismatch(t *testing.T) {
	if _, err := validateOwnedWalletBinding("0x2222222222222222222222222222222222222222", "0x1111111111111111111111111111111111111111"); err != errWalletMismatch {
		t.Fatalf("expected errWalletMismatch, got %v", err)
	}
}

func TestValidateOwnedWalletBindingNormalizesMatchingWallet(t *testing.T) {
	got, err := validateOwnedWalletBinding("0x1111111111111111111111111111111111111111", "0x1111111111111111111111111111111111111111")
	if err != nil {
		t.Fatalf("expected matching wallet to pass: %v", err)
	}
	if got != "0x1111111111111111111111111111111111111111" {
		t.Fatalf("unexpected normalized wallet %q", got)
	}
}
