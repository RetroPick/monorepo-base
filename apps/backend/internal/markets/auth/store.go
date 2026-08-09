package auth

import (
	"context"
	"strings"
	"sync"

	"github.com/google/uuid"

	"retropick/apps/backend/internal/markets/eligibility"
)

// User is the in-memory account record for session eligibility checks.
type User struct {
	UserID               string
	Wallet               string
	Standing             eligibility.AccountStanding
	TermsVersionAccepted string
}

// UserStore resolves wallet addresses to account state.
type UserStore interface {
	GetOrCreate(ctx context.Context, wallet string) (User, error)
	Get(ctx context.Context, wallet string) (User, bool)
}

// MemoryUserStore is a process-local user registry until Postgres lands.
type MemoryUserStore struct {
	mu    sync.RWMutex
	users map[string]User
}

func NewMemoryUserStore() *MemoryUserStore {
	return &MemoryUserStore{users: make(map[string]User)}
}

func (s *MemoryUserStore) GetOrCreate(_ context.Context, wallet string) (User, error) {
	wallet = normalizeWallet(wallet)
	s.mu.Lock()
	defer s.mu.Unlock()
	if user, ok := s.users[wallet]; ok {
		return user, nil
	}
	user := User{
		UserID:               uuid.NewString(),
		Wallet:               wallet,
		Standing:             eligibility.AccountStandingActive,
		TermsVersionAccepted: "",
	}
	s.users[wallet] = user
	return user, nil
}

func (s *MemoryUserStore) Get(_ context.Context, wallet string) (User, bool) {
	wallet = normalizeWallet(wallet)
	s.mu.RLock()
	defer s.mu.RUnlock()
	user, ok := s.users[wallet]
	return user, ok
}

func normalizeWallet(wallet string) string {
	return strings.ToLower(strings.TrimSpace(wallet))
}

func userToAccountContext(user User) *eligibility.AccountContext {
	return &eligibility.AccountContext{
		UserID:               user.UserID,
		Standing:             user.Standing,
		TermsVersionAccepted: user.TermsVersionAccepted,
	}
}
