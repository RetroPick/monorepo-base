package api

import (
	"strings"

	"github.com/ethereum/go-ethereum/common"
)

func validateOwnedWalletBinding(rawWallet, ownerWallet string) (string, error) {
	wallet := strings.TrimSpace(rawWallet)
	if wallet == "" {
		return strings.ToLower(ownerWallet), nil
	}
	if !common.IsHexAddress(wallet) {
		return "", errInvalidWallet
	}
	if !strings.EqualFold(wallet, ownerWallet) {
		return "", errWalletMismatch
	}
	return strings.ToLower(wallet), nil
}
