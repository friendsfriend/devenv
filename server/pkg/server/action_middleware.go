package server

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/friendsfriend/devenv/pkg/actionrun"
)

type actionResponseWriter struct {
	http.ResponseWriter
	status int
	body   bytes.Buffer
}

func (w *actionResponseWriter) WriteHeader(status int) {
	w.status = status
	w.ResponseWriter.WriteHeader(status)
}

func (w *actionResponseWriter) Write(data []byte) (int, error) {
	if w.status == 0 {
		w.status = http.StatusOK
	}
	_, _ = w.body.Write(data)
	return w.ResponseWriter.Write(data)
}

func actionRoute(path string) bool {
	return strings.HasPrefix(path, "/api/git/") ||
		strings.HasPrefix(path, "/api/kubernetes/cluster/") ||
		path == "/api/docker/start" || path == "/api/docker/stop" || path == "/api/docker/restart"
}

func actionRequestMetadata(r *http.Request) (ident, target string) {
	ident = r.URL.Query().Get("appIdent")
	if r.Body == nil {
		return ident, target
	}
	data, err := io.ReadAll(r.Body)
	if err != nil {
		return ident, target
	}
	r.Body = io.NopCloser(bytes.NewReader(data))
	var body map[string]interface{}
	if json.Unmarshal(data, &body) == nil {
		for _, key := range []string{"appIdent", "ident"} {
			if value, ok := body[key].(string); ok && value != "" {
				ident = value
			}
		}
		for _, key := range []string{"branch", "targetId", "profile"} {
			if value, ok := body[key].(string); ok && value != "" {
				target = value
				break
			}
		}
	}
	return ident, target
}

func (s *Server) withRecordedAction(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet || !actionRoute(r.URL.Path) {
			next(w, r)
			return
		}
		ident, target := actionRequestMetadata(r)
		if ident == "" {
			ident = strings.TrimPrefix(strings.TrimPrefix(r.URL.Path, "/api/"), "/")
		}
		action := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/"), "/")
		action = strings.ReplaceAll(action, "/", ".")
		title := strings.Title(strings.ReplaceAll(action, ".", " "))
		command := r.Method + " " + r.URL.Path
		runID, stepID, err := s.beginAction(title, command, ident, action, "", target)
		if err != nil {
			next(w, r)
			return
		}
		commandID := stepID + "-command-0"
		s.BroadcastEvent(Event{Type: "action.step.started", Properties: map[string]interface{}{"runId": runID, "stepId": stepID, "command": command, "index": 0}, Timestamp: time.Now()})
		s.BroadcastEvent(Event{Type: "action.command.started", Properties: map[string]interface{}{"runId": runID, "stepId": stepID, "commandId": commandID, "command": command, "index": 0}, Timestamp: time.Now()})

		recorder := &actionResponseWriter{ResponseWriter: w}
		next(recorder, r)
		status := recorder.status
		if status == 0 {
			status = http.StatusOK
		}
		if recorder.body.Len() > 0 {
			stream := "stdout"
			if status >= http.StatusBadRequest {
				stream = "stderr"
			}
			s.emitActionOutput(runID, stepID, commandID, command, recorder.body.String(), stream)
		}
		final := actionrun.StatusCompleted
		if status >= http.StatusBadRequest {
			final = actionrun.StatusFailed
			message := fmt.Sprintf("HTTP %d", status)
			s.BroadcastEvent(Event{Type: "action.command.failed", Properties: map[string]interface{}{"runId": runID, "stepId": stepID, "commandId": commandID, "error": message}, Timestamp: time.Now()})
			s.BroadcastEvent(Event{Type: "action.step.failed", Properties: map[string]interface{}{"runId": runID, "stepId": stepID, "error": message}, Timestamp: time.Now()})
		} else {
			s.BroadcastEvent(Event{Type: "action.command.completed", Properties: map[string]interface{}{"runId": runID, "stepId": stepID, "commandId": commandID}, Timestamp: time.Now()})
			s.BroadcastEvent(Event{Type: "action.step.completed", Properties: map[string]interface{}{"runId": runID, "stepId": stepID}, Timestamp: time.Now()})
		}
		s.finishAction(runID, final)
		s.BroadcastEvent(Event{Type: "action.completed", Properties: map[string]interface{}{"runId": runID, "status": final}, Timestamp: time.Now()})
	}
}
