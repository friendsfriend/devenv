package server

import (
	"fmt"
	"net/http"
	"os"

	"github.com/friendsfriend/devenv/pkg/app"
)

func (s *Server) handleInfraServiceStart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondMethodNotAllowed(w)
		return
	}
	ident := r.PathValue("ident")
	svc := s.findInfraServiceByIdent(ident)
	if svc == nil {
		respondNotFound(w, "Infrastructure service not found")
		return
	}
	if svc.Type == "" || svc.Type == app.InfraServiceTypeDocker {
		s.services.OperationsService().StartInfrastructureServiceWithStatus(*svc)
		respondJSON(w, map[string]interface{}{"success": true, "action": "started"}, http.StatusOK)
		return
	}
	if svc.Type == app.InfraServiceTypeKubernetes {
		if err := s.services.OperationsService().StartKubernetesInfrastructureServiceWithStatus(*svc); err != nil {
			respondErrorMessage(w, err.Error(), http.StatusBadRequest)
			return
		}
		s.broadcastAppStatus(ident)
		respondJSON(w, map[string]interface{}{"success": true, "action": "started"}, http.StatusOK)
		return
	}
	runner := r.URL.Query().Get("runner")
	if err := s.services.OperationsService().StartScriptInfrastructureServiceWithStatus(*svc, runner); err != nil {
		respondErrorMessage(w, err.Error(), http.StatusBadRequest)
		return
	}
	s.broadcastAppStatus(ident)
	respondJSON(w, map[string]interface{}{"success": true, "action": "started"}, http.StatusOK)
}

func (s *Server) handleInfraServiceStop(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondMethodNotAllowed(w)
		return
	}
	ident := r.PathValue("ident")
	svc := s.findInfraServiceByIdent(ident)
	if svc == nil {
		respondNotFound(w, "Infrastructure service not found")
		return
	}
	if svc.Type == "" || svc.Type == app.InfraServiceTypeDocker {
		respondErrorMessage(w, "Docker infrastructure stop uses container actions", http.StatusBadRequest)
		return
	}
	if svc.Type == app.InfraServiceTypeKubernetes {
		if err := s.services.OperationsService().StopKubernetesInfrastructureServiceWithStatus(*svc); err != nil {
			respondErrorMessage(w, err.Error(), http.StatusBadRequest)
			return
		}
		s.broadcastAppStatus(ident)
		respondJSON(w, map[string]interface{}{"success": true, "action": "stopped"}, http.StatusOK)
		return
	}
	if err := s.services.OperationsService().StopScriptInfrastructureServiceWithStatus(ident); err != nil {
		respondErrorMessage(w, err.Error(), http.StatusBadRequest)
		return
	}
	s.broadcastAppStatus(ident)
	respondJSON(w, map[string]interface{}{"success": true, "action": "stopped"}, http.StatusOK)
}

func (s *Server) handleInfraServiceLogs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondMethodNotAllowed(w)
		return
	}
	ident := r.PathValue("ident")
	svc := s.findInfraServiceByIdent(ident)
	if svc == nil || (svc.Type != app.InfraServiceTypeScript) {
		respondNotFound(w, "Script infrastructure service not found")
		return
	}
	_, logPath := s.services.OperationsService().ScriptInfrastructureStatus(ident)
	if logPath == "" {
		logPath = svc.LogPath
	}
	if logPath == "" {
		respondErrorMessage(w, "No script log path available", http.StatusNotFound)
		return
	}
	content, err := os.ReadFile(logPath)
	if err != nil {
		respondErrorMessage(w, fmt.Sprintf("Failed to read script log: %v", err), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	_, _ = w.Write(content)
}
