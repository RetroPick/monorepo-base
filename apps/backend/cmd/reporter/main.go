package main

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"math/big"
	"os"
	"strconv"
	"strings"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"

	"retropick/apps/backend/internal/reporter"
)

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	if os.Getenv("REPORTER_ENABLED") != "1" {
		log.Info("retropick-reporter disabled", "set", "REPORTER_ENABLED=1")
		return
	}

	signed, err := run()
	if err != nil {
		log.Error("retropick-reporter failed", "err", err)
		os.Exit(1)
	}
	if err := json.NewEncoder(os.Stdout).Encode(signed); err != nil {
		log.Error("encode signed claim", "err", err)
		os.Exit(1)
	}
}

func run() (reporter.SignedClaim, error) {
	key, err := reporter.ParsePrivateKey(os.Getenv("REPORTER_PRIVATE_KEY"))
	if err != nil {
		return reporter.SignedClaim{}, err
	}
	chainID, ok := new(big.Int).SetString(strings.TrimSpace(os.Getenv("REPORTER_CHAIN_ID")), 10)
	if !ok {
		return reporter.SignedClaim{}, fmt.Errorf("REPORTER_CHAIN_ID must be a base-10 integer")
	}
	cfg := reporter.SignerConfig{
		ChainID:        chainID,
		AdapterAddress: common.HexToAddress(os.Getenv("TRUSTED_REPORTER_ADAPTER")),
		ReporterKey:    key,
	}
	kind := reporter.ClaimKind(strings.ToLower(strings.TrimSpace(os.Getenv("REPORTER_CLAIM_KIND"))))
	claimBase, err := readClaimBase()
	if err != nil {
		return reporter.SignedClaim{}, err
	}

	switch kind {
	case reporter.ClaimKindLock:
		valueE8, err := bigEnv("REPORTER_VALUE_E8")
		if err != nil {
			return reporter.SignedClaim{}, err
		}
		return reporter.SignLockClaim(cfg, reporter.ScalarClaim{
			MarketID:       claimBase.marketID,
			ValueE8:        valueE8,
			ObservedAt:     claimBase.observedAt,
			DataSourceHash: claimBase.dataSourceHash,
			Nonce:          claimBase.nonce,
			ReporterEpoch:  claimBase.reporterEpoch,
		})
	case reporter.ClaimKindResolve:
		valueE8, err := bigEnv("REPORTER_VALUE_E8")
		if err != nil {
			return reporter.SignedClaim{}, err
		}
		return reporter.SignResolveClaim(cfg, reporter.ScalarClaim{
			MarketID:       claimBase.marketID,
			ValueE8:        valueE8,
			ObservedAt:     claimBase.observedAt,
			DataSourceHash: claimBase.dataSourceHash,
			Nonce:          claimBase.nonce,
			ReporterEpoch:  claimBase.reporterEpoch,
		})
	case reporter.ClaimKindOhlc:
		highE8, err := bigEnv("REPORTER_HIGH_E8")
		if err != nil {
			return reporter.SignedClaim{}, err
		}
		lowE8, err := bigEnv("REPORTER_LOW_E8")
		if err != nil {
			return reporter.SignedClaim{}, err
		}
		closeE8, err := bigEnv("REPORTER_CLOSE_E8")
		if err != nil {
			return reporter.SignedClaim{}, err
		}
		return reporter.SignOhlcClaim(cfg, reporter.OhlcClaim{
			MarketID:       claimBase.marketID,
			HighE8:         highE8,
			LowE8:          lowE8,
			CloseE8:        closeE8,
			ObservedAt:     claimBase.observedAt,
			DataSourceHash: claimBase.dataSourceHash,
			Nonce:          claimBase.nonce,
			ReporterEpoch:  claimBase.reporterEpoch,
		})
	default:
		return reporter.SignedClaim{}, fmt.Errorf("REPORTER_CLAIM_KIND must be one of: lock, resolve, ohlc")
	}
}

type claimBase struct {
	marketID       common.Hash
	observedAt     uint64
	dataSourceHash common.Hash
	nonce          *big.Int
	reporterEpoch  *big.Int
}

func readClaimBase() (claimBase, error) {
	observedAt, err := strconv.ParseUint(strings.TrimSpace(os.Getenv("REPORTER_OBSERVED_AT")), 10, 64)
	if err != nil {
		return claimBase{}, fmt.Errorf("REPORTER_OBSERVED_AT: %w", err)
	}
	nonce, err := bigEnv("REPORTER_NONCE")
	if err != nil {
		return claimBase{}, err
	}
	reporterEpoch, err := bigEnv("REPORTER_EPOCH")
	if err != nil {
		return claimBase{}, err
	}
	dataSourceHash, err := dataSourceHashFromEnv()
	if err != nil {
		return claimBase{}, err
	}
	return claimBase{
		marketID:       common.HexToHash(os.Getenv("REPORTER_MARKET_ID")),
		observedAt:     observedAt,
		dataSourceHash: dataSourceHash,
		nonce:          nonce,
		reporterEpoch:  reporterEpoch,
	}, nil
}

func dataSourceHashFromEnv() (common.Hash, error) {
	if raw := strings.TrimSpace(os.Getenv("REPORTER_DATA_SOURCE_HASH")); raw != "" {
		return common.HexToHash(raw), nil
	}
	source := os.Getenv("REPORTER_DATA_SOURCE")
	if strings.TrimSpace(source) == "" {
		return common.Hash{}, fmt.Errorf("REPORTER_DATA_SOURCE or REPORTER_DATA_SOURCE_HASH is required")
	}
	return crypto.Keccak256Hash([]byte(source)), nil
}

func bigEnv(name string) (*big.Int, error) {
	v, ok := new(big.Int).SetString(strings.TrimSpace(os.Getenv(name)), 10)
	if !ok {
		return nil, fmt.Errorf("%s must be a base-10 integer", name)
	}
	return v, nil
}
