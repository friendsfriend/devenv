package server

import "testing"

func TestRoutesHaveUniquePaths(t *testing.T) {
	s := NewServer(0)
	seen := map[string]routeSpec{}
	for _, route := range s.routes() {
		if route.Domain == "" {
			t.Fatalf("route %s missing domain", route.Path)
		}
		if route.Path == "" {
			t.Fatalf("route in domain %s missing path", route.Domain)
		}
		if route.Handler == nil {
			t.Fatalf("route %s has nil handler", route.Path)
		}
		if previous, ok := seen[route.Path]; ok {
			t.Fatalf("duplicate route path %s in domains %s and %s", route.Path, previous.Domain, route.Domain)
		}
		seen[route.Path] = route
	}

	for _, path := range []string{"/api/health", "/api/apps", "/api/gitlab/merge-requests", "/api/github/pull-requests"} {
		if _, ok := seen[path]; !ok {
			t.Fatalf("expected route %s", path)
		}
	}
}
