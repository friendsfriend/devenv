package server

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/friendsfriend/devenv/pkg/app"
	"github.com/friendsfriend/devenv/pkg/resources"
)

// handleBuild triggers a build operation for an app
func (s *Server) handleBuild(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondMethodNotAllowed(w)
		return
	}

	// Parse request body
	var req struct {
		Ident    string `json:"ident"`
		TargetID string `json:"targetId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondBadRequest(w, "Invalid request body")
		return
	}

	if req.Ident == "" {
		respondBadRequest(w, "ident field required")
		return
	}

	// Find the app
	var targetApp *app.App
	targetApp = s.findAppByIdent(req.Ident)

	if targetApp == nil {
		respondNotFound(w, "App not found")
		return
	}

	log.Printf("[INFO] Build started for app: %s", req.Ident)

	// Perform build operation asynchronously using BuildService
	// The BuildService will handle status updates via the status manager
	if req.TargetID != "" {
		go s.services.BuildService().BuildAppTargetWithStatus(targetApp, req.TargetID)
	} else {
		go s.services.BuildService().BuildAppWithStatus(targetApp)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Build started for %s", targetApp.DisplayName),
	})
}

// handleStart triggers a start operation for an app (using docker compose)
func (s *Server) handleStart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondMethodNotAllowed(w)
		return
	}

	var req struct {
		Ident    string `json:"ident"`
		Profile  string `json:"profile"`
		TargetID string `json:"targetId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondBadRequest(w, "Invalid request body")
		return
	}

	if req.Ident == "" {
		respondBadRequest(w, "ident field required")
		return
	}

	// Check if it's an infra service (try ident, then fallback to displayName/containerBaseName case-insensitive)
	infraService := s.findInfraServiceByIdent(req.Ident)
	if infraService == nil {
		// fallback matching
		lc := strings.ToLower(req.Ident)
		for i := range s.infraServices {
			if strings.ToLower(s.infraServices[i].DisplayName) == lc || strings.ToLower(s.infraServices[i].ContainerBaseName) == lc {
				infraService = &s.infraServices[i]
				break
			}
		}
	}
	if infraService != nil {
		if s.services.OperationsService() != nil {
			log.Printf("[INFO] Starting infrastructure service: %s", req.Ident)
			go s.services.OperationsService().StartInfrastructureServiceWithStatus(*infraService)
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": true,
				"message": fmt.Sprintf("Infrastructure service start initiated for %s", infraService.DisplayName),
			})
			return
		}
		respondServiceUnavailable(w, "Operations service not available")
		return
	}

	var targetApp *app.App
	targetApp = s.findAppByIdent(req.Ident)
	if targetApp == nil {
		// fallback: try matching by displayName (case-insensitive)
		lc := strings.ToLower(req.Ident)
		for i := range s.apps {
			if strings.ToLower(s.apps[i].DisplayName) == lc {
				targetApp = &s.apps[i]
				break
			}
		}
	}

	if targetApp == nil {
		respondNotFound(w, "App not found")
		return
	}

	log.Printf("[INFO] Run initiated for app: %s", req.Ident)

	// Check for missing env vars before starting compose.
	var missingEnvVars []string
	if req.TargetID == "" {
		missingEnvVars = s.services.BuildService().ComposeMissingEnvVars(targetApp.Ident, targetApp.LocalDirectoryPath, req.Profile)
	}

	if req.TargetID != "" {
		go s.services.BuildService().RunAppTargetWithStatus(targetApp, req.TargetID)
	} else {
		go s.services.BuildService().RunAppWithStatus(targetApp, req.Profile)
	}

	resp := map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Run initiated for %s", targetApp.DisplayName),
	}
	if len(missingEnvVars) > 0 {
		resp["missingEnvVars"] = missingEnvVars
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// handleTest triggers a test operation for an app
func (s *Server) handleTest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondMethodNotAllowed(w)
		return
	}

	var req struct {
		Ident    string `json:"ident"`
		TargetID string `json:"targetId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondBadRequest(w, "Invalid request body")
		return
	}

	if req.Ident == "" {
		respondBadRequest(w, "ident field required")
		return
	}

	var targetApp *app.App
	targetApp = s.findAppByIdent(req.Ident)

	if targetApp == nil {
		respondNotFound(w, "App not found")
		return
	}

	log.Printf("[INFO] Test started for app: %s", req.Ident)

	if req.TargetID != "" {
		go s.services.BuildService().TestAppTargetWithStatus(targetApp, req.TargetID)
	} else {
		go s.services.BuildService().TestAppWithStatus(targetApp)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Test started for %s", targetApp.DisplayName),
	})
}

// handleRun triggers a run operation for an app (using docker compose)
func (s *Server) handleRun(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondMethodNotAllowed(w)
		return
	}

	var req struct {
		Ident    string `json:"ident"`
		Profile  string `json:"profile"`
		TargetID string `json:"targetId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondBadRequest(w, "Invalid request body")
		return
	}

	if req.Ident == "" {
		respondBadRequest(w, "ident field required")
		return
	}

	var targetApp *app.App
	targetApp = s.findAppByIdent(req.Ident)

	if targetApp == nil {
		respondNotFound(w, "App not found")
		return
	}

	log.Printf("[INFO] Run initiated for app: %s", req.Ident)

	if req.TargetID != "" {
		go s.services.BuildService().RunAppTargetWithStatus(targetApp, req.TargetID)
	} else {
		go s.services.BuildService().RunAppWithStatus(targetApp, req.Profile)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Run initiated for %s", targetApp.DisplayName),
	})
}

func (s *Server) handleShellActionScript(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodPut {
		respondMethodNotAllowed(w)
		return
	}

	var req struct {
		Ident   string `json:"ident"`
		Action  string `json:"action"`
		Profile string `json:"profile"`
		Command string `json:"command"`
		Runtime string `json:"runtime"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondBadRequest(w, "Invalid request body")
		return
	}
	if req.Ident == "" || req.Action == "" {
		respondBadRequest(w, "ident and action fields required")
		return
	}
	if s.findAppByIdent(req.Ident) == nil {
		respondNotFound(w, "App not found")
		return
	}
	if req.Runtime == "" {
		req.Runtime = string(resources.ActionRuntimeShell)
	}
	var path string
	var err error
	switch resources.ActionRuntime(req.Runtime) {
	case resources.ActionRuntimeShell:
		path, err = s.services.ResourcesManager().WriteShellActionScript(req.Ident, resources.AppAction(req.Action), req.Profile, req.Command)
	case resources.ActionRuntimePowerShell:
		path, err = s.services.ResourcesManager().WritePowerShellActionScript(req.Ident, resources.AppAction(req.Action), req.Profile, req.Command)
	default:
		respondErrorMessage(w, "unsupported action runtime "+req.Runtime, http.StatusBadRequest)
		return
	}
	if err != nil {
		respondErrorMessage(w, err.Error(), http.StatusBadRequest)
		return
	}
	respondJSON(w, map[string]interface{}{"success": true, "path": path}, http.StatusOK)
}

func (s *Server) handleGetActionTargets(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondMethodNotAllowed(w)
		return
	}

	ident := r.PathValue("ident")
	action := r.PathValue("action")
	if ident == "" || action == "" {
		respondBadRequest(w, "ident and action path parameters required")
		return
	}

	targetApp := s.findAppByIdent(ident)
	if targetApp == nil {
		respondNotFound(w, "App not found")
		return
	}

	targets, err := s.services.ResourcesManager().DiscoverActionTargets(targetApp.Ident, targetApp.LocalDirectoryPath, resources.AppAction(action))
	if err != nil {
		respondInternalError(w, err)
		return
	}
	if targets == nil {
		targets = []resources.ActionTarget{}
	}

	respondJSON(w, map[string]interface{}{"targets": targets}, http.StatusOK)
}

func (s *Server) handleGetProfiles(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondMethodNotAllowed(w)
		return
	}

	ident := r.PathValue("ident")
	if ident == "" {
		respondBadRequest(w, "ident path parameter required")
		return
	}

	var targetApp *app.App
	targetApp = s.findAppByIdent(ident)

	// If not an app, check if it's an infrastructure service — for infra services
	// we don't have profiles, but the UI may request profiles before starting.
	// Return an empty profile list and hasDockerfile=false for infra services
	// so the profile picker won't error out.
	if targetApp == nil {
		if infra := s.findInfraServiceByIdent(ident); infra != nil {
			w.Header().Set("Content-Type", "application/json")
			// Infrastructure services do not have profile variants or repo Dockerfiles,
			// but the TUI expects the `hasDockerfile` flag to control whether the
			// "default (no profile)" option is shown. Return hasDockerfile=true so
			// the picker shows the default option and users can proceed to start the
			// infra service without selecting a profile.
			json.NewEncoder(w).Encode(map[string]interface{}{
				"profiles":      []string{},
				"hasDockerfile": true,
			})
			return
		}
		respondNotFound(w, "App not found")
		return
	}

	profiles, err := s.services.ResourcesManager().DiscoverProfiles(targetApp.Ident, targetApp.LocalDirectoryPath)
	if err != nil {
		respondInternalError(w, err)
		return
	}
	if profiles == nil {
		profiles = []string{}
	}

	_, dfErr := s.services.ResourcesManager().ResolveDockerfileForAction(targetApp.Ident, targetApp.LocalDirectoryPath, resources.ActionBuild)
	hasDockerfile := dfErr == nil

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"profiles":      profiles,
		"hasDockerfile": hasDockerfile,
	})
}

func (s *Server) handleStopApp(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondMethodNotAllowed(w)
		return
	}
	var req struct {
		Ident    string `json:"ident"`
		TargetID string `json:"targetId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondBadRequest(w, "Invalid request body")
		return
	}
	if req.Ident == "" {
		respondBadRequest(w, "ident field required")
		return
	}
	targetApp := s.findAppByIdent(req.Ident)
	if targetApp == nil {
		respondNotFound(w, "App not found")
		return
	}
	go s.services.BuildService().StopAppWithStatus(targetApp, req.TargetID)
	respondJSON(w, map[string]interface{}{"success": true, "message": fmt.Sprintf("Stop initiated for %s", targetApp.DisplayName)}, http.StatusOK)
}
