package docker

import "testing"

func TestContainerNameMatchesDockerAndPodmanComposeNames(t *testing.T) {
	cases := []struct {
		name  string
		ident string
		base  string
	}{
		{name: "/postgres-1", ident: "postgres", base: "postgres"},
		{name: "/postgres_1", ident: "postgres", base: "postgres"},
		{name: "/devenv-postgres-1", ident: "postgres", base: "postgres"},
		{name: "/devenv_postgres_1", ident: "postgres", base: "postgres"},
		{name: "devenv_mailpit_1", ident: "mailpit", base: "mailpit"},
	}
	for _, tc := range cases {
		if !ContainerNameMatches(tc.name, tc.ident, tc.base) {
			t.Fatalf("ContainerNameMatches(%q, %q, %q) = false", tc.name, tc.ident, tc.base)
		}
	}
}
