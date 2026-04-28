package db

import (
	"database/sql/driver"
	"errors"
	"net"
	"strings"
	"syscall"

	"github.com/lib/pq"
)

// isPGAuthFailure reports password / authorization errors that should not be retried.
func isPGAuthFailure(err error) bool {
	var pqErr *pq.Error
	if errors.As(err, &pqErr) {
		switch pqErr.Code {
		case "28P01", "28000": // invalid_password, invalid_authorization
			return true
		}
	}
	return false
}

// isTransientDBReachabilityError reports likely network / DNS / "not listening yet" conditions
// worth retrying during Docker and distributed startup. Not used for business-logic SQL errors.
func isTransientDBReachabilityError(err error) bool {
	if err == nil {
		return false
	}
	if isPGAuthFailure(err) {
		return false
	}
	var pqErr *pq.Error
	if errors.As(err, &pqErr) {
		if len(pqErr.Code) >= 2 && pqErr.Code[:2] == "08" {
			return true // connection_exception
		}
	}
	if errors.Is(err, driver.ErrBadConn) {
		return true
	}
	var netErr net.Error
	if errors.As(err, &netErr) && netErr.Timeout() {
		return true
	}
	var opErr *net.OpError
	if errors.As(err, &opErr) {
		return true
	}
	var dns *net.DNSError
	if errors.As(err, &dns) {
		return true
	}
	if errors.Is(err, syscall.ECONNREFUSED) || errors.Is(err, syscall.ENETUNREACH) {
		return true
	}
	s := strings.ToLower(err.Error())
	if strings.Contains(s, "connection refused") ||
		strings.Contains(s, "server misbehaving") ||
		strings.Contains(s, "no such host") ||
		strings.Contains(s, "i/o timeout") {
		return true
	}
	return false
}
