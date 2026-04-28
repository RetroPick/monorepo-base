package db

import (
	"errors"
	"fmt"
	"net"
	"syscall"
	"testing"

	"github.com/lib/pq"
)

func TestIsPGAuthFailure(t *testing.T) {
	t.Parallel()
	pw := &pq.Error{Code: "28P01"}
	if !isPGAuthFailure(pw) {
		t.Fatal("expected 28P01 to be auth failure")
	}
	authz := &pq.Error{Code: "28000"}
	if !isPGAuthFailure(authz) {
		t.Fatal("expected 28000 to be auth failure")
	}
	if isPGAuthFailure(&pq.Error{Code: "42P01"}) {
		t.Fatal("42P01 is not auth")
	}
}

func TestIsTransientDBReachabilityError(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name  string
		err   error
		wantT bool
	}{
		{"nil", nil, false},
		{"op_error", &net.OpError{Op: "dial", Err: errors.New("refused")}, true},
		{"dns", &net.DNSError{Err: "server misbehaving"}, true},
		{"string_misbehaving", errors.New("dial tcp: lookup postgres on 127.0.0.11:53: server misbehaving"), true},
		{"string_refused", errors.New("dial tcp 127.0.0.1:5432: connection refused"), true},
		{"string_timeout", errors.New("i/o timeout"), true},
		{"wrapped_erefused", fmt.Errorf("postgres migrate driver: %w", syscall.ECONNREFUSED), true},
		{"pq_08", &pq.Error{Code: "08006"}, true},
		{"auth_28P01", &pq.Error{Code: "28P01"}, false},
		{"random", errors.New("column x does not exist"), false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			got := isTransientDBReachabilityError(tc.err)
			if got != tc.wantT {
				t.Fatalf("isTransientDBReachabilityError(%v) = %v, want %v", tc.err, got, tc.wantT)
			}
		})
	}
}
