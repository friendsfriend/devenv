package server

import (
	"io"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestActionRouteCoversSupportedGenericOperations(t *testing.T) {
	for _, path := range []string{"/api/git/pull", "/api/git/worktrees", "/api/kubernetes/cluster/create", "/api/docker/restart"} {
		if !actionRoute(path) {
			t.Fatalf("expected action route %s", path)
		}
	}
	if actionRoute("/api/health") {
		t.Fatal("diagnostic health request must not create action")
	}
}

func TestActionRequestMetadataPreservesBody(t *testing.T) {
	r := httptest.NewRequest("POST", "/api/git/checkout", strings.NewReader(`{"appIdent":"api","branch":"release"}`))
	ident, target := actionRequestMetadata(r)
	if ident != "api" || target != "release" {
		t.Fatalf("metadata = %q, %q", ident, target)
	}
	body, err := io.ReadAll(r.Body)
	if err != nil || !strings.Contains(string(body), "release") {
		t.Fatalf("body not restored: %q, %v", body, err)
	}
}
