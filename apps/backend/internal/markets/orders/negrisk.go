package orders

import (
	"fmt"
	"strings"
)

const (
	polygonChainIDNegRisk = 137

	eip712ExchangeName    = "Polymarket CTF Exchange"
	eip712ExchangeVersion = "2"

	// EV-008 registry pins — Polygon mainnet CTF Exchange V2 (verify at deploy).
	ctfExchangeV2Address        = "0xe111180000d2663c0091e4f400237545b87b996b"
	negRiskCTFExchangeV2Address = "0xe2222d279d744050d28e00520010520000310f59"

	warningExchangeRoutingCatalogFallback = "exchange_routing_catalog_fallback"
)

// ExchangeRoutingInput carries authoritative upstream neg-risk signals for preview routing.
// Title, question, slug, and other display text are intentionally excluded (EV-012).
type ExchangeRoutingInput struct {
	ClobNegRisk    *bool // nil when CLOB book constraints are unavailable
	CatalogNegRisk bool
}

// ExchangeRoutingResult is the BFF ACL output for EIP-712 domain selection.
type ExchangeRoutingResult struct {
	Domain            string
	VerifyingContract string
	EIP712Name        string
	EIP712Version     string
	ChainID           int
	Warnings          []string
}

// SelectExchangeDomain chooses standard vs neg_risk exchange domain per EV-012.
func SelectExchangeDomain(in ExchangeRoutingInput) (ExchangeRoutingResult, error) {
	negRisk := in.CatalogNegRisk
	warnings := []string{}

	if in.ClobNegRisk != nil {
		if *in.ClobNegRisk != in.CatalogNegRisk {
			return ExchangeRoutingResult{}, ErrExchangeRoutingConflict
		}
		negRisk = *in.ClobNegRisk
	} else {
		warnings = append(warnings, warningExchangeRoutingCatalogFallback)
	}

	domain := ExchangeDomainStandard
	if negRisk {
		domain = ExchangeDomainNegRisk
	}

	contract, err := VerifyingContractForDomain(domain)
	if err != nil {
		return ExchangeRoutingResult{}, err
	}

	return ExchangeRoutingResult{
		Domain:            domain,
		VerifyingContract: contract,
		EIP712Name:        eip712ExchangeName,
		EIP712Version:     eip712ExchangeVersion,
		ChainID:           polygonChainIDNegRisk,
		Warnings:          warnings,
	}, nil
}

// VerifyingContractForDomain returns the EV-008 verifyingContract for an exchange domain.
func VerifyingContractForDomain(domain string) (string, error) {
	switch strings.TrimSpace(domain) {
	case ExchangeDomainStandard:
		return ctfExchangeV2Address, nil
	case ExchangeDomainNegRisk:
		return negRiskCTFExchangeV2Address, nil
	default:
		return "", fmt.Errorf("%w: unknown exchange domain %q", ErrInvalidRequest, domain)
	}
}
