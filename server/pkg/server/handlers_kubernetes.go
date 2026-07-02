package server

import "net/http"

func (s *Server) handleKubernetesLogs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondMethodNotAllowed(w)
		return
	}
	appIdent := r.URL.Query().Get("appIdent")
	if appIdent == "" {
		respondBadRequest(w, "appIdent parameter required")
		return
	}
	appObj := s.findAppByIdent(appIdent)
	if appObj == nil {
		respondNotFound(w, "App not found")
		return
	}
	logs, err := s.services.BuildService().KubernetesRunLogs(appIdent, appObj.LocalDirectoryPath)
	if err != nil {
		respondErrorMessage(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	_, _ = w.Write([]byte(logs))
}
