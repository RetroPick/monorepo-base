package ethops

import (
	"testing"

	"github.com/ethereum/go-ethereum/accounts"
	"github.com/ethereum/go-ethereum/crypto"
)

func TestVerifyPersonalSign(t *testing.T) {
	key, err := crypto.GenerateKey()
	if err != nil {
		t.Fatal(err)
	}
	addr := crypto.PubkeyToAddress(key.PublicKey)
	msg := []byte("RetroPick watchlist v1\nchainId=1\n")
	digest := accounts.TextHash(msg)
	sig, err := crypto.Sign(digest.Bytes(), key)
	if err != nil {
		t.Fatal(err)
	}
	if len(sig) != 65 {
		t.Fatalf("sig len %d", len(sig))
	}
	if !VerifyPersonalSign(addr, msg, sig) {
		t.Fatal("expected valid personal sign")
	}
	other, _ := crypto.GenerateKey()
	if VerifyPersonalSign(crypto.PubkeyToAddress(other.PublicKey), msg, sig) {
		t.Fatal("wrong signer should fail")
	}
}
