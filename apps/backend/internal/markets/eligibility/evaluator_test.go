package eligibility_test

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"runtime"
	"testing"
	"time"

	"retropick/apps/backend/internal/markets/eligibility"
	"retropick/apps/backend/internal/markets/eligibility/geo"
	"retropick/apps/backend/internal/markets/eligibility/geoblock"
)

type stubGeo struct {
	region string
	err    error
}

func (s stubGeo) Resolve(_ context.Context, _ string) (geo.Location, error) {
	if s.err != nil {
		return geo.Location{}, s.err
	}
	return geo.Location{RegionCode: s.region}, nil
}

type stubGeoblock struct {
	allowed bool
	err     error
}

func (s stubGeoblock) Check(_ context.Context, _, _ string) (geoblock.Result, error) {
	if s.err != nil {
		return geoblock.Result{}, s.err
	}
	return geoblock.Result{Allowed: s.allowed}, nil
}

type metricSpy struct {
	reasons []string
}

func (m *metricSpy) RecordFailClosed(reason string) {
	m.reasons = append(m.reasons, reason)
}

func TestDefaultEvaluatorFailsClosedOnUnwiredGeo(t *testing.T) {
	t.Parallel()

	fixed := time.Date(2026, 8, 9, 10, 0, 0, 0, time.UTC)
	spy := &metricSpy{}
	eval := eligibility.DefaultEvaluator()
	eval.Now = func() time.Time { return fixed }
	eval.Metrics = spy

	got := eval.Check(context.Background(), eligibility.Input{ClientIP: "203.0.113.1"})
	if got.Eligible {
		t.Fatal("expected eligible=false")
	}
	if got.Reason != eligibility.ReasonGeoUnknown {
		t.Fatalf("reason %q want %q", got.Reason, eligibility.ReasonGeoUnknown)
	}
	if len(spy.reasons) != 1 || spy.reasons[0] != eligibility.ReasonGeoUnknown {
		t.Fatalf("metrics %+v", spy.reasons)
	}
}

func TestEvaluatorMaintenanceMode(t *testing.T) {
	t.Parallel()

	eval := eligibility.DefaultEvaluator()
	eval.Geo = stubGeo{region: "US"}
	eval.Geoblock = stubGeoblock{allowed: true}
	rules := eligibility.DefaultRulePack()
	rules.MaintenanceMode = true
	eval.Rules = rules

	got := eval.Check(context.Background(), eligibility.Input{ClientIP: "203.0.113.1"})
	if got.Eligible || got.Reason != eligibility.ReasonMaintenanceMode {
		t.Fatalf("got %+v", got)
	}
}

func TestEvaluatorRegionBlocked(t *testing.T) {
	t.Parallel()

	eval := eligibility.DefaultEvaluator()
	eval.Geo = stubGeo{region: "XX"}
	eval.Geoblock = stubGeoblock{allowed: true}
	rules := eligibility.DefaultRulePack()
	rules.BlockedRegions = map[string]struct{}{"XX": {}}
	eval.Rules = rules

	got := eval.Check(context.Background(), eligibility.Input{ClientIP: "203.0.113.1"})
	if got.Eligible || got.Reason != eligibility.ReasonRegionBlocked || got.Region != "XX" {
		t.Fatalf("got %+v", got)
	}
}

func TestEvaluatorGeoblockUnwiredBLK001(t *testing.T) {
	t.Parallel()

	eval := eligibility.DefaultEvaluator()
	eval.Geo = stubGeo{region: "US"}

	got := eval.Check(context.Background(), eligibility.Input{ClientIP: "203.0.113.1"})
	if got.Eligible || got.Reason != eligibility.ReasonGeoblockUpstreamUnavailable {
		t.Fatalf("got %+v", got)
	}
}

func TestEvaluatorGeoblockTimeout(t *testing.T) {
	t.Parallel()

	eval := eligibility.DefaultEvaluator()
	eval.Geo = stubGeo{region: "US"}
	eval.Geoblock = stubGeoblock{err: geoblock.ErrTimeout}

	got := eval.Check(context.Background(), eligibility.Input{ClientIP: "203.0.113.1"})
	if got.Eligible || got.Reason != eligibility.ReasonGeoblockTimeout {
		t.Fatalf("got %+v", got)
	}
}

func TestEvaluatorGeoblockDenied(t *testing.T) {
	t.Parallel()

	eval := eligibility.DefaultEvaluator()
	eval.Geo = stubGeo{region: "US"}
	eval.Geoblock = stubGeoblock{allowed: false}

	got := eval.Check(context.Background(), eligibility.Input{ClientIP: "203.0.113.1"})
	if got.Eligible || got.Reason != eligibility.ReasonGeoblockDenied {
		t.Fatalf("got %+v", got)
	}
}

func TestEvaluatorHappyPath(t *testing.T) {
	t.Parallel()

	fixed := time.Date(2026, 8, 9, 10, 0, 0, 0, time.UTC)
	eval := eligibility.DefaultEvaluator()
	eval.Now = func() time.Time { return fixed }
	eval.Geo = stubGeo{region: "US"}
	eval.Geoblock = stubGeoblock{allowed: true}

	got := eval.Check(context.Background(), eligibility.Input{ClientIP: "203.0.113.1"})
	if !got.Eligible || got.Reason != "" || got.Region != "US" {
		t.Fatalf("got %+v", got)
	}
	if !got.CheckedAt.Equal(fixed) {
		t.Fatalf("checkedAt %v", got.CheckedAt)
	}
}

func TestEvaluatorAccountSuspended(t *testing.T) {
	t.Parallel()

	eval := eligibility.DefaultEvaluator()
	eval.Geo = stubGeo{region: "US"}
	eval.Geoblock = stubGeoblock{allowed: true}

	got := eval.Check(context.Background(), eligibility.Input{
		ClientIP: "203.0.113.1",
		Account: &eligibility.AccountContext{
			Standing: eligibility.AccountStandingSuspended,
		},
	})
	if got.Eligible || got.Reason != eligibility.ReasonAccountSuspended {
		t.Fatalf("got %+v", got)
	}
}

func TestEvaluatorGeoResolverErrorFailsClosed(t *testing.T) {
	t.Parallel()

	eval := eligibility.DefaultEvaluator()
	eval.Geo = stubGeo{err: errors.New("provider down")}

	got := eval.Check(context.Background(), eligibility.Input{ClientIP: "203.0.113.1"})
	if got.Eligible || got.Reason != eligibility.ReasonGeoUnknown {
		t.Fatalf("got %+v", got)
	}
}

func geoblockFixturePath(name string) string {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		panic("runtime.Caller failed")
	}
	return filepath.Join(filepath.Dir(file), "geoblock", "testdata", name)
}

func newGeoblockFixtureServer(t *testing.T, fixtureName string) *httptest.Server {
	t.Helper()
	body, err := os.ReadFile(geoblockFixturePath(fixtureName))
	if err != nil {
		t.Fatal(err)
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(body)
	}))
	t.Cleanup(srv.Close)
	return srv
}

func TestEvaluatorHTTPGeoblockDeniedIntegration(t *testing.T) {
	t.Parallel()

	srv := newGeoblockFixtureServer(t, "denied.json")
	checker := geoblock.NewHTTPChecker(geoblock.Config{
		BaseURL: srv.URL,
		Path:    "/api/geoblock",
		Timeout: 2 * time.Second,
	})
	eval := eligibility.EvaluatorWithGeoblock(stubGeo{region: "US"}, checker)

	got := eval.Check(context.Background(), eligibility.Input{ClientIP: "203.0.113.1"})
	if got.Eligible || got.Reason != eligibility.ReasonGeoblockDenied {
		t.Fatalf("got %+v", got)
	}
}

func TestEvaluatorHTTPGeoblockTimeoutIntegration(t *testing.T) {
	t.Parallel()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	t.Cleanup(srv.Close)

	checker := geoblock.NewHTTPChecker(geoblock.Config{
		BaseURL: srv.URL,
		Path:    "/api/geoblock",
		Timeout: 2 * time.Second,
	})
	eval := eligibility.EvaluatorWithGeoblock(stubGeo{region: "US"}, checker)

	got := eval.Check(context.Background(), eligibility.Input{ClientIP: "203.0.113.1"})
	if got.Eligible || got.Reason != eligibility.ReasonGeoblockTimeout {
		t.Fatalf("got %+v", got)
	}
}

func TestEvaluatorHTTPGeoblockAllowedIntegration(t *testing.T) {
	t.Parallel()

	fixed := time.Date(2026, 8, 9, 10, 0, 0, 0, time.UTC)
	srv := newGeoblockFixtureServer(t, "allowed.json")
	checker := geoblock.NewHTTPChecker(geoblock.Config{
		BaseURL: srv.URL,
		Path:    "/api/geoblock",
		Timeout: 2 * time.Second,
	})
	eval := eligibility.EvaluatorWithGeoblock(stubGeo{region: "US"}, checker)
	eval.Now = func() time.Time { return fixed }

	got := eval.Check(context.Background(), eligibility.Input{ClientIP: "203.0.113.1"})
	if !got.Eligible || got.Reason != "" || got.Region != "US" {
		t.Fatalf("got %+v", got)
	}
}

func geoFixturePath(name string) string {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		panic("runtime.Caller failed")
	}
	return filepath.Join(filepath.Dir(file), "geo", "testdata", name)
}

func newGeoFixtureServer(t *testing.T, fixtureName string) *httptest.Server {
	t.Helper()
	body, err := os.ReadFile(geoFixturePath(fixtureName))
	if err != nil {
		t.Fatal(err)
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/203.0.113.1/json" {
			t.Fatalf("geo path %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(body)
	}))
	t.Cleanup(srv.Close)
	return srv
}

func TestEvaluatorHTTPGeoAndGeoblockAllowedIntegration(t *testing.T) {
	t.Parallel()

	fixed := time.Date(2026, 8, 9, 10, 0, 0, 0, time.UTC)
	geoSrv := newGeoFixtureServer(t, "us.json")
	geoblockSrv := newGeoblockFixtureServer(t, "allowed.json")

	resolver := geo.NewHTTPResolver(geo.Config{
		BaseURL:      geoSrv.URL,
		PathTemplate: "/{ip}/json",
		Timeout:      2 * time.Second,
	})
	checker := geoblock.NewHTTPChecker(geoblock.Config{
		BaseURL: geoblockSrv.URL,
		Path:    "/api/geoblock",
		Timeout: 2 * time.Second,
	})
	eval := eligibility.EvaluatorWithGeoblock(resolver, checker)
	eval.Now = func() time.Time { return fixed }

	got := eval.Check(context.Background(), eligibility.Input{ClientIP: "203.0.113.1"})
	if !got.Eligible || got.Reason != "" || got.Region != "US" {
		t.Fatalf("got %+v", got)
	}
}
