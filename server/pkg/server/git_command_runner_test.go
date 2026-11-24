package server

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/friendsfriend/devenv/internal/gittest"
	"github.com/friendsfriend/devenv/pkg/actiondef"
	"github.com/friendsfriend/devenv/pkg/actionexec"
	"github.com/friendsfriend/devenv/pkg/actionregistry"
	"github.com/friendsfriend/devenv/pkg/actionrun"
	"github.com/friendsfriend/devenv/pkg/app"
	gitpkg "github.com/friendsfriend/devenv/pkg/git"
	"github.com/friendsfriend/devenv/pkg/state"
)

type gitTestServices struct {
	*stubServicesContainer
	store state.Store
}

func (services gitTestServices) StateStore() state.Store { return services.store }

type registryGitAuth struct {
	url      string
	username string
	token    string
}

func (auth registryGitAuth) GetUsername() string { return "wrong-fallback-user" }
func (auth registryGitAuth) GetToken() string    { return "wrong-fallback-token" }
func (auth registryGitAuth) CredentialsFor(repoURL string) (string, string) {
	if repoURL == auth.url {
		return auth.username, auth.token
	}
	return "", ""
}

func TestRegistryGitRemoteActionsUseRuntimeCredentials(t *testing.T) {
	remote := gittest.NewRemote(t)
	checkout := filepath.Join(t.TempDir(), "checkout")
	remote.Command(t.TempDir(), "clone", "-q", remote.Bare, checkout)
	remote.Command(checkout, "remote", "set-url", "origin", remote.URL)
	repository := gitpkg.NewRepository(registryGitAuth{url: remote.URL, username: remote.Username, token: remote.Token})
	definitions := actionregistry.CompileGitActions("app", checkout)
	registry := actionregistry.New()
	if _, err := registry.Rebuild(context.Background(), []actionregistry.Provider{definitionProvider{definitions}}, definitionKinds{actiondef.StepKindCommand: true}); err != nil {
		t.Fatal(err)
	}
	events := make(chan Event, 256)
	store, err := state.Open(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { store.Close() })
	s := &Server{
		apps:              []app.App{{Ident: "app", RepositoryPath: remote.URL, LocalDirectoryPath: checkout, Branch: "main"}},
		services:          gitTestServices{stubServicesContainer: &stubServicesContainer{gitRepository: repository, dockerClient: stubDockerClient{}}, store: store},
		actionDefinitions: registry,
		actionRuns:        actionrun.NewRegistry(),
		actionCoordinator: actionexec.NewCoordinator(nil),
		actionCancels:     map[string]context.CancelFunc{},
		listeners:         map[chan Event]bool{events: true},
		opStatus:          map[string]*OperationStatus{},
	}
	runAction := func(kind actiondef.ActionType, expectedCommands int) {
		t.Helper()
		var definition actiondef.Action
		for _, candidate := range definitions {
			if candidate.ActionType == kind {
				definition = candidate
			}
		}
		runID, err := s.startEngineDefinition(definition, nil)
		if err != nil {
			t.Fatal(err)
		}
		timeout := time.NewTimer(10 * time.Second)
		defer timeout.Stop()
		var seenEvents []Event
		for {
			select {
			case event := <-events:
				seenEvents = append(seenEvents, event)
				if event.Type != "action.completed" {
					continue
				}
				run, ok := s.actionRuns.Get(runID)
				if !ok || run.Status != actionrun.StatusCompleted {
					t.Fatalf("%s failed: %#v", kind, run)
				}
				commandCount := 0
				commandSteps := map[string]bool{}
				for _, commandEvent := range seenEvents {
					if commandEvent.Type != "action.command.started" {
						continue
					}
					properties := commandEvent.Properties.(map[string]any)
					stepID := properties["stepId"].(string)
					if commandSteps[stepID] {
						t.Fatal("multiple commands grouped in one step")
					}
					commandSteps[stepID] = true
					commandCount++
				}
				if commandCount != expectedCommands {
					t.Fatalf("%s recorded %d commands, want %d", kind, commandCount, expectedCommands)
				}
				serialized, err := json.Marshal([]any{run, seenEvents, definition})
				if err != nil {
					t.Fatal(err)
				}
				encoded := base64.StdEncoding.EncodeToString([]byte(remote.Username + ":" + remote.Token))
				if strings.Contains(string(serialized), remote.Token) || strings.Contains(string(serialized), encoded) {
					t.Fatal("credentials leaked into events, history, or definition snapshot")
				}
				if run.DefinitionSnapshot == nil || run.RegistryVersion != registry.Snapshot().Version {
					t.Fatal("registry snapshot was not retained")
				}
				return
			case <-timeout.C:
				t.Fatalf("%s did not finish", kind)
			}
		}
	}
	remote.Commit(remote.Seed, "remote update")
	remote.Command(remote.Seed, "push", remote.Bare, "main")
	runAction("fetch", 1)
	runAction("pull", 3)
	if remote.Command(checkout, "rev-parse", "HEAD") != remote.Command(remote.Seed, "rev-parse", "HEAD") {
		t.Fatal("registry pull did not update checkout")
	}
	remote.Commit(checkout, "local update")
	runAction("push", 1)
	if remote.Command(remote.Bare, "rev-parse", "main") != remote.Command(checkout, "rev-parse", "HEAD") {
		t.Fatal("registry push did not update remote")
	}
}

type leakingCommandRunner struct {
	text string
	err  error
}

func (runner leakingCommandRunner) Run(_ context.Context, _ actionexec.CommandSpec, output func(string, string)) actionexec.CommandResult {
	output("stdout", runner.text)
	output("stderr", runner.text)
	return actionexec.CommandResult{Stdout: runner.text, Stderr: runner.text, ExitCode: 23, Err: runner.err}
}

func TestAuthenticatedGitRunnerRedactsResultsAndEvents(t *testing.T) {
	provider := registryGitAuth{url: "https://gitlab.example/app.git", username: "test-user", token: "test-only-token"}
	repository := gitpkg.NewRepository(provider).(gitpkg.NativeAuthRepository)
	auth, err := repository.NativeAuthFor(provider.url)
	if err != nil {
		t.Fatal(err)
	}
	text := provider.token + " " + base64.StdEncoding.EncodeToString([]byte(provider.username+":"+provider.token))
	cause := errors.New(text)
	runner := authenticatedGitRunner{runner: leakingCommandRunner{text: text, err: cause}, auth: auth}
	var output string
	result := runner.Run(context.Background(), actionexec.CommandSpec{Name: "git", Args: []string{"fetch", "origin"}}, func(_, chunk string) { output += chunk })
	if strings.Contains(output+result.Stdout+result.Stderr+result.Err.Error(), provider.token) || strings.Contains(output, strings.Fields(text)[1]) {
		t.Fatal("credentials were not redacted")
	}
	if result.ExitCode != 23 || !errors.Is(result.Err, cause) {
		t.Fatal("command failure outcome was lost")
	}
}

func TestRegistryGitRejectsIncompleteCredentialsBeforeStartingRun(t *testing.T) {
	repository := gitpkg.NewRepository(registryGitAuth{url: "https://gitlab.example/app.git", username: "test-user"})
	s := &Server{
		apps:       []app.App{{Ident: "app", RepositoryPath: "https://gitlab.example/app.git"}},
		services:   &stubServicesContainer{gitRepository: repository},
		actionRuns: actionrun.NewRegistry(),
	}
	_, err := s.startEngineDefinition(actiondef.Action{ActionRuntime: "git", ActionType: "fetch", Resource: actiondef.ResourceRef{Kind: "app", ID: "app"}}, nil)
	if err == nil || len(s.actionRuns.ActiveForApp("app")) != 0 {
		t.Fatal("invalid credentials created an action run")
	}
}
