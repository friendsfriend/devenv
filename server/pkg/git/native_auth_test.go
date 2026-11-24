package git

import (
	"encoding/base64"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"github.com/friendsfriend/devenv/internal/gittest"
)

type nativeTestAuth struct {
	username string
	token    string
	url      string
}

func (auth *nativeTestAuth) GetUsername() string { return auth.username }
func (auth *nativeTestAuth) GetToken() string    { return auth.token }
func (auth *nativeTestAuth) CredentialsFor(repoURL string) (string, string) {
	auth.url = repoURL
	return auth.username, auth.token
}

type nativeTestApp struct {
	url  string
	path string
}

func (a nativeTestApp) GetIdent() string              { return "test-app" }
func (a nativeTestApp) GetRepositoryPath() string     { return a.url }
func (a nativeTestApp) GetLocalDirectoryPath() string { return a.path }
func (a nativeTestApp) GetBranch() string             { return "main" }
func (a nativeTestApp) GetMainWorktreeBranch() string { return "main" }

func TestNativeAuthEnvironmentAndRedaction(t *testing.T) {
	provider := &nativeTestAuth{username: "test-user", token: "test-only-token"}
	gr := NewRepository(provider).(*gitRepository)
	auth, err := gr.NativeAuthFor("https://gitlab.example/group/app.git")
	if err != nil {
		t.Fatal(err)
	}
	env, err := auth.Environment([]string{
		"PATH=test-path", "GIT_CONFIG_COUNT=1",
		"GIT_CONFIG_KEY_0=test.inherited", "GIT_CONFIG_VALUE_0=retained",
		"GIT_TERMINAL_PROMPT=1",
		"GIT_TRACE_CURL=secret-trace.log", "GIT_TRACE2_ENV_VARS=GIT_CONFIG_VALUE_2",
	})
	if err != nil {
		t.Fatal(err)
	}
	joined := strings.Join(env, "\n")
	for _, expected := range []string{
		"PATH=test-path", "GIT_CONFIG_COUNT=5", "GIT_CONFIG_KEY_0=test.inherited",
		"GIT_CONFIG_VALUE_0=retained", "GIT_TERMINAL_PROMPT=0",
		"http.https://gitlab.example/group/app.git.extraHeader",
		"credential.https://gitlab.example/group/app.git.helper",
	} {
		if !strings.Contains(joined, expected) {
			t.Errorf("missing configuration %q", expected)
		}
	}
	if strings.Contains(joined, "GIT_TERMINAL_PROMPT=1") {
		t.Fatal("inherited prompt setting was not replaced")
	}
	if strings.Contains(joined, "secret-trace.log") || strings.Contains(joined, "GIT_TRACE2_ENV_VARS") || !strings.Contains(joined, "GIT_TRACE2_EVENT=0") {
		t.Fatal("Git tracing could bypass output redaction")
	}
	encoded := base64.StdEncoding.EncodeToString([]byte(provider.username + ":" + provider.token))
	redacted := auth.Redact(provider.token + " " + encoded + " Authorization: Basic " + encoded)
	if strings.Contains(redacted, provider.token) || strings.Contains(redacted, encoded) {
		t.Fatal("credentials survived redaction")
	}
	cause := errors.New("failed with " + provider.token)
	if redactedErr := auth.RedactError(cause); strings.Contains(redactedErr.Error(), provider.token) || !errors.Is(redactedErr, cause) {
		t.Fatal("redaction did not preserve error identity")
	}
	for _, count := range []string{"bad", "-1"} {
		if _, err := auth.Environment([]string{"GIT_CONFIG_COUNT=" + count}); err == nil {
			t.Errorf("invalid count %q accepted", count)
		}
	}
}

func TestNativeAuthPreservesNonHTTPAndPublicRepositories(t *testing.T) {
	for _, repoURL := range []string{"git@gitlab.example:group/app.git", "ssh://git@gitlab.example/group/app.git", "file:///tmp/app.git", filepath.Join(t.TempDir(), "app.git")} {
		t.Run(repoURL, func(t *testing.T) {
			provider := &nativeTestAuth{username: "user", token: "test-only-token"}
			auth, err := NewRepository(provider).(*gitRepository).NativeAuthFor(repoURL)
			if err != nil {
				t.Fatal(err)
			}
			env, err := auth.Environment([]string{"PATH=unchanged"})
			if err != nil || len(env) != 1 || provider.url != "" {
				t.Fatal("non-HTTP credentials or environment were changed")
			}
		})
	}
	auth, err := NewRepository(&nativeTestAuth{}).(*gitRepository).NativeAuthFor("https://github.com/public/app.git")
	if err != nil || auth.header != "" {
		t.Fatal("credential-free repository received authentication")
	}
	for _, provider := range []*nativeTestAuth{{username: "user"}, {token: "test-only-token"}, {username: "user:invalid", token: "test-only-token"}} {
		if _, err := NewRepository(provider).(*gitRepository).NativeAuthFor("https://gitlab.example/app.git"); err == nil {
			t.Fatal("invalid credentials were accepted")
		}
	}
}

func TestRecordedGitOperationsUseProviderCredentials(t *testing.T) {
	remote := gittest.NewRemote(t)
	provider := &nativeTestAuth{username: remote.Username, token: remote.Token}
	gr := NewRepository(provider).(*gitRepository)
	t.Setenv("GIT_CONFIG_COUNT", "1")
	t.Setenv("GIT_CONFIG_KEY_0", "http."+remote.URL+".extraHeader")
	t.Setenv("GIT_CONFIG_VALUE_0", "Authorization: Basic "+base64.StdEncoding.EncodeToString([]byte("stale-user:stale-test-token")))
	application := nativeTestApp{url: remote.URL, path: filepath.Join(t.TempDir(), "parent", "checkout")}
	var steps []ActionStep
	gr.SetActionRecorder(func(step ActionStep) { steps = append(steps, step) })
	if err := gr.Checkout(application, "main"); err != nil {
		t.Fatal(err)
	}
	if len(steps) != 1 || steps[0].ExitCode != 0 || !strings.Contains(steps[0].Command, "clone") {
		t.Fatalf("checkout steps = %#v", steps)
	}
	remote.Commit(remote.Seed, "remote update")
	remote.Command(remote.Seed, "push", remote.Bare, "main")
	steps = nil
	if err := gr.Fetch(application); err != nil {
		t.Fatal(err)
	}
	if len(steps) != 1 {
		t.Fatalf("fetch recorded %d steps", len(steps))
	}
	steps = nil
	if err := gr.Pull(application); err != nil {
		t.Fatal(err)
	}
	if len(steps) != 3 {
		t.Fatalf("pull recorded %d steps", len(steps))
	}
	if got := remote.Command(application.path, "rev-parse", "HEAD"); got != remote.Command(remote.Seed, "rev-parse", "HEAD") {
		t.Fatal("pull did not update the checkout")
	}
	remote.Commit(application.path, "local update")
	steps = nil
	if err := gr.Push(application); err != nil {
		t.Fatal(err)
	}
	if len(steps) != 1 || remote.Command(remote.Bare, "rev-parse", "main") != remote.Command(application.path, "rev-parse", "HEAD") {
		t.Fatal("push did not update remote")
	}
	if provider.url != remote.URL || remote.Authenticated.Load() == 0 {
		t.Fatal("per-URL credentials were not used")
	}
	config, err := os.ReadFile(filepath.Join(application.path, ".git", "config"))
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(config), remote.Token) || strings.Contains(string(config), "extraheader") {
		t.Fatal("authentication persisted in repository configuration")
	}
	for _, step := range steps {
		if strings.Contains(step.Command+step.Stdout+step.Stderr, remote.Token) {
			t.Fatal("credentials leaked into action history")
		}
	}
	provider.token = "wrong-test-token"
	steps = nil
	if err := gr.Fetch(application); err == nil || len(steps) != 1 || steps[0].ExitCode == 0 || steps[0].Err == nil {
		t.Fatal("authentication failure was not recorded faithfully")
	}
}

func TestRecordedPrimaryCloneUsesAuthenticationAndDefaultBranchFallback(t *testing.T) {
	remote := gittest.NewRemote(t)
	gr := NewRepository(&nativeTestAuth{username: remote.Username, token: remote.Token}).(*gitRepository)
	var steps []ActionStep
	gr.SetActionRecorder(func(step ActionStep) { steps = append(steps, step) })
	application := nativeTestApp{url: remote.URL}
	branch, err := gr.cloneIntoPrimaryWorktree(application, filepath.Join(t.TempDir(), "primary"), "missing-branch")
	if err != nil {
		t.Fatal(err)
	}
	if branch != "main" || len(steps) != 2 || steps[0].ExitCode == 0 || steps[1].ExitCode != 0 {
		t.Fatalf("fallback branch=%q, steps=%#v", branch, steps)
	}
}

func TestNativeAuthURLScopeAndRedirectIsolation(t *testing.T) {
	remote := gittest.NewRemote(t)
	gr := NewRepository(&nativeTestAuth{username: remote.Username, token: remote.Token}).(*gitRepository)
	auth, err := gr.NativeAuthFor(remote.URL + "/different-repository")
	if err != nil {
		t.Fatal(err)
	}
	_, _, err = gr.runGitCommandWithAuth(auth, t.TempDir(), "ls-remote", remote.URL)
	if err == nil || remote.Authenticated.Load() != 0 {
		t.Fatal("credentials were sent outside their repository URL scope")
	}
	redirect := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, remote.URL+"/info/refs?service=git-upload-pack", http.StatusFound)
	}))
	defer redirect.Close()
	auth, err = gr.NativeAuthFor(redirect.URL + "/redirect.git")
	if err != nil {
		t.Fatal(err)
	}
	_, _, err = gr.runGitCommandWithAuth(auth, t.TempDir(), "ls-remote", redirect.URL+"/redirect.git")
	if err == nil || remote.Authenticated.Load() != 0 {
		t.Fatal("authenticated Git followed a redirect to another remote")
	}
}

func TestNativeAuthRecordedOutputIsRedacted(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Fatal(err)
	}
	gr := NewRepository(&nativeTestAuth{username: "test-user", token: "test-only-token"}).(*gitRepository)
	auth, err := gr.NativeAuthFor("https://gitlab.example/app.git")
	if err != nil {
		t.Fatal(err)
	}
	var step ActionStep
	gr.SetActionRecorder(func(recorded ActionStep) { step = recorded })
	stdout, _, err := gr.runGitCommandWithAuth(auth, t.TempDir(), "config", "--get", "http.https://gitlab.example/app.git.extraHeader")
	if err != nil || strings.Contains(stdout+step.Stdout, auth.token) || strings.Contains(stdout+step.Stdout, strings.TrimPrefix(auth.header, "Authorization: Basic ")) {
		t.Fatalf("authentication output not redacted: %v", err)
	}
}
