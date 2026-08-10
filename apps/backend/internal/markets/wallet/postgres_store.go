package wallet

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PostgresAccountStore persists wallet linkage in markets_wallet_accounts.
type PostgresAccountStore struct {
	pool *pgxpool.Pool
}

// NewPostgresAccountStore returns a Postgres-backed AccountStore and AccountLinker.
func NewPostgresAccountStore(pool *pgxpool.Pool) *PostgresAccountStore {
	return &PostgresAccountStore{pool: pool}
}

const listBySignerSQL = `
SELECT account_wallet, wallet_type, link_status, is_primary, chain_id
FROM markets_wallet_accounts
WHERE user_id = $1 AND signer_address = $2
ORDER BY is_primary DESC, created_at ASC
`

func (s *PostgresAccountStore) ListBySigner(ctx context.Context, userID, signerAddress string) ([]LinkedAccount, error) {
	signer, err := normalizeAddress(signerAddress)
	if err != nil {
		return nil, err
	}
	userID = strings.TrimSpace(userID)
	if userID == "" {
		return nil, ErrUnauthorized
	}

	rows, err := s.pool.Query(ctx, listBySignerSQL, userID, signer)
	if err != nil {
		return nil, fmt.Errorf("list wallet accounts: %w", err)
	}
	defer rows.Close()

	out := make([]LinkedAccount, 0)
	for rows.Next() {
		var row LinkedAccount
		var walletType, linkStatus string
		if err := rows.Scan(&row.AccountWallet, &walletType, &linkStatus, &row.IsPrimary, &row.ChainID); err != nil {
			return nil, fmt.Errorf("scan wallet account: %w", err)
		}
		row.WalletType = WalletType(walletType)
		row.LinkStatus = LinkStatus(linkStatus)
		out = append(out, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate wallet accounts: %w", err)
	}
	return out, nil
}

func (s *PostgresAccountStore) UpsertLink(ctx context.Context, link LinkRecord) (LinkedAccount, error) {
	signer, err := normalizeAddress(link.SignerAddress)
	if err != nil {
		return LinkedAccount{}, err
	}
	account, err := normalizeAddress(link.AccountWallet)
	if err != nil {
		return LinkedAccount{}, err
	}
	userID := strings.TrimSpace(link.UserID)
	if userID == "" {
		return LinkedAccount{}, ErrUnauthorized
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

	var proofHash *string
	if strings.TrimSpace(link.LinkageProofHash) != "" {
		h := strings.TrimSpace(link.LinkageProofHash)
		proofHash = &h
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return LinkedAccount{}, fmt.Errorf("begin link tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if link.IsPrimary {
		if _, err := tx.Exec(ctx, `
UPDATE markets_wallet_accounts
SET is_primary = FALSE, updated_at = NOW()
WHERE user_id = $1 AND signer_address = $2 AND is_primary = TRUE
`, userID, signer); err != nil {
			return LinkedAccount{}, fmt.Errorf("clear primary wallet: %w", err)
		}
	}

	id, err := uuid.NewV7()
	if err != nil {
		return LinkedAccount{}, fmt.Errorf("generate id: %w", err)
	}
	now := time.Now().UTC()

	_, err = tx.Exec(ctx, `
INSERT INTO markets_wallet_accounts (
	id, user_id, signer_address, account_wallet, wallet_type, link_status,
	is_primary, chain_id, linkage_proof_hash, created_at, updated_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
ON CONFLICT (user_id, signer_address, account_wallet) DO UPDATE SET
	wallet_type = EXCLUDED.wallet_type,
	link_status = EXCLUDED.link_status,
	is_primary = EXCLUDED.is_primary,
	chain_id = EXCLUDED.chain_id,
	linkage_proof_hash = COALESCE(EXCLUDED.linkage_proof_hash, markets_wallet_accounts.linkage_proof_hash),
	updated_at = EXCLUDED.updated_at
`, id, userID, signer, account, string(wt), string(ls), link.IsPrimary, chainID, proofHash, now)
	if err != nil {
		return LinkedAccount{}, fmt.Errorf("upsert wallet account: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return LinkedAccount{}, fmt.Errorf("commit link tx: %w", err)
	}

	return LinkedAccount{
		AccountWallet: account,
		WalletType:    wt,
		LinkStatus:    ls,
		IsPrimary:     link.IsPrimary,
		ChainID:       chainID,
	}, nil
}

var _ AccountStore = (*PostgresAccountStore)(nil)
var _ AccountLinker = (*PostgresAccountStore)(nil)

// ErrNoRows is re-exported for tests comparing pgx sentinel errors.
var ErrNoRows = pgx.ErrNoRows

// IsNoRows reports whether err is a no-rows error.
func IsNoRows(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}
