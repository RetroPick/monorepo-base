package wallet

import "context"

// LinkedAccount is a persisted signer → account wallet binding.
type LinkedAccount struct {
	AccountWallet string
	WalletType    WalletType
	LinkStatus    LinkStatus
	IsPrimary     bool
	ChainID       int
}

// LinkRecord is input for persisting a signer → account wallet linkage.
type LinkRecord struct {
	UserID           string
	SignerAddress    string
	AccountWallet    string
	WalletType       WalletType
	LinkStatus       LinkStatus
	IsPrimary        bool
	ChainID          int
	LinkageProofHash string
}

// AccountStore reads linked Polymarket account wallets for a session user.
type AccountStore interface {
	ListBySigner(ctx context.Context, userID, signerAddress string) ([]LinkedAccount, error)
}

// AccountLinker writes signer → account wallet linkage rows.
type AccountLinker interface {
	UpsertLink(ctx context.Context, link LinkRecord) (LinkedAccount, error)
}

// UnwiredStore returns no linked wallets — safe default; never invents addresses.
type UnwiredStore struct{}

func (UnwiredStore) ListBySigner(context.Context, string, string) ([]LinkedAccount, error) {
	return nil, nil
}

// UnwiredLinker rejects all link writes until Postgres is wired.
type UnwiredLinker struct{}

func (UnwiredLinker) UpsertLink(context.Context, LinkRecord) (LinkedAccount, error) {
	return LinkedAccount{}, ErrLinkerUnwired
}

// MemoryStore is an in-memory store for tests and fixtures only.
type MemoryStore struct {
	Rows map[string][]LinkedAccount // key: userID|signerAddress
}

func (m MemoryStore) ListBySigner(_ context.Context, userID, signerAddress string) ([]LinkedAccount, error) {
	if m.Rows == nil {
		return nil, nil
	}
	key := userID + "|" + signerAddress
	rows := m.Rows[key]
	if len(rows) == 0 {
		return nil, nil
	}
	out := make([]LinkedAccount, len(rows))
	copy(out, rows)
	return out, nil
}

func (m *MemoryStore) UpsertLink(_ context.Context, link LinkRecord) (LinkedAccount, error) {
	if m.Rows == nil {
		m.Rows = make(map[string][]LinkedAccount)
	}
	key := link.UserID + "|" + link.SignerAddress
	account, err := normalizeAddress(link.AccountWallet)
	if err != nil {
		return LinkedAccount{}, err
	}
	wt := link.WalletType
	if wt == "" {
		wt = WalletTypeDepositWallet
	}
	ls := link.LinkStatus
	if ls == "" {
		ls = LinkStatusLinked
	}
	chainID := link.ChainID
	if chainID == 0 {
		chainID = PolygonChainID
	}
	row := LinkedAccount{
		AccountWallet: account,
		WalletType:    wt,
		LinkStatus:    ls,
		IsPrimary:     link.IsPrimary,
		ChainID:       chainID,
	}
	rows := m.Rows[key]
	found := false
	for i, existing := range rows {
		if existing.AccountWallet == account {
			if link.IsPrimary {
				for j := range rows {
					rows[j].IsPrimary = false
				}
			}
			rows[i] = row
			found = true
			break
		}
	}
	if !found {
		if link.IsPrimary {
			for i := range rows {
				rows[i].IsPrimary = false
			}
		}
		rows = append(rows, row)
	}
	m.Rows[key] = rows
	return row, nil
}
