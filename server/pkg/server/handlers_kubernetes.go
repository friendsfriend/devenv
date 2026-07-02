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
	var logs string
	var err error
	if appObj != nil {
		logs, err = s.services.BuildService().KubernetesRunLogs(appIdent, appObj.LocalDirectoryPath)
	} else if infra := s.findInfraServiceByIdent(appIdent); infra != nil && infra.Type == "kubernetes" {
		logs, err = s.services.OperationsService().KubernetesInfrastructureLogs(*infra)
	} else {
		respondNotFound(w, "Kubernetes app or infrastructure not found")
		return
	}
	if err != nil {
		respondErrorMessage(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	_, _ = w.Write([]byte(logs))
}
