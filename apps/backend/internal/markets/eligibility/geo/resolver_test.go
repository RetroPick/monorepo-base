package geo_test

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

	"retropick/apps/backend/internal/markets/eligibility/geo"
)

func fixturePath(name string) string {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		panic("runtime.Caller failed")
	}
	return filepath.Join(filepath.Dir(file), "testdata", name)
}

func newTestServer(t *testing.T, handler http.HandlerFunc) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(handler)
	t.Cleanup(srv.Close)
	return srv
}

func resolverForServer(t *testing.T, srv *httptest.Server) *geo.HTTPResolver {
	t.Helper()
	return geo.NewHTTPResolver(geo.Config{
		BaseURL:      srv.URL,
		PathTemplate: "/{ip}/json",
		Timeout:      2 * time.Second,
	})
}

func TestUnwiredResolverAlwaysFailsClosed(t *testing.T) {
	t.Parallel()

	var resolver geo.UnwiredResolver
	_, err := resolver.Resolve(context.Background(), "203.0.113.1")
	if err == nil {
		t.Fatal("expected error")
	}
	if !errors.Is(err, geo.ErrUnknown) {
		t.Fatalf("err %v", err)
	}
}

func TestHTTPResolverHappyPath(t *testing.T) {
	t.Parallel()

	body, err := os.ReadFile(fixturePath("us.json"))
	if err != nil {
		t.Fatal(err)
	}
	srv := newTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/203.0.113.1/json" {
			t.Fatalf("path %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(body)
	})

	got, err := resolverForServer(t, srv).Resolve(context.Background(), "203.0.113.1")
	if err != nil {
		t.Fatal(err)
	}
	if got.RegionCode != "US" {
		t.Fatalf("region %q want US", got.RegionCode)
	}
}

func TestHTTPResolverAppendsTokenQueryParam(t *testing.T) {
	t.Parallel()

	body, err := os.ReadFile(fixturePath("us.json"))
	if err != nil {
		t.Fatal(err)
	}
	srv := newTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		if got := r.URL.Query().Get("token"); got != "test-token" {
			t.Fatalf("token %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(body)
	})

	resolver := geo.NewHTTPResolver(geo.Config{
		BaseURL:      srv.URL,
		PathTemplate: "/{ip}/json",
		APIKey:       "test-token",
		Timeout:      2 * time.Second,
	})
	got, err := resolver.Resolve(context.Background(), "203.0.113.1")
	if err != nil {
		t.Fatal(err)
	}
	if got.RegionCode != "US" {
		t.Fatalf("region %q want US", got.RegionCode)
	}
}

func TestHTTPResolverUpstream5xxFailsClosed(t *testing.T) {
	t.Parallel()

	srv := newTestServer(t, func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	})

	_, err := resolverForServer(t, srv).Resolve(context.Background(), "203.0.113.1")
	if !errors.Is(err, geo.ErrUnknown) {
		t.Fatalf("err %v", err)
	}
}

func TestHTTPResolverInvalidJSONFailsClosed(t *testing.T) {
	t.Parallel()

	srv := newTestServer(t, func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`not-json`))
	})

	_, err := resolverForServer(t, srv).Resolve(context.Background(), "203.0.113.1")
	if !errors.Is(err, geo.ErrUnknown) {
		t.Fatalf("err %v", err)
	}
}

func TestHTTPResolverMissingCountryFailsClosed(t *testing.T) {
	t.Parallel()

	srv := newTestServer(t, func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"ip":"203.0.113.1"}`))
	})

	_, err := resolverForServer(t, srv).Resolve(context.Background(), "203.0.113.1")
	if !errors.Is(err, geo.ErrUnknown) {
		t.Fatalf("err %v", err)
	}
}

func TestHTTPResolverEmptyClientIPFailsClosed(t *testing.T) {
	t.Parallel()

	srv := newTestServer(t, func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"country":"US"}`))
	})

	_, err := resolverForServer(t, srv).Resolve(context.Background(), "")
	if !errors.Is(err, geo.ErrUnknown) {
		t.Fatalf("err %v", err)
	}
}

func TestHTTPResolverNetworkTimeoutFailsClosed(t *testing.T) {
	t.Parallel()

	resolver := geo.NewHTTPResolver(geo.Config{
		BaseURL:      "http://127.0.0.1:1",
		PathTemplate: "/{ip}/json",
		Timeout:      50 * time.Millisecond,
	})

	_, err := resolver.Resolve(context.Background(), "203.0.113.1")
	if !errors.Is(err, geo.ErrUnknown) {
		t.Fatalf("err %v", err)
	}
}

func TestResolverFromEnvUnwiredWhenUnset(t *testing.T) {
	t.Setenv("MARKETS_GEOIP_BASE_URL", "")

	resolver := geo.ResolverFromEnv()
	_, err := resolver.Resolve(context.Background(), "203.0.113.1")
	if !errors.Is(err, geo.ErrUnknown) {
		t.Fatalf("err %v", err)
	}
}

func TestResolverFromEnvHTTPWhenSet(t *testing.T) {
	body, err := os.ReadFile(fixturePath("us.json"))
	if err != nil {
		t.Fatal(err)
	}
	srv := newTestServer(t, func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(body)
	})

	t.Setenv("MARKETS_GEOIP_BASE_URL", srv.URL)
	t.Setenv("MARKETS_GEOIP_PATH", "/{ip}/json")

	resolver := geo.ResolverFromEnv()
	got, err := resolver.Resolve(context.Background(), "203.0.113.1")
	if err != nil {
		t.Fatal(err)
	}
	if got.RegionCode != "US" {
		t.Fatalf("region %q want US", got.RegionCode)
	}
}

func TestConfigFromEnvReadsGEOProviderAPIKeyFallback(t *testing.T) {
	t.Setenv("MARKETS_GEOIP_API_KEY", "")
	t.Setenv("GEO_PROVIDER_API_KEY", "fallback-key")

	cfg := geo.ConfigFromEnv()
	if cfg.APIKey != "fallback-key" {
		t.Fatalf("apiKey %q", cfg.APIKey)
	}
}

func TestDefaultConfigUsesPathTemplate(t *testing.T) {
	t.Parallel()

	cfg := geo.DefaultConfig()
	if cfg.PathTemplate != "/{ip}/json" {
		t.Fatalf("pathTemplate %q", cfg.PathTemplate)
	}
}
