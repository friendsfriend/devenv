package services

import (
	"path/filepath"
	"strings"
	"testing"

	"github.com/friendsfriend/devenv/pkg/app"
	"github.com/friendsfriend/devenv/pkg/provider"
)

type credentialApps struct {
	app.Manager
	apps []app.App
}

func (manager credentialApps) GetApps() []app.App { return manager.apps }

func TestNativeCredentialsResolveExplicitApplicationProvider(t *testing.T) {
	dir := t.TempDir()
	store := provider.NewStore(filepath.Join(dir, "providers"), filepath.Join(dir, ".env"))
	for _, p := range []provider.Provider{
		{Name: "first", Type: provider.TypeGitLab, Username: "wrong-user", Token: "wrong-test-token"},
		{Name: "selected", Type: provider.TypeGitLab, Username: "selected-user", Token: "selected-test-token"},
		{Name: "public", Type: provider.TypeGitHub},
	} {
		if err := store.Save(p); err != nil {
			t.Fatal(err)
		}
	}
	auth := &multiAuthProvider{providers: store, appManager: credentialApps{apps: []app.App{
		{RepositoryPath: "https://gitlab.example/app.git", Provider: "selected"},
		{RepositoryPath: "https://github.com/public/app.git", Provider: "public"},
		{RepositoryPath: "https://gitlab.example/missing.git", Provider: "missing"},
	}}}
	username, token, err := auth.CredentialsForWithError("https://gitlab.example/app.git")
	if err != nil || username != "selected-user" || token != "selected-test-token" {
		t.Fatal("explicit provider was not selected")
	}
	username, token, err = auth.CredentialsForWithError("https://github.com/public/app.git")
	if err != nil || username != "" || token != "" {
		t.Fatal("public provider did not remain credential-free")
	}
	_, _, err = auth.CredentialsForWithError("https://gitlab.example/missing.git")
	if err == nil || !strings.Contains(err.Error(), "missing") {
		t.Fatal("missing provider fell back to unrelated credentials")
	}
}
