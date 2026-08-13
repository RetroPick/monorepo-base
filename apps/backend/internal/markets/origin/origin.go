// Package origin validates and normalizes exact HTTP origins.
package origin

import (
	"net/url"
	"strconv"
	"strings"
)

// Normalize returns the canonical exact origin, normalizing only scheme and host
// case. Explicit ports are preserved and must be decimal values in 1..65535.
func Normalize(raw string) (string, bool) {
	raw = strings.TrimSpace(raw)
	if raw == "" || strings.Contains(raw, ",") || strings.ContainsAny(raw, "\x00\r\n") {
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
