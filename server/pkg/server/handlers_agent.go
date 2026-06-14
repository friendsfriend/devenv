package server

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os/exec"
	"regexp"
	"strings"
	"time"
)

// agentSpaceResponse is the JSON shape returned by /api/agent-spaces.
type agentSpaceResponse struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	RepoDirs    []string `json:"repoDirs"`
	HasAgent    bool     `json:"hasAgent"`
}

type agentSessionInfo struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	TimeCreated int64  `json:"timeCreated"`
	TimeUpdated int64  `json:"timeUpdated"`
}

type agentGroup struct {
	Name     string             `json:"name"`
	Model    string             `json:"model"`
	Sessions []agentSessionInfo `json:"sessions"`
}

// handleGetAgentSpaces dynamically discovers agent spaces from the agents config directory.
func (s *Server) handleGetAgentSpaces(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondMethodNotAllowed(w)
		return
	}

	rm := s.services.ResourcesManager()
	discovered, err := rm.DiscoverAgentSpaces()
	if err != nil {
		log.Printf("[WARN] Failed to discover agent spaces: %v", err)
		respondJSON(w, map[string]interface{}{"spaces": []agentSpaceResponse{}}, http.StatusOK)
		return
	}

	spaces := make([]agentSpaceResponse, 0, len(discovered))
	for _, d := range discovered {
		spaces = append(spaces, agentSpaceResponse{
			ID:       d.ID,
			Name:     d.ID,
			HasAgent: true,
		})
	}
	respondJSON(w, map[string]interface{}{"spaces": spaces}, http.StatusOK)
}

type rawAgentSession struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Agent       string `json:"agent"`
	Model       string `json:"model"`
	TimeCreated int64  `json:"time_created"`
	TimeUpdated int64  `json:"time_updated"`
}

func groupRawAgentSessions(rawRows []rawAgentSession) []agentGroup {
	if len(rawRows) == 0 {
		return []agentGroup{}
	}

	groupsByName := make(map[string]*agentGroup)
	groupOrder := make([]string, 0)

	for _, row := range rawRows {
		agentName := strings.TrimSpace(row.Agent)
		if agentName == "" {
			agentName = "Unknown Agent"
		}

		model := strings.TrimSpace(row.Model)

		group, exists := groupsByName[agentName]
		if !exists {
			group = &agentGroup{
				Name:     agentName,
				Model:    model,
				Sessions: make([]agentSessionInfo, 0),
			}
			groupsByName[agentName] = group
			groupOrder = append(groupOrder, agentName)
		}

		if group.Model == "" && model != "" {
			group.Model = model
		}

		group.Sessions = append(group.Sessions, agentSessionInfo{
			ID:          row.ID,
			Title:       row.Title,
			TimeCreated: row.TimeCreated,
			TimeUpdated: row.TimeUpdated,
		})
	}

	result := make([]agentGroup, 0, len(groupOrder))
	for _, name := range groupOrder {
		if group := groupsByName[name]; group != nil {
			result = append(result, *group)
		}
	}

	if len(result) == 0 {
		return []agentGroup{}
	}

	return result
}

func (s *Server) queryAgentSessions() ([]agentGroup, error) {
	if _, err := exec.LookPath("opencode"); err != nil {
		return nil, fmt.Errorf("opencode not found in PATH")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pathCmd := exec.CommandContext(ctx, "opencode", "db", "path")
	pathOut, err := pathCmd.Output()
	if err != nil {
		return nil, fmt.Errorf("opencode db path failed: %w", err)
	}
	dbPath := strings.TrimSpace(string(pathOut))
	if dbPath == "" {
		return nil, fmt.Errorf("opencode db path returned empty path")
	}

	query := "SELECT s.id, s.title, json_extract(m.data, '$.agent') as agent, json_extract(m.data, '$.modelID') as model, s.time_created, s.time_updated FROM session s JOIN message m ON m.session_id = s.id AND json_extract(m.data, '$.role') = 'assistant' WHERE s.parent_id IS NULL GROUP BY s.id HAVING m.id = MAX(m.id) ORDER BY s.time_updated DESC"

	ctx2, cancel2 := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel2()

	cmd := exec.CommandContext(ctx2, "sqlite3", dbPath, "--json", query)
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		if ctx2.Err() == context.DeadlineExceeded {
			return nil, fmt.Errorf("sqlite3 query timed out after 10s")
		}
		if stderr.Len() > 0 {
			return nil, fmt.Errorf("sqlite3 query failed: %s", strings.TrimSpace(stderr.String()))
		}
		return nil, fmt.Errorf("sqlite3 query failed: %w", err)
	}

	var rawRows []rawAgentSession
	if err := json.Unmarshal(stdout.Bytes(), &rawRows); err != nil {
		return nil, fmt.Errorf("failed to parse sqlite3 output: %w", err)
	}

	return groupRawAgentSessions(rawRows), nil
}

func queryOpencodeAgents() ([]string, error) {
	if _, err := exec.LookPath("opencode"); err != nil {
		return nil, fmt.Errorf("opencode not found in PATH")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "opencode", "agent", "list")
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			return nil, fmt.Errorf("opencode agent list timed out after 10s")
		}
		if stderr.Len() > 0 {
			return nil, fmt.Errorf("opencode agent list failed: %s", strings.TrimSpace(stderr.String()))
		}
		return nil, fmt.Errorf("opencode agent list failed: %w", err)
	}

	var agents []string
	for _, line := range strings.Split(stdout.String(), "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		// Only accept agent header lines of the form "<name> (<type>)".
		// Skip JSON fragments ({, [, }, ], "), numeric values, etc.
		firstChar := line[0]
		if firstChar == '{' || firstChar == '[' || firstChar == '}' || firstChar == ']' || firstChar == '"' {
			continue
		}
		if !strings.Contains(line, " (") {
			continue
		}
		typeStart := strings.Index(line, "(")
		typeEnd := strings.Index(line, ")")
		if typeStart == -1 || typeEnd == -1 || typeEnd <= typeStart {
			continue
		}
		if line[typeStart+1:typeEnd] == "subagent" {
			continue
		}
		name := strings.SplitN(line, " ", 2)[0]
		if name != "" {
			agents = append(agents, name)
		}
	}

	if agents == nil {
		agents = []string{}
	}
	return agents, nil
}

func (s *Server) handleGetOpencodeAgents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondMethodNotAllowed(w)
		return
	}

	agents, err := queryOpencodeAgents()
	if err != nil {
		log.Printf("[WARN] Failed to list opencode agents: %v", err)
		respondJSON(w, map[string]interface{}{"agents": []string{}}, http.StatusOK)
		return
	}

	respondJSON(w, map[string]interface{}{"agents": agents}, http.StatusOK)
}

func (s *Server) handleGetAgentSessions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondMethodNotAllowed(w)
		return
	}

	groups, err := s.queryAgentSessions()
	if err != nil {
		respondInternalError(w, err)
		return
	}

	respondJSON(w, map[string]interface{}{"agents": groups}, http.StatusOK)
}

// handleExtractAgentFile returns the path to the opencode agent .md file for
// the given space id from the config directory.
// POST /api/agent-spaces/{id}/extract-agent
func (s *Server) handleExtractAgentFile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondMethodNotAllowed(w)
		return
	}

	spaceID := r.PathValue("id")
	if spaceID == "" {
		respondBadRequest(w, "missing space id")
		return
	}

	rm := s.services.ResourcesManager()
	_, err := rm.AgentFilePath(spaceID)
	if err != nil {
		respondNotFound(w, err.Error())
		return
	}

	respondJSON(w, map[string]interface{}{
		"agentsDir": rm.AgentsDir(),
		"agentId":   spaceID,
	}, http.StatusOK)
}

// handleExtractOpencodeConfig returns the path to opencode.json in the config directory.
// POST /api/opencode-config/extract
func (s *Server) handleExtractOpencodeConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondMethodNotAllowed(w)
		return
	}

	rm := s.services.ResourcesManager()
	configPath, err := rm.OpencodeConfigPath()
	if err != nil {
		respondInternalError(w, err)
		return
	}

	respondJSON(w, map[string]interface{}{
		"configPath": configPath,
	}, http.StatusOK)
}

func slugify(s string) string {
	s = strings.ToLower(s)
	reg := regexp.MustCompile(`[^a-z0-9]+`)
	s = reg.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	return s
}

func extractHostFromURL(rawURL string) string {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return ""
	}
	return parsed.Hostname()
}
