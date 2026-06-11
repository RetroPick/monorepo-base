package reporter

import (
	"crypto/ecdsa"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"strings"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
)

var (
	errZeroMarketID          = errors.New("market id is zero")
	errZeroDataSourceHash    = errors.New("data source hash is zero")
	errInvalidObservedAt     = errors.New("observedAt must be non-zero")
	errInvalidChainID        = errors.New("chain id must be positive")
	errInvalidAdapterAddress = errors.New("adapter address is zero")
	errInvalidOhlc           = errors.New("invalid OHLC range")
)

var (
	lockClaimTypeHash = crypto.Keccak256Hash([]byte(
		"LockClaim(bytes32 marketId,int256 valueE8,uint64 observedAt,bytes32 dataSourceHash,uint256 nonce,uint256 reporterEpoch)",
	))
	resolveClaimTypeHash = crypto.Keccak256Hash([]byte(
		"ResolveClaim(bytes32 marketId,int256 valueE8,uint64 observedAt,bytes32 dataSourceHash,uint256 nonce,uint256 reporterEpoch)",
	))
	ohlcClaimTypeHash = crypto.Keccak256Hash([]byte(
		"OhlcClaim(bytes32 marketId,int256 highE8,int256 lowE8,int256 closeE8,uint64 observedAt,bytes32 dataSourceHash,uint256 nonce,uint256 reporterEpoch)",
	))
	eip712DomainTypeHash = crypto.Keccak256Hash([]byte(
		"EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)",
	))
	eip712NameHash    = crypto.Keccak256Hash([]byte("RetroPickTrustedReporter"))
	eip712VersionHash = crypto.Keccak256Hash([]byte("1"))
)

type ClaimKind string

const (
	ClaimKindLock    ClaimKind = "lock"
	ClaimKindResolve ClaimKind = "resolve"
	ClaimKindOhlc    ClaimKind = "ohlc"
)

type SignerConfig struct {
	ChainID        *big.Int
	AdapterAddress common.Address
	ReporterKey    *ecdsa.PrivateKey
}

type ScalarClaim struct {
	MarketID       common.Hash
	ValueE8        *big.Int
	ObservedAt     uint64
	DataSourceHash common.Hash
	Nonce          *big.Int
	ReporterEpoch  *big.Int
}

type OhlcClaim struct {
	MarketID       common.Hash
	HighE8         *big.Int
	LowE8          *big.Int
	CloseE8        *big.Int
	ObservedAt     uint64
	DataSourceHash common.Hash
	Nonce          *big.Int
	ReporterEpoch  *big.Int
}

type SignedClaim struct {
	Kind            ClaimKind      `json:"kind"`
	MarketID        common.Hash    `json:"marketId"`
	Digest          common.Hash    `json:"digest"`
	Signature       string         `json:"signature"`
	Signer          common.Address `json:"signer"`
	AdapterAddress  common.Address `json:"adapterAddress"`
	ChainID         string         `json:"chainId"`
	ObservedAt      uint64         `json:"observedAt"`
	DataSourceHash  common.Hash    `json:"dataSourceHash"`
	Nonce           string         `json:"nonce"`
	ReporterEpoch   string         `json:"reporterEpoch"`
	SubmissionGuard string         `json:"submissionGuard"`
}

func ParsePrivateKey(raw string) (*ecdsa.PrivateKey, error) {
	key := strings.TrimPrefix(strings.TrimSpace(raw), "0x")
	if key == "" {
		return nil, errors.New("reporter private key is required")
	}
	if _, err := hex.DecodeString(key); err != nil {
		return nil, fmt.Errorf("reporter private key hex: %w", err)
	}
	return crypto.HexToECDSA(key)
}

func SignLockClaim(cfg SignerConfig, claim ScalarClaim) (SignedClaim, error) {
	return signScalar(cfg, ClaimKindLock, lockClaimTypeHash, claim)
}

func SignResolveClaim(cfg SignerConfig, claim ScalarClaim) (SignedClaim, error) {
	return signScalar(cfg, ClaimKindResolve, resolveClaimTypeHash, claim)
}

func SignOhlcClaim(cfg SignerConfig, claim OhlcClaim) (SignedClaim, error) {
	if err := validateSignerConfig(cfg); err != nil {
		return SignedClaim{}, err
	}
	if err := validateOhlcClaim(claim); err != nil {
		return SignedClaim{}, err
	}

	structHash := crypto.Keccak256Hash(packWords(
		ohlcClaimTypeHash.Bytes(),
		claim.MarketID.Bytes(),
		intWord(claim.HighE8),
		intWord(claim.LowE8),
		intWord(claim.CloseE8),
		uintWord(new(big.Int).SetUint64(claim.ObservedAt)),
		claim.DataSourceHash.Bytes(),
		uintWord(defaultZero(claim.Nonce)),
		uintWord(defaultZero(claim.ReporterEpoch)),
	))
	digest := typedDataDigest(cfg, structHash)
	return signDigest(cfg, ClaimKindOhlc, claim.MarketID, digest, claim.ObservedAt, claim.DataSourceHash, claim.Nonce, claim.ReporterEpoch)
}

func signScalar(cfg SignerConfig, kind ClaimKind, typeHash common.Hash, claim ScalarClaim) (SignedClaim, error) {
	if err := validateSignerConfig(cfg); err != nil {
		return SignedClaim{}, err
	}
	if err := validateScalarClaim(claim); err != nil {
		return SignedClaim{}, err
	}

	structHash := crypto.Keccak256Hash(packWords(
		typeHash.Bytes(),
		claim.MarketID.Bytes(),
		intWord(claim.ValueE8),
		uintWord(new(big.Int).SetUint64(claim.ObservedAt)),
		claim.DataSourceHash.Bytes(),
		uintWord(defaultZero(claim.Nonce)),
		uintWord(defaultZero(claim.ReporterEpoch)),
	))
	digest := typedDataDigest(cfg, structHash)
	return signDigest(cfg, kind, claim.MarketID, digest, claim.ObservedAt, claim.DataSourceHash, claim.Nonce, claim.ReporterEpoch)
}

func typedDataDigest(cfg SignerConfig, structHash common.Hash) common.Hash {
	domainSeparator := crypto.Keccak256Hash(packWords(
		eip712DomainTypeHash.Bytes(),
		eip712NameHash.Bytes(),
		eip712VersionHash.Bytes(),
		uintWord(cfg.ChainID),
		addressWord(cfg.AdapterAddress),
	))
	return crypto.Keccak256Hash(append([]byte{0x19, 0x01}, append(domainSeparator.Bytes(), structHash.Bytes()...)...))
}

func signDigest(
	cfg SignerConfig,
	kind ClaimKind,
	marketID common.Hash,
	digest common.Hash,
	observedAt uint64,
	dataSourceHash common.Hash,
	nonce *big.Int,
	reporterEpoch *big.Int,
) (SignedClaim, error) {
	sig, err := crypto.Sign(digest.Bytes(), cfg.ReporterKey)
	if err != nil {
		return SignedClaim{}, err
	}
	sig[64] += 27
	signer := crypto.PubkeyToAddress(cfg.ReporterKey.PublicKey)
	return SignedClaim{
		Kind:            kind,
		MarketID:        marketID,
		Digest:          digest,
		Signature:       "0x" + hex.EncodeToString(sig),
		Signer:          signer,
		AdapterAddress:  cfg.AdapterAddress,
		ChainID:         cfg.ChainID.String(),
		ObservedAt:      observedAt,
		DataSourceHash:  dataSourceHash,
		Nonce:           defaultZero(nonce).String(),
		ReporterEpoch:   defaultZero(reporterEpoch).String(),
		SubmissionGuard: "operator must verify adapter trustedReporter, nonce, reporterEpoch, and source data before posting",
	}, nil
}

func validateSignerConfig(cfg SignerConfig) error {
	if cfg.ChainID == nil || cfg.ChainID.Sign() <= 0 {
		return errInvalidChainID
	}
	if cfg.AdapterAddress == (common.Address{}) {
		return errInvalidAdapterAddress
	}
	if cfg.ReporterKey == nil {
		return errors.New("reporter private key is required")
	}
	return nil
}

func validateScalarClaim(claim ScalarClaim) error {
	if claim.MarketID == (common.Hash{}) {
		return errZeroMarketID
	}
	if claim.ValueE8 == nil {
		return errors.New("valueE8 is required")
	}
	if claim.ObservedAt == 0 {
		return errInvalidObservedAt
	}
	if claim.DataSourceHash == (common.Hash{}) {
		return errZeroDataSourceHash
	}
	return nil
}

func validateOhlcClaim(claim OhlcClaim) error {
	if claim.MarketID == (common.Hash{}) {
		return errZeroMarketID
	}
	if claim.HighE8 == nil || claim.LowE8 == nil || claim.CloseE8 == nil {
		return errors.New("highE8, lowE8, and closeE8 are required")
	}
	if claim.ObservedAt == 0 {
		return errInvalidObservedAt
	}
	if claim.DataSourceHash == (common.Hash{}) {
		return errZeroDataSourceHash
	}
	if claim.HighE8.Cmp(claim.LowE8) < 0 || claim.CloseE8.Cmp(claim.LowE8) < 0 || claim.CloseE8.Cmp(claim.HighE8) > 0 {
		return errInvalidOhlc
	}
	return nil
}

func packWords(words ...[]byte) []byte {
	out := make([]byte, 0, len(words)*32)
	for _, word := range words {
		if len(word) != 32 {
			panic("reporter: abi word must be 32 bytes")
		}
		out = append(out, word...)
	}
	return out
}

func intWord(v *big.Int) []byte {
	if v == nil {
		v = new(big.Int)
	}
	if v.Sign() >= 0 {
		return uintWord(v)
	}
	mod := new(big.Int).Lsh(big.NewInt(1), 256)
	twos := new(big.Int).Add(mod, v)
	return uintWord(twos)
}

func uintWord(v *big.Int) []byte {
	if v == nil {
		v = new(big.Int)
	}
	if v.Sign() < 0 || v.BitLen() > 256 {
		panic("reporter: uint256 out of range")
	}
	return common.LeftPadBytes(v.Bytes(), 32)
}

func addressWord(addr common.Address) []byte {
	return common.LeftPadBytes(addr.Bytes(), 32)
}

func defaultZero(v *big.Int) *big.Int {
	if v == nil {
		return new(big.Int)
	}
	return v
}
