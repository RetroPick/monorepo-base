package markets

import (
	"net/http"

	"github.com/go-chi/chi/v5/middleware"

	"retropick/apps/backend/internal/platform/httpx"
)

// PortfolioReadGate returns middleware enforcing the portfolio_read capability on
// portfolio read routes (OpenAPI v1.4.0: GET /markets/me/positions,
// /markets/me/activity, /markets/me/portfolio/summary). While
// features.portfolio_read is false, every portfolio path responds 503 with
// error.code=capability_disabled and message "portfolio_read is disabled" — the
// exact shape of the spec's capabilityDisabled example. Responses are never
// cached (private, no-store).
//
// MKT-P4 glue (W1-006): the flag stays false in Service.Capabilities until QA is
// green; flipping it opens the gate for the real handlers mounted behind it.
func PortfolioReadGate(svc *Service) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !portfolioReadEnabled(svc, r) {
				w.Header().Set("Cache-Control", "private, no-store")
				httpx.JSON(w, http.StatusServiceUnavailable, ErrorResponse{Error: APIError{
					Code:      "capability_disabled",
					Message:   "portfolio_read is disabled",
					RequestID: middleware.GetReqID(r.Context()),
				}})
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func portfolioReadEnabled(svc *Service, r *http.Request) bool {
	return svc != nil && svc.Capabilities(r.Context()).Features["portfolio_read"]
}

// PortfolioNotImplementedHandler serves portfolio read paths whose handlers have
// not landed yet (listMyActivity, getMyPortfolioSummary). The route is mounted so
// the OpenAPI path exists behind the capability gate; while features.portfolio_read
// is false the gate responds 503 before this handler is reached. If the capability
// is ever enabled without implementations, callers get an explicit 501
// (not_implemented) instead of a misleading 404.
func PortfolioNotImplementedHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "private, no-store")
		httpx.JSON(w, http.StatusNotImplemented, ErrorResponse{Error: APIError{
			Code:      "not_implemented",
			Message:   "portfolio read endpoint is not implemented yet",
			RequestID: middleware.GetReqID(r.Context()),
		}})
	}
}
