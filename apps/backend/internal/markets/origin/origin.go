// Package origin validates and normalizes exact HTTP origins.
package origin

import (
	"net"
	"net/url"
	"strconv"
	"strings"
)

// Normalize returns the canonical exact origin, normalizing only scheme and host
// case. Explicit ports are preserved and must be decimal values in 1..65535.
func Normalize(raw string) (string, bool) {
	if raw == "" || strings.Contains(raw, ",") || !allVisibleASCII(raw) {
		return "", false
	}
	parsed, err := url.Parse(raw)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Opaque != "" || parsed.Host == "" || parsed.User != nil || parsed.Path != "" || parsed.RawPath != "" || parsed.RawQuery != "" || parsed.ForceQuery || parsed.Fragment != "" {
		return "", false
	}

	hostname := parsed.Hostname()
	if hostname == "" || strings.Contains(hostname, "%") || strings.Contains(parsed.Host, "*") {
		return "", false
	}
	if strings.Contains(hostname, ":") {
		if net.ParseIP(hostname) == nil || !strings.HasPrefix(parsed.Host, "[") {
			return "", false
		}
	} else if ip := net.ParseIP(hostname); ip != nil {
		if strings.Contains(hostname, ".") && ip.To4() == nil {
			return "", false
		}
	} else if looksLikeIPv4(hostname) || !validDNSHostname(hostname) {
		return "", false
	}

	if hasExplicitPort(parsed.Host) {
		port := parsed.Port()
		if port == "" || !allDecimal(port) {
			return "", false
		}
		n, err := strconv.Atoi(port)
		if err != nil || n < 1 || n > 65535 {
			return "", false
		}
	}

	return strings.ToLower(parsed.Scheme) + "://" + strings.ToLower(parsed.Host), true
}

func allVisibleASCII(value string) bool {
	for i := 0; i < len(value); i++ {
		if value[i] <= 0x20 || value[i] >= 0x7f {
			return false
		}
	}
	return true
}

func looksLikeIPv4(hostname string) bool {
	for i := 0; i < len(hostname); i++ {
		if (hostname[i] < '0' || hostname[i] > '9') && hostname[i] != '.' {
			return false
		}
	}
	return true
}

func validDNSHostname(hostname string) bool {
	if len(hostname) > 253 {
		return false
	}
	labels := strings.Split(hostname, ".")
	for _, label := range labels {
		if len(label) < 1 || len(label) > 63 || label[0] == '-' || label[len(label)-1] == '-' {
			return false
		}
		for i := 0; i < len(label); i++ {
			char := label[i]
			if (char < 'a' || char > 'z') && (char < 'A' || char > 'Z') && (char < '0' || char > '9') && char != '-' {
				return false
			}
		}
	}
	return true
}

func hasExplicitPort(host string) bool {
	if strings.HasPrefix(host, "[") {
		end := strings.LastIndex(host, "]")
		return end >= 0 && len(host) > end+1
	}
	return strings.Contains(host, ":")
}

func allDecimal(value string) bool {
	for _, char := range value {
		if char < '0' || char > '9' {
			return false
		}
	}
	return value != ""
}
