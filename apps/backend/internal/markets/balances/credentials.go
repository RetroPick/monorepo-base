package balances

import "context"

// L2Credentials holds server-side CLOB L2 API credentials for a session signer.
type L2Credentials struct {
	SignerAddress string
	APIKey        string
	Secret        string
	Passphrase    string
}

// L2CredentialStore resolves CLOB L2 credentials for an authenticated session.
type L2CredentialStore interface {
	Credentials(ctx context.Context, session SessionContext) (L2Credentials, error)
}

// UnwiredL2CredentialStore is the safe default until L1/L2 auth persistence lands.
type UnwiredL2CredentialStore struct{}

func (UnwiredL2CredentialStore) Credentials(context.Context, SessionContext) (L2Credentials, error) {
	return L2Credentials{}, ErrUpstreamUnavailable
}

// StaticL2CredentialStore returns fixed credentials for unit tests.
type StaticL2CredentialStore struct {
	Creds L2Credentials
	Err   error
}

func (s StaticL2CredentialStore) Credentials(context.Context, SessionContext) (L2Credentials, error) {
	if s.Err != nil {
		return L2Credentials{}, s.Err
	}
	return s.Creds, nil
}
