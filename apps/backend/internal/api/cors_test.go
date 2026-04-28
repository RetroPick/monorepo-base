package api

import (
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
)

func TestBuildCORSAllowOriginFunc_LocalhostHighPortWhenNotStrict(t *testing.T) {
	t.Setenv("CORS_STRICT", "")
	t.Cleanup(func() { _ = os.Unsetenv("CORS_STRICT") })
	f := BuildCORSAllowOriginFunc()
	if !f(nil, "http://localhost:3002") {
		t.Fatal("expected localhost:3002 allowed in non-strict mode")
	}
	if !f(nil, "http://127.0.0.1:3020") {
		t.Fatal("expected 127.0.0.1:3020 allowed in non-strict mode")
	}
}

func TestBuildCORSAllowOriginFunc_StrictBlocksArbitraryPort(t *testing.T) {
	t.Setenv("CORS_STRICT", "1")
	t.Cleanup(func() { _ = os.Unsetenv("CORS_STRICT") })
	f := BuildCORSAllowOriginFunc()
	if f(nil, "http://localhost:3002") {
		t.Fatal("expected localhost:3002 blocked in strict mode")
	}
	if !f(nil, "http://localhost:3001") {
		t.Fatal("expected default list still allows 3001")
	}
}

func TestCORSMiddleware_OptionsAndGETReflectOriginForLocalhost3002(t *testing.T) {
	t.Setenv("CORS_STRICT", "")
	t.Cleanup(func() { _ = os.Unsetenv("CORS_STRICT") })

	r := chi.NewRouter()
	r.Use(cors.Handler(cors.Options{
		AllowOriginFunc:  BuildCORSAllowOriginFunc(),
		AllowedMethods:   []string{"GET", "HEAD", "OPTIONS", "POST"},
		AllowedHeaders:   []string{"Accept", "Content-Type"},
		AllowCredentials: false,
	}))
	r.Get("/api/v1/health", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{"ok":true}`)
	})
	srv := httptest.NewServer(r)
	defer srv.Close()
	origin := "http://localhost:3002"

	client := &http.Client{}
	req, err := http.NewRequest(http.MethodOptions, srv.URL+"/api/v1/health", nil)
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Origin", origin)
	req.Header.Set("Access-Control-Request-Method", "GET")
	res, err := client.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	if got := res.Header.Get("Access-Control-Allow-Origin"); got != origin {
		t.Fatalf("OPTIONS ACAO: want %q got %q", origin, got)
	}

	req2, err := http.NewRequest(http.MethodGet, srv.URL+"/api/v1/health", nil)
	if err != nil {
		t.Fatal(err)
	}
	req2.Header.Set("Origin", origin)
	res2, err := client.Do(req2)
	if err != nil {
		t.Fatal(err)
	}
	defer res2.Body.Close()
	if got := res2.Header.Get("Access-Control-Allow-Origin"); got != origin {
		t.Fatalf("GET ACAO: want %q got %q", origin, got)
	}
}
