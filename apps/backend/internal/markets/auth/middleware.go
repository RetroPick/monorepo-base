package auth

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5/middleware"

	"retropick/apps/backend/internal/markets/eligibility"
	"retropick/apps/backend/internal/platform/httpx"
)

const csrfHeaderName = "X-CSRF-Token"

// OptionalSession extracts a valid session cookie and loads account context when present.
func (m *Module) OptionalSession(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		session, err := m.sessionFromRequest(r)
		if err == nil && session != nil {
			user, ok := m.users.Get(ctx, session.Wallet)
			if !ok {
				user, err = m.users.GetOrCreate(ctx, session.Wallet)
				if err != nil {
					next.ServeHTTP(w, r)
					return
				}
			}
			ctx = withSession(ctx, session)
			ctx = withAccount(ctx, userToAccountContext(user))
		}
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequireAuthenticated rejects requests without a valid session.
func (m *Module) RequireAuthenticated(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, ok := SessionFromContext(r.Context()); !ok {
			writeAuthError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "authentication required")
			return
		}
		next.ServeHTTP(w, r)
	})
}

// RequireEligible gates authenticated routes using the shared fail-closed evaluator.
func (m *Module) RequireEligible(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if m.evaluator == nil {
			writeAuthError(w, r, http.StatusServiceUnavailable, "ELIGIBILITY_UNAVAILABLE", "eligibility evaluator not configured")
			return
		}
		in := eligibility.Input{
			ClientIP: eligibility.ClientIPFromRequest(r, m.ipTrust),
			Account:  AccountFromContext(r.Context()),
		}
		decision := m.evaluator.Check(r.Context(), in)
		if !decision.Eligible {
			details := map[string]any{"reason": decision.Reason}
			if decision.Region != "" {
				details["region"] = decision.Region
			}
			writeAuthError(w, r, http.StatusForbidden, "ELIGIBILITY_DENIED", "jurisdiction eligibility denied", details)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeAuthError(w http.ResponseWriter, r *http.Request, status int, code, message string, details ...map[string]any) {
	var d map[string]any
	if len(details) > 0 {
		d = details[0]
	}
	httpx.JSON(w, status, errorBody{
		Error: apiError{
			Code:      code,
			Message:   message,
			Details:   d,
			RequestID: middleware.GetReqID(r.Context()),
		},
	})
}

type apiError struct {
	Code      string         `json:"code"`
	Message   string         `json:"message"`
	Details   map[string]any `json:"details,omitempty"`
	RequestID string         `json:"requestId,omitempty"`
}

type errorBody struct {
	Error apiError `json:"error"`
}

func (m *Module) requireCSRFSameOrigin(r *http.Request) error {
	switch r.Method {
	case http.MethodGet, http.MethodHead, http.MethodOptions:
		return nil
	}
	headerToken := strings.TrimSpace(r.Header.Get(csrfHeaderName))
	cookie, err := r.Cookie(m.cfg.CSRFCookieName)
	if err != nil || strings.TrimSpace(cookie.Value) == "" {
		return errMissingCSRF
	}
	if headerToken == "" || cookie.Value != headerToken {
		return errCSRFMismatch
	}
	return nil
}

var (
	errMissingCSRF  = csrfError("missing csrf cookie")
	errCSRFMismatch = csrfError("csrf token mismatch")
)

type csrfError string

func (e csrfError) Error() string { return string(e) }
