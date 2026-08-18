package api

import (
	"context"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

func liveRPCContext(req *http.Request) (context.Context, context.CancelFunc) {
	timeout := 15 * time.Second
	if raw := strings.TrimSpace(os.Getenv("LIVE_RPC_TIMEOUT")); raw != "" {
		if d, err := time.ParseDuration(raw); err == nil && d > 0 {
			timeout = d
		} else if seconds, err := strconv.Atoi(raw); err == nil && seconds > 0 {
			timeout = time.Duration(seconds) * time.Second
		}
	} else if raw := strings.TrimSpace(os.Getenv("LIVE_RPC_TIMEOUT_SECONDS")); raw != "" {
		if seconds, err := strconv.Atoi(raw); err == nil && seconds > 0 {
			timeout = time.Duration(seconds) * time.Second
		}
	}
	return context.WithTimeout(req.Context(), timeout)
}
