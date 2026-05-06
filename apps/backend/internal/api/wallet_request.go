package api

import (
	"net/http"
	"strings"

	"github.com/ethereum/go-ethereum/common"
)

func requireAuthorizedWalletValue(w http.ResponseWriter, r *http.Request, wallet string) (string, bool) {
	wallet = strings.TrimSpace(wallet)
	if !common.IsHexAddress(wallet) {
		writeAPIError(w, http.StatusBadRequest, "INVALID_WALLET", "invalid wallet", nil)
		return "", false
	}
	if !WalletAuthorized(r, wallet, authSecretFromContext(r)) {
		writeAPIError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "sign in required", nil)
		return "", false
	}
	return strings.ToLower(wallet), true
}

func requireAuthorizedWalletQuery(w http.ResponseWriter, r *http.Request, param string) (string, bool) {
	if strings.TrimSpace(param) == "" {
		param = "wallet"
	}
	return requireAuthorizedWalletValue(w, r, r.URL.Query().Get(param))
}
