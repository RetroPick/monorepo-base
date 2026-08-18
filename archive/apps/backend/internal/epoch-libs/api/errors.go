package api

import (
	"encoding/json"
	"net/http"
)

type ErrorEnvelope struct {
	Error APIError `json:"error"`
}

type APIError struct {
	Code    string         `json:"code"`
	Message string         `json:"message,omitempty"`
	Details map[string]any `json:"details,omitempty"`
}

func writeAPIError(w http.ResponseWriter, status int, code, message string, details map[string]any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(ErrorEnvelope{
		Error: APIError{
			Code:    code,
			Message: message,
			Details: details,
		},
	})
}

func WriteAPIError(w http.ResponseWriter, status int, code, message string, details map[string]any) {
	writeAPIError(w, status, code, message, details)
}
