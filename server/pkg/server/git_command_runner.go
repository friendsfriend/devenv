package server

import (
	"context"
	"fmt"
	"os"

	"github.com/friendsfriend/devenv/pkg/actiondef"
	"github.com/friendsfriend/devenv/pkg/actionexec"
	gitpkg "github.com/friendsfriend/devenv/pkg/git"
)

type authenticatedGitRunner struct {
	runner actionexec.CommandRunner
	auth   gitpkg.NativeAuth
}

func (runner authenticatedGitRunner) Run(ctx context.Context, spec actionexec.CommandSpec, output func(string, string)) actionexec.CommandResult {
	if spec.Name != "git" || len(spec.Args) == 0 {
		return runner.runner.Run(ctx, spec, output)
	}
	switch spec.Args[0] {
	case "clone", "fetch", "pull", "push", "ls-remote":
	default:
		return runner.runner.Run(ctx, spec, output)
	}
	env, err := runner.auth.Environment(append(os.Environ(), spec.Env...))
	if err != nil {
		return actionexec.CommandResult{ExitCode: -1, Err: err}
	}
	spec.Env = env
	result := runner.runner.Run(ctx, spec, func(stream, chunk string) {
		if output != nil {
			output(stream, runner.auth.Redact(chunk))
		}
	})
	result.Stdout = runner.auth.Redact(result.Stdout)
	result.Stderr = runner.auth.Redact(result.Stderr)
	result.Err = runner.auth.RedactError(result.Err)
	return result
}

func (s *Server) commandRunnerForDefinition(definition actiondef.Action) (actionexec.CommandRunner, error) {
	runner := actionexec.CommandRunner(actionexec.OSCommandRunner{})
	if definition.ActionRuntime != "git" {
		return runner, nil
	}
	switch definition.ActionType {
	case "fetch", "pull", "push":
		application := s.findApp(definition.Resource.ID)
		if application == nil {
			return nil, fmt.Errorf("application %q not found", definition.Resource.ID)
		}
		repository, ok := s.services.GitRepository().(gitpkg.NativeAuthRepository)
		if !ok {
			return nil, fmt.Errorf("Git repository does not support native authentication")
		}
		auth, err := repository.NativeAuthFor(application.GetRepositoryPath())
		if err != nil {
			return nil, err
		}
		// Validate inherited configuration before starting any recorded command.
		if _, err := auth.Environment(os.Environ()); err != nil {
			return nil, err
		}
		return authenticatedGitRunner{runner: runner, auth: auth}, nil
	default:
		return runner, nil
	}
}
