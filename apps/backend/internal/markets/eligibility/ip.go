package eligibility

import (
	"net"
	"net/http"
	"net/netip"
	"strings"
)

// IPTrustOptions mirrors rate-limit proxy trust semantics.
type IPTrustOptions struct {
	TrustForwardedFor bool
	TrustedProxyCIDRs []string
}

// ClientIPFromRequest extracts the trusted client IP. Client geo override headers
// (X-Geo-*, Accept-Language) are intentionally ignored.
func ClientIPFromRequest(r *http.Request, opts IPTrustOptions) string {
	remoteIP := remoteAddrIP(r.RemoteAddr)
	if opts.TrustForwardedFor && proxyTrusted(remoteIP, opts.TrustedProxyCIDRs) {
		if ip := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); ip != "" {
			parts := strings.Split(ip, ",")
			return strings.TrimSpace(parts[0])
		}
	}
	return remoteIP
}

func remoteAddrIP(remoteAddr string) string {
	remoteAddr = strings.TrimSpace(remoteAddr)
	host, _, err := net.SplitHostPort(remoteAddr)
	if err == nil && host != "" {
		return host
	}
	return remoteAddr
}

func proxyTrusted(remoteIP string, cidrs []string) bool {
	addr, err := netip.ParseAddr(strings.TrimSpace(remoteIP))
	if err != nil {
		return false
	}
	for _, raw := range cidrs {
		prefix, err := netip.ParsePrefix(strings.TrimSpace(raw))
		if err == nil && prefix.Contains(addr) {
			return true
		}
	}
	return false
}

// HashIPRedacted returns a /24-redacted hash suitable for audit logs (no raw PII).
func HashIPRedacted(ip string) string {
	ip = strings.TrimSpace(ip)
	if ip == "" {
		return ""
	}
	addr, err := netip.ParseAddr(ip)
	if err != nil {
		return "invalid"
	}
	if addr.Is4() {
		b := addr.As4()
		b[3] = 0
		addr = netip.AddrFrom4(b)
	}
	return addr.String()
}
