package markets

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestReadinessFailsWhenConfiguredProjectionStoreIsUnhealthy(t *testing.T) {
	checker := HealthChecker{
		Worker:                  NewCatalogWorkerBridge(func() bool { return true }, func() bool { return false }, func() bool { return true }),
		PositionActivityHealthy: func() bool { return false },
	}
	rec := httptest.NewRecorder()
	checker.Ready(rec, httptest.NewRequest(http.MethodGet, "/health/ready", nil))
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusServiceUnavailable)
	}
	if got := rec.Body.String(); !strings.Contains(got, `"positionActivityProjections":"unavailable"`) {
		t.Fatalf("body = %s", got)
	}
}
