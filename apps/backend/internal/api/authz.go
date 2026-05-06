package api

import (
	"errors"
	"net/http"
	"strings"
)

var errWalletMismatch = errors.New("wallet does not match authenticated owner")
var errInvalidWallet = errors.New("invalid wallet")

func authorizeOptionalWalletPrincipal(r *http.Request, wallet, jwtSecret string) error {
	auth := strings.TrimSpace(r.Header.Get("Authorization"))
	if auth == "" {
		return nil
	}
	if WalletAuthorized(r, wallet, jwtSecret) {
		return nil
	}
	return errors.New("wallet does not match bearer token")
}
