package geoblock_test

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

	"retropick/apps/backend/internal/markets/eligibility/geoblock"
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

func checkerForServer(t *testing.T, srv *httptest.Server) *geoblock.HTTPChecker {
	t.Helper()
	return geoblock.NewHTTPChecker(geoblock.Config{
		BaseURL: srv.URL,
		Path:    "/api/geoblock",
		Timeout: 2 * time.Second,
	})
}

func TestUnwiredCheckerAlwaysFailsClosed(t *testing.T) {
	t.Parallel()

	var checker geoblock.UnwiredChecker
	_, err := checker.Check(context.Background(), "203.0.113.1", "US")
	if err == nil {
		t.Fatal("expected error")
	}
	if !errors.Is(err, geoblock.ErrUnwired) {
		t.Fatalf("err %v", err)
	}
}

func TestHTTPCheckerAllowed(t *testing.T) {
	t.Parallel()

	body, err := os.ReadFile(fixturePath("allowed.json"))
	if err != nil {
		t.Fatal(err)
	}
	srv := newTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/geoblock" {
			t.Fatalf("path %s", r.URL.Path)
		}
		if got := r.Header.Get("X-Forwarded-For"); got != "203.0.113.1" {
			t.Fatalf("x-forwarded-for %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(body)
	})

	got, err := checkerForServer(t, srv).Check(context.Background(), "203.0.113.1", "US")
	if err != nil {
		t.Fatal(err)
	}
	if !got.Allowed {
		t.Fatal("expected allowed")
	}
}

func TestHTTPCheckerDenied(t *testing.T) {
	t.Parallel()

	body, err := os.ReadFile(fixturePath("denied.json"))
	if err != nil {
		t.Fatal(err)
	}
	srv := newTestServer(t, func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(body)
	})

	got, err := checkerForServer(t, srv).Check(context.Background(), "203.0.113.1", "US")
	if err != nil {
		t.Fatal(err)
	}
	if got.Allowed {
		t.Fatal("expected denied")
	}
}

func TestHTTPCheckerUpstream5xxFailsClosed(t *testing.T) {
	t.Parallel()

	srv := newTestServer(t, func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	})

	_, err := checkerForServer(t, srv).Check(context.Background(), "203.0.113.1", "US")
	if !errors.Is(err, geoblock.ErrTimeout) {
		t.Fatalf("err %v", err)
	}
}

func TestHTTPCheckerInvalidJSONFailsClosed(t *testing.T) {
	t.Parallel()

	srv := newTestServer(t, func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`not-json`))
	})

	_, err := checkerForServer(t, srv).Check(context.Background(), "203.0.113.1", "US")
	if !errors.Is(err, geoblock.ErrTimeout) {
		t.Fatalf("err %v", err)
	}
}

func TestHTTPCheckerMissingBlockedFieldFailsClosed(t *testing.T) {
	t.Parallel()

	body, err := os.ReadFile(fixturePath("invalid.json"))
	if err != nil {
		t.Fatal(err)
	}
	srv := newTestServer(t, func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(body)
	})

	_, err = checkerForServer(t, srv).Check(context.Background(), "203.0.113.1", "US")
	if !errors.Is(err, geoblock.ErrTimeout) {
		t.Fatalf("err %v", err)
	}
}

func TestHTTPCheckerEmptyClientIPFailsClosed(t *testing.T) {
	t.Parallel()

	srv := newTestServer(t, func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"blocked":false}`))
	})

	_, err := checkerForServer(t, srv).Check(context.Background(), "", "US")
	if !errors.Is(err, geoblock.ErrTimeout) {
		t.Fatalf("err %v", err)
	}
}

func TestHTTPCheckerNetworkTimeoutFailsClosed(t *testing.T) {
	t.Parallel()

	checker := geoblock.NewHTTPChecker(geoblock.Config{
		BaseURL: "http://127.0.0.1:1",
		Path:    "/api/geoblock",
		Timeout: 50 * time.Millisecond,
	})

	_, err := checker.Check(context.Background(), "203.0.113.1", "US")
	if !errors.Is(err, geoblock.ErrTimeout) {
		t.Fatalf("err %v", err)
	}
}

func TestCheckerFromEnvUnwiredWhenUnset(t *testing.T) {
	t.Setenv("MARKETS_GEOBLOCK_BASE_URL", "")

	checker := geoblock.CheckerFromEnv()
	_, err := checker.Check(context.Background(), "203.0.113.1", "US")
	if !errors.Is(err, geoblock.ErrUnwired) {
		t.Fatalf("err %v", err)
	}
}

func TestCheckerFromEnvHTTPWhenSet(t *testing.T) {
	body, err := os.ReadFile(fixturePath("allowed.json"))
	if err != nil {
		t.Fatal(err)
	}
	srv := newTestServer(t, func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(body)
	})

	t.Setenv("MARKETS_GEOBLOCK_BASE_URL", srv.URL)
	t.Setenv("MARKETS_GEOBLOCK_PATH", "/api/geoblock")

	checker := geoblock.CheckerFromEnv()
	got, err := checker.Check(context.Background(), "203.0.113.1", "US")
	if err != nil {
		t.Fatal(err)
	}
	if !got.Allowed {
		t.Fatal("expected allowed")
	}
}

func TestDefaultConfigUsesOfficialEndpoint(t *testing.T) {
	t.Parallel()

	cfg := geoblock.DefaultConfig()
	if cfg.BaseURL != "https://polymarket.com" {
		t.Fatalf("baseURL %q", cfg.BaseURL)
	}
	if cfg.Path != "/api/geoblock" {
		t.Fatalf("path %q", cfg.Path)
	}
}
