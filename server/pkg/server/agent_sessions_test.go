package server

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHandleGetAgentSessions_MethodNotAllowed(t *testing.T) {
	s := &Server{}

	for _, method := range []string{http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodPatch} {
		t.Run(method, func(t *testing.T) {
			req := httptest.NewRequest(method, "/api/agent-sessions", nil)
			rec := httptest.NewRecorder()
			s.handleGetAgentSessions(rec, req)

			if rec.Code != http.StatusMethodNotAllowed {
				t.Fatalf("expected 405 for %s, got %d", method, rec.Code)
			}
		})
	}
}

func TestHandleGetAgentSessions_ContentType(t *testing.T) {
	s := &Server{}

	req := httptest.NewRequest(http.MethodGet, "/api/agent-sessions", nil)
	rec := httptest.NewRecorder()
	s.handleGetAgentSessions(rec, req)

	ct := rec.Header().Get("Content-Type")
	if ct != "application/json" {
		t.Fatalf("expected Content-Type application/json, got %q", ct)
	}
}

func TestGroupAgentSessions_Empty(t *testing.T) {
	groups := groupRawAgentSessions(nil)
	if len(groups) != 0 {
		t.Fatalf("expected 0 groups, got %d", len(groups))
	}
	groups = groupRawAgentSessions([]rawAgentSession{})
	if len(groups) != 0 {
		t.Fatalf("expected 0 groups for empty slice, got %d", len(groups))
	}
}

func TestGroupAgentSessions_SingleAgent(t *testing.T) {
	rows := []rawAgentSession{
		{ID: "s1", Title: "Session 1", Agent: "Sisyphus", Model: "claude-opus-4", TimeCreated: 1000, TimeUpdated: 2000},
		{ID: "s2", Title: "Session 2", Agent: "Sisyphus", Model: "claude-opus-4", TimeCreated: 1100, TimeUpdated: 2100},
	}

	groups := groupRawAgentSessions(rows)

	if len(groups) != 1 {
		t.Fatalf("expected 1 group, got %d", len(groups))
	}
	if groups[0].Name != "Sisyphus" {
		t.Errorf("expected group name 'Sisyphus', got %q", groups[0].Name)
	}
	if groups[0].Model != "claude-opus-4" {
		t.Errorf("expected model 'claude-opus-4', got %q", groups[0].Model)
	}
	if len(groups[0].Sessions) != 2 {
		t.Fatalf("expected 2 sessions, got %d", len(groups[0].Sessions))
	}
	if groups[0].Sessions[0].ID != "s1" || groups[0].Sessions[1].ID != "s2" {
		t.Errorf("session order mismatch: %v", groups[0].Sessions)
	}
}

func TestGroupAgentSessions_MultipleAgents(t *testing.T) {
	rows := []rawAgentSession{
		{ID: "s1", Title: "A", Agent: "Alpha", Model: "model-a", TimeCreated: 100, TimeUpdated: 200},
		{ID: "s2", Title: "B", Agent: "Beta", Model: "model-b", TimeCreated: 110, TimeUpdated: 210},
		{ID: "s3", Title: "C", Agent: "Alpha", Model: "model-a", TimeCreated: 120, TimeUpdated: 220},
	}

	groups := groupRawAgentSessions(rows)

	if len(groups) != 2 {
		t.Fatalf("expected 2 groups, got %d", len(groups))
	}

	if groups[0].Name != "Alpha" {
		t.Errorf("expected first group 'Alpha', got %q", groups[0].Name)
	}
	if groups[1].Name != "Beta" {
		t.Errorf("expected second group 'Beta', got %q", groups[1].Name)
	}

	if len(groups[0].Sessions) != 2 {
		t.Errorf("Alpha should have 2 sessions, got %d", len(groups[0].Sessions))
	}
	if len(groups[1].Sessions) != 1 {
		t.Errorf("Beta should have 1 session, got %d", len(groups[1].Sessions))
	}
}

func TestGroupAgentSessions_EmptyAgentName(t *testing.T) {
	rows := []rawAgentSession{
		{ID: "s1", Title: "Unnamed", Agent: "", Model: "model-x", TimeCreated: 100, TimeUpdated: 200},
	}

	groups := groupRawAgentSessions(rows)

	if len(groups) != 1 {
		t.Fatalf("expected 1 group, got %d", len(groups))
	}
	if groups[0].Name != "Unknown Agent" {
		t.Errorf("expected 'Unknown Agent', got %q", groups[0].Name)
	}
}

func TestGroupAgentSessions_ModelBackfill(t *testing.T) {
	// If first session for a group has no model, later session should backfill
	rows := []rawAgentSession{
		{ID: "s1", Title: "A", Agent: "Agent", Model: "", TimeCreated: 100, TimeUpdated: 200},
		{ID: "s2", Title: "B", Agent: "Agent", Model: "claude-4", TimeCreated: 110, TimeUpdated: 210},
	}

	groups := groupRawAgentSessions(rows)

	if groups[0].Model != "claude-4" {
		t.Errorf("expected model backfill to 'claude-4', got %q", groups[0].Model)
	}
}

func TestGroupAgentSessions_SessionFields(t *testing.T) {
	rows := []rawAgentSession{
		{ID: "abc123", Title: "My Session", Agent: "Agent", Model: "model", TimeCreated: 1700000000, TimeUpdated: 1700001000},
	}

	groups := groupRawAgentSessions(rows)
	s := groups[0].Sessions[0]

	if s.ID != "abc123" {
		t.Errorf("ID mismatch: %q", s.ID)
	}
	if s.Title != "My Session" {
		t.Errorf("Title mismatch: %q", s.Title)
	}
	if s.TimeCreated != 1700000000 {
		t.Errorf("TimeCreated mismatch: %d", s.TimeCreated)
	}
	if s.TimeUpdated != 1700001000 {
		t.Errorf("TimeUpdated mismatch: %d", s.TimeUpdated)
	}
}

func TestAgentGroupJSON(t *testing.T) {
	group := agentGroup{
		Name:  "TestAgent",
		Model: "test-model",
		Sessions: []agentSessionInfo{
			{ID: "s1", Title: "Session", TimeCreated: 100, TimeUpdated: 200},
		},
	}

	data, err := json.Marshal(group)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}

	var decoded map[string]interface{}
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}

	if decoded["name"] != "TestAgent" {
		t.Errorf("expected json field 'name', got: %v", decoded)
	}
	if decoded["model"] != "test-model" {
		t.Errorf("expected json field 'model', got: %v", decoded)
	}

	sessions, ok := decoded["sessions"].([]interface{})
	if !ok || len(sessions) != 1 {
		t.Fatalf("expected sessions array with 1 element, got: %v", decoded["sessions"])
	}

	sess := sessions[0].(map[string]interface{})
	if sess["id"] != "s1" {
		t.Errorf("expected session id 's1', got %v", sess["id"])
	}
	if sess["title"] != "Session" {
		t.Errorf("expected session title 'Session', got %v", sess["title"])
	}
	if sess["timeCreated"] != float64(100) {
		t.Errorf("expected timeCreated 100, got %v", sess["timeCreated"])
	}
	if sess["timeUpdated"] != float64(200) {
		t.Errorf("expected timeUpdated 200, got %v", sess["timeUpdated"])
	}
}
