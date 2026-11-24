package gittest

import (
	"net/http"
	"net/http/cgi"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"sync/atomic"
	"testing"
)

// Remote is a disposable smart-HTTP Git server requiring test-only credentials.
type Remote struct {
	URL           string
	Username      string
	Token         string
	Seed          string
	Bare          string
	Authenticated atomic.Int64
	t             testing.TB
}

func NewRemote(t testing.TB) *Remote {
	t.Helper()
	t.Setenv("GIT_CONFIG_GLOBAL", os.DevNull)
	t.Setenv("GIT_CONFIG_NOSYSTEM", "1")
	t.Setenv("GIT_CONFIG_COUNT", "0")
	t.Setenv("GIT_ASKPASS", "")
	t.Setenv("GIT_TERMINAL_PROMPT", "0")
	root := t.TempDir()
	remote := &Remote{
		Username: "test-user", Token: "test-only-token",
		Seed: filepath.Join(root, "seed"), Bare: filepath.Join(root, "remote.git"), t: t,
	}
	remote.Command(root, "init", "-q", "-b", "main", remote.Seed)
	remote.Commit(remote.Seed, "initial")
	remote.Command(root, "clone", "-q", "--bare", remote.Seed, remote.Bare)
	remote.Command(remote.Bare, "config", "http.receivepack", "true")
	bin, err := exec.LookPath("git")
	if err != nil {
		t.Fatal(err)
	}
	backend := &cgi.Handler{
		Path: bin, Args: []string{"http-backend"},
		Env: []string{"GIT_PROJECT_ROOT=" + root, "GIT_HTTP_EXPORT_ALL=1"},
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		username, token, ok := r.BasicAuth()
		if !ok || username != remote.Username || token != remote.Token {
			w.Header().Set("WWW-Authenticate", `Basic realm="git-test"`)
			http.Error(w, "authentication required", http.StatusUnauthorized)
			return
		}
		remote.Authenticated.Add(1)
		backend.ServeHTTP(w, r)
	}))
	t.Cleanup(server.Close)
	remote.URL = server.URL + "/remote.git"
	return remote
}

func (remote *Remote) Command(dir string, args ...string) string {
	remote.t.Helper()
	prefix := []string{"-C", dir}
	if dir == remote.Bare {
		prefix = []string{"--git-dir=" + dir}
	}
	cmd := exec.Command("git", append(prefix, args...)...)
	out, err := cmd.CombinedOutput()
	if err != nil {
		remote.t.Fatalf("git %v: %v: %s", args, err, out)
	}
	return string(out)
}

func (remote *Remote) Commit(dir, content string) {
	remote.t.Helper()
	if err := os.WriteFile(filepath.Join(dir, "file.txt"), []byte(content), 0600); err != nil {
		remote.t.Fatal(err)
	}
	remote.Command(dir, "add", "file.txt")
	remote.Command(dir, "-c", "user.name=Git Test", "-c", "user.email=git-test@example.invalid", "commit", "-q", "-m", content)
}
