package ethops

import (
	"fmt"
	"math/big"
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
)

func TestFaucetMintDigest_verifyEOASignature(t *testing.T) {
	// Same low test key as Foundry `TokenFaucetTest` (`uint256 userPk = 0xA11CE`).
	key, err := crypto.HexToECDSA(fmt.Sprintf("%064x", 0xa11ce))
	if err != nil {
		t.Fatal(err)
	}
	recipient := crypto.PubkeyToAddress(key.PublicKey)
	faucet := common.HexToAddress("0x2222222222222222222222222222222222222222")
	chainID := big.NewInt(84532)
	amount := new(big.Int).Mul(big.NewInt(1000), new(big.Int).Exp(big.NewInt(10), big.NewInt(18), nil))
	nonce := big.NewInt(0)
	deadline := uint64(2_000_000_000)

	digest := faucetMintDigest(faucet, chainID, recipient, amount, nonce, deadline)
	sig, err := crypto.Sign(digest.Bytes(), key)
	if err != nil {
		t.Fatal(err)
	}
	if len(sig) != 65 {
		t.Fatalf("sig len %d", len(sig))
	}
	// go-ethereum Sign uses v 0/1; wallets often use 27/28.
	sigEth := append([]byte(nil), sig...)
	sigEth[64] += 27
	if !verifyEOASignature(recipient, digest.Bytes(), sigEth) {
		t.Fatal("expected EOA signature to verify")
	}
	if verifyEOASignature(common.HexToAddress("0x3333333333333333333333333333333333333333"), digest.Bytes(), sigEth) {
		t.Fatal("wrong signer must not verify")
	}
}
