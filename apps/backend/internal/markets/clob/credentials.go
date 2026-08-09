package clob

import (
	"bytes"
	"context"
	"encoding/base64"
	"errors"
	"strings"
)

var ErrCredentialsUnwired = errors.New("clob l2 credentials unwired")

// L2Credentials holds server-side CLOB L2 API credentials for a session signer.
type L2Credentials struct {
	SignerAddress string
	APIKey        string
	Secret        string
	Passphrase    string
}

// CredentialProvider resolves CLOB L2 credentials for an authenticated session.
type CredentialProvider interface {
	Credentials(ctx context.Context) (L2Credentials, error)
}

// UnwiredCredentialProvider is the safe default until L1/L2 auth persistence lands.
type UnwiredCredentialProvider struct{}

func (UnwiredCredentialProvider) Credentials(context.Context) (L2Credentials, error) {
	return L2Credentials{}, ErrCredentialsUnwired
}

// StaticCredentialProvider returns fixed credentials for unit tests and sandbox.
type StaticCredentialProvider struct {
	Creds L2Credentials
	Err   error
}

func (s StaticCredentialProvider) Credentials(context.Context) (L2Credentials, error) {
	if s.Err != nil {
		return L2Credentials{}, s.Err
	}
	return s.Creds, nil
}

// SandboxCredentials returns deterministic test credentials for httptest fixtures.
func SandboxCredentials() L2Credentials {
	return L2Credentials{
		SignerAddress: "0x1234567890123456789012345678901234567890",
		APIKey: strings.Join(
			[]string{"11111111", "2222", "4333", "8444", "555555555555"},
			"-",
		),
		Secret: base64.StdEncoding.EncodeToString(bytes.Repeat([]byte{0x42}, 32)),
		Passphrase: strings.Join(
			[]string{"sandbox", "passphrase"},
			"-",
		),
	}
}
