package auth

import (
	"fmt"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common"
	siwe "github.com/spruceid/siwe-go"
)

// VerifySIWE parses and validates an EIP-4361 message and signature.
func VerifySIWE(cfg Config, messageText, signature string, expectedNonce string) (common.Address, error) {
	messageText = strings.TrimSpace(messageText)
	signature = strings.TrimSpace(signature)
	expectedNonce = strings.TrimSpace(expectedNonce)
	if messageText == "" || signature == "" {
		return common.Address{}, fmt.Errorf("missing message or signature")
	}

	msg, err := siwe.ParseMessage(messageText)
	if err != nil {
		return common.Address{}, fmt.Errorf("invalid siwe message: %w", err)
	}

	if int64(msg.GetChainID()) != cfg.ChainID {
		return common.Address{}, fmt.Errorf("chain id mismatch")
	}

	domain := msg.GetDomain()
	if !cfg.domainAllowed(domain) {
		return common.Address{}, fmt.Errorf("domain not allowed")
	}

	nonce := msg.GetNonce()
	if expectedNonce != "" && nonce != expectedNonce {
		return common.Address{}, fmt.Errorf("nonce mismatch")
	}

	now := time.Now().UTC()
	if _, err := msg.ValidAt(now); err != nil {
		return common.Address{}, fmt.Errorf("message expired or not yet valid: %w", err)
	}

	domainPtr := &domain
	noncePtr := &nonce
	pubKey, err := msg.Verify(signature, domainPtr, noncePtr, &now)
	if err != nil {
		return common.Address{}, fmt.Errorf("signature verification failed: %w", err)
	}
	if pubKey == nil {
		return common.Address{}, fmt.Errorf("signature verification failed")
	}

	return msg.GetAddress(), nil
}
