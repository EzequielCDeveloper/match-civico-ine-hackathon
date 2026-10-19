package common

import (
	"encoding/json"
	"net/http"
)

// CorsMiddleware handles Cross-Origin Resource Sharing for modern SPA frontends.
func CorsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Authorization, Content-Type, X-CSRF-Token")
		w.Header().Set("Access-Control-Max-Age", "3600")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// RespondJSON helper encodes and sends a JSON payload with standard content-type header.
func RespondJSON(w http.ResponseWriter, statusCode int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(statusCode)
	if payload != nil {
		if err := json.NewEncoder(w).Encode(payload); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
	}
}

// RespondError helper writes an error message as JSON.
func RespondError(w http.ResponseWriter, statusCode int, message string) {
	RespondJSON(w, statusCode, map[string]any{
		"ok":    false,
		"error": message,
	})
}
