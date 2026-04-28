package api

import (
	"net/http"
	"net/url"
	"os"
	"slices"
	"strings"
)

// defaultCORSOrigins includes common local dev app ports. When CORS_STRICT is not "1", any
// http://localhost:* and http://127.0.0.1:* origin is also allowed (see isHTTPLocalhostAnyPort).
var defaultCORSOrigins = []string{
	"http://localhost:3000",
	"http://127.0.0.1:3000",
	"http://localhost:3001",
	"http://127.0.0.1:3001",
	"http://localhost:5173",
	"http://127.0.0.1:5173",
}

// BuildCORSAllowOriginFunc returns a chi/cors AllowOriginFunc. If CORS_STRICT=1, only
// defaultCORSOrigins and CORS_ALLOWED_ORIGINS (comma-separated) are accepted. Otherwise
// any http://localhost:PORT and http://127.0.0.1:PORT is accepted in addition, so the ops
// dev server (ports 3001..3030) is not blocked when 3001 is already taken.
func BuildCORSAllowOriginFunc() func(*http.Request, string) bool {
	strict := os.Getenv("CORS_STRICT") == "1"
	var extra []string
	if s := os.Getenv("CORS_ALLOWED_ORIGINS"); s != "" {
		for _, p := range strings.Split(s, ",") {
			p = strings.TrimSpace(p)
			if p != "" {
				extra = append(extra, p)
			}
		}
	}
	allow := append(slices.Clone(defaultCORSOrigins), extra...)

	return func(_ *http.Request, origin string) bool {
		if origin == "" {
			return false
		}
		for _, a := range allow {
			if a == origin {
				return true
			}
		}
		if strict {
			return false
		}
		return isHTTPLocalhostAnyPort(origin)
	}
}

func isHTTPLocalhostAnyPort(origin string) bool {
	u, err := url.Parse(origin)
	if err != nil {
		return false
	}
	if u.Scheme != "http" {
		return false
	}
	h := u.Hostname()
	return h == "localhost" || h == "127.0.0.1"
}
