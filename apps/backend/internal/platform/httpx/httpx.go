package httpx

import (
	"encoding/json"
	"net/http"
)

// JSON writes a JSON response with the given status code.
func JSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// Error writes a structured error JSON body.
func Error(w http.ResponseWriter, status int, code, message string) {
	JSON(w, status, map[string]string{"error": code, "message": message})
}

// NotImplemented is used for feature-flagged V3 stubs.
func NotImplemented(w http.ResponseWriter, feature string) {
	Error(w, http.StatusNotImplemented, "not_implemented", feature+" is not enabled")
}

// FeatureDisabled returns 404 when a feature flag is off.
func FeatureDisabled(w http.ResponseWriter) {
	Error(w, http.StatusNotFound, "feature_disabled", "feature is disabled")
}
