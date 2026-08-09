package balances

import "retropick/apps/backend/internal/markets/wallet"

// PrimaryLinkedWallet selects the linked trading wallet for balance queries.
// Prefers isPrimary with linkStatus linked; otherwise returns the first linked wallet.
func PrimaryLinkedWallet(wallets []wallet.LinkedWallet) (wallet.LinkedWallet, bool) {
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

// PrimaryAccountWallet returns the account wallet address of the primary linked wallet.
func PrimaryAccountWallet(wallets []wallet.LinkedWallet) (string, bool) {
	w, ok := PrimaryLinkedWallet(wallets)
	if !ok {
		return "", false
	}
	return w.AccountWallet, true
}
