package ethops

import (
	"github.com/ethereum/go-ethereum/accounts"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
)

// VerifyPersonalSign checks an EIP-191 personal_sign signature over message bytes.
func VerifyPersonalSign(signer common.Address, message []byte, sig []byte) bool {
	if len(sig) != 65 {
		return false
	}
	digest := accounts.TextHash(message)
	sigCopy := make([]byte, len(sig))
	copy(sigCopy, sig)
	if sigCopy[64] == 27 || sigCopy[64] == 28 {
		sigCopy[64] -= 27
	}
	pub, err := crypto.Ecrecover(digest, sigCopy)
	if err != nil || len(pub) == 0 {
		return false
	}
	ecdsaPub, err := crypto.UnmarshalPubkey(pub)
	if err != nil {
		return false
	}
	return crypto.PubkeyToAddress(*ecdsaPub) == signer
}
