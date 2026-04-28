package api

import (
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"

	"golang.org/x/time/rate"
)

var (
	prepareLimiterMu sync.Mutex
	prepareLimiters  = map[string]*rate.Limiter{}
)

func prepareRPM() int {
	const defaultRPM = 60
	s := strings.TrimSpace(os.Getenv("OPS_PREPARE_RPM"))
	if s == "" {
		return defaultRPM
	}
	n, err := strconv.Atoi(s)
	if err != nil || n < 1 {
		return defaultRPM
	}
	return n
}

func limiterForPrepare(ip string) *rate.Limiter {
	prepareLimiterMu.Lock()
	defer prepareLimiterMu.Unlock()
	l := prepareLimiters[ip]
	if l != nil {
		return l
	}
	rpm := prepareRPM()
	burst := rpm / 2
	if burst < 1 {
		burst = 1
	}
	l = rate.NewLimiter(rate.Limit(float64(rpm)/60.0), burst)
	prepareLimiters[ip] = l
	return l
}

func clientIP(r *http.Request) string {
	if x := r.Header.Get("X-Forwarded-For"); x != "" {
		return strings.TrimSpace(strings.Split(x, ",")[0])
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func prepareAllow(r *http.Request) bool {
	return limiterForPrepare(clientIP(r)).Allow()
}
