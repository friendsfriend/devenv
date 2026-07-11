package server

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"
)

func (s *Server) handleActionHistory(w http.ResponseWriter, r *http.Request) {
	limit := 50000
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 && parsed <= 50000 {
			limit = parsed
		}
	}
	since := time.Now().Add(-10 * time.Minute)
	if r.URL.Query().Get("scope") == "all" {
		since = time.Now().Add(-24 * time.Hour)
	}
	stored, err := s.services.StateStore().GetActionEventsSince(limit, since)
	if err != nil {
		respondErrorMessage(w, err.Error(), http.StatusInternalServerError)
		return
	}
	events := make([]json.RawMessage, 0, len(stored))
	for _, payload := range stored {
		if json.Valid([]byte(payload)) {
			events = append(events, json.RawMessage(payload))
		}
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(events)
}
