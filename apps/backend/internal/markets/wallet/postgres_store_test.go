package wallet_test

import (
	"context"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/db"
	"retropick/apps/backend/internal/markets/wallet"
)

func TestPostgresAccountStore_ListAndUpsert(t *testing.T) {
	store := integrationWalletStore(t)
	ctx := context.Background()

	userID := "pg-user-1"
	signer := "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
	account := "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"

	rows, err := store.ListBySigner(ctx, userID, signer)
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 0 {
		t.Fatalf("expected empty, got %+v", rows)
	}

	linked, err := store.UpsertLink(ctx, wallet.LinkRecord{
		UserID:        userID,
		SignerAddress: signer,
		AccountWallet: account,
		WalletType:    wallet.WalletTypeGnosisSafe,
		LinkStatus:    wallet.LinkStatusLinked,
		IsPrimary:     true,
		ChainID:       wallet.PolygonChainID,
	})
	if err != nil {
		t.Fatal(err)
	}
	if linked.AccountWallet != account {
		t.Fatalf("account %q", linked.AccountWallet)
	}

	rows, err = store.ListBySigner(ctx, userID, signer)
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 1 || rows[0].AccountWallet != account || !rows[0].IsPrimary {
		t.Fatalf("rows %+v", rows)
	}

	account2 := "0xcccccccccccccccccccccccccccccccccccccccc"
	_, err = store.UpsertLink(ctx, wallet.LinkRecord{
		UserID:        userID,
		SignerAddress: signer,
		AccountWallet: account2,
		WalletType:    wallet.WalletTypeDepositWallet,
		LinkStatus:    wallet.LinkStatusLinked,
		IsPrimary:     true,
		ChainID:       wallet.PolygonChainID,
	})
	if err != nil {
		t.Fatal(err)
	}

	rows, err = store.ListBySigner(ctx, userID, signer)
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 2 {
		t.Fatalf("rows len %d", len(rows))
	}
	primaryCount := 0
	for _, row := range rows {
		if row.IsPrimary {
			primaryCount++
			if row.AccountWallet != account2 {
				t.Fatalf("primary should be account2, got %q", row.AccountWallet)
			}
		}
	}
	if primaryCount != 1 {
		t.Fatalf("primary count %d", primaryCount)
	}
}

func TestPostgresAccountStore_UpsertIdempotent(t *testing.T) {
	store := integrationWalletStore(t)
	ctx := context.Background()

	userID := "pg-user-2"
	signer := "0x1111111111111111111111111111111111111111"
	account := "0x2222222222222222222222222222222222222222"

	rec := wallet.LinkRecord{
		UserID:        userID,
		SignerAddress: signer,
		AccountWallet: account,
		WalletType:    wallet.WalletTypeDepositWallet,
		LinkStatus:    wallet.LinkStatusLinked,
		IsPrimary:     true,
	}
	if _, err := store.UpsertLink(ctx, rec); err != nil {
		t.Fatal(err)
	}
	rec.LinkStatus = wallet.LinkStatusPendingVerification
	if _, err := store.UpsertLink(ctx, rec); err != nil {
		t.Fatal(err)
	}

	rows, err := store.ListBySigner(ctx, userID, signer)
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 1 {
		t.Fatalf("rows %+v", rows)
	}
	if rows[0].LinkStatus != wallet.LinkStatusPendingVerification {
		t.Fatalf("status %q", rows[0].LinkStatus)
	}
}

func integrationWalletStore(t *testing.T) *wallet.PostgresAccountStore {
	t.Helper()
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DATABASE_URL not set")
	}
	if err := db.RunMigrations(databaseURL); err != nil {
		t.Fatalf("RunMigrations: %v", err)
	}
	pool, err := pgxpool.New(context.Background(), databaseURL)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)

	ctx := context.Background()
	if _, err := pool.Exec(ctx, `DELETE FROM markets_wallet_accounts WHERE user_id LIKE 'pg-user-%'`); err != nil {
		t.Fatalf("cleanup: %v", err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM markets_wallet_accounts WHERE user_id LIKE 'pg-user-%'`)
	})

	return wallet.NewPostgresAccountStore(pool)
}
