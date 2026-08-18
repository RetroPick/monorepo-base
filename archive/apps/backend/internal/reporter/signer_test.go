package reporter

import (
	"math/big"
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
)

func TestSignResolveClaimProducesRecoverableSignature(t *testing.T) {
	key, err := ParsePrivateKey("0x59c6995e998f97a5a0044966f0945385d5f5eea8a3c407cf5f23097b7cc5e6d8")
	if err != nil {
		t.Fatal(err)
	}
	cfg := SignerConfig{
		ChainID:        big.NewInt(84532),
		AdapterAddress: common.HexToAddress("0x1111111111111111111111111111111111111111"),
		ReporterKey:    key,
	}

	signed, err := SignResolveClaim(cfg, ScalarClaim{
		MarketID:       common.HexToHash("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"),
		ValueE8:        big.NewInt(50_000_00000000),
		ObservedAt:     1_700_000_000,
		DataSourceHash: crypto.Keccak256Hash([]byte("coinbase-btc-usd-close")),
		Nonce:          big.NewInt(3),
		ReporterEpoch:  big.NewInt(2),
	})
	if err != nil {
		t.Fatal(err)
	}

	sig := common.FromHex(signed.Signature)
	if len(sig) != 65 {
		t.Fatalf("signature length = %d", len(sig))
	}
	sig[64] -= 27
	pub, err := crypto.SigToPub(signed.Digest.Bytes(), sig)
	if err != nil {
		t.Fatal(err)
	}
	got := crypto.PubkeyToAddress(*pub)
	if got != signed.Signer {
		t.Fatalf("recovered signer %s want %s", got, signed.Signer)
	}
	if signed.Kind != ClaimKindResolve {
		t.Fatalf("kind = %s", signed.Kind)
	}
}

func TestSignOhlcClaimValidation(t *testing.T) {
	key, err := ParsePrivateKey("59c6995e998f97a5a0044966f0945385d5f5eea8a3c407cf5f23097b7cc5e6d8")
	if err != nil {
		t.Fatal(err)
	}
	cfg := SignerConfig{
		ChainID:        big.NewInt(84532),
		AdapterAddress: common.HexToAddress("0x1111111111111111111111111111111111111111"),
		ReporterKey:    key,
	}
	_, err = SignOhlcClaim(cfg, OhlcClaim{
		MarketID:       common.HexToHash("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"),
		HighE8:         big.NewInt(100),
		LowE8:          big.NewInt(110),
		CloseE8:        big.NewInt(105),
		ObservedAt:     1_700_000_000,
		DataSourceHash: crypto.Keccak256Hash([]byte("ohlc-source")),
	})
	if err != errInvalidOhlc {
		t.Fatalf("err = %v want %v", err, errInvalidOhlc)
	}
}

func TestSignerConfigValidation(t *testing.T) {
	_, err := SignResolveClaim(SignerConfig{}, ScalarClaim{})
	if err != errInvalidChainID {
		t.Fatalf("err = %v want %v", err, errInvalidChainID)
	}
}
