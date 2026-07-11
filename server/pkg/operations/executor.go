package operations

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"sync"

	"github.com/friendsfriend/devenv/pkg/logging"
)

// Executor handles command execution with logging capabilities.
type actionContext struct {
	stepID  string
	output  func(string, string, string)
	command func(string, string, []string)
	done    func(string, error)
	ctx     context.Context
	cancel  context.CancelFunc
}
type Executor struct {
	logger   logging.Logger
	actionMu sync.RWMutex
	action   actionContext
	perApp   map[string]actionContext
}

// NewExecutor creates a new command executor.
func NewExecutor(logger logging.Logger) *Executor {
	return &Executor{logger: logger, perApp: make(map[string]actionContext)}
}

// RunCommandSilent runs a command silently and returns output.
func (e *Executor) RunCommandSilent(command string, args []string, envVars []string, workingDir string) (error, string) {
	cmd := exec.Command(command, args...)
	cmd.Env = append(os.Environ(), envVars...)
	cmd.Dir = workingDir
	out, err := cmd.CombinedOutput()
	return err, string(out)
}

// RunCommandLive runs a command with live output to stdout/stderr.
func (e *Executor) RunCommandLive(command string, args []string, envVars []string, workingDir string) error {
	cmd := exec.Command(command, args...)
	cmd.Env = append(os.Environ(), envVars...)
	cmd.Dir = workingDir

	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("error starting command: %w", err)
	}

	if err := cmd.Wait(); err != nil {
		return fmt.Errorf("error waiting for command: %w", err)
	}

	return nil
}

// RunCommandWithLogging runs a command with logging to the app logger.
func (e *Executor) RunCommandWithLogging(appIdent, command string, args []string, envVars []string, workingDir string) (error, string) {
	return e.logger.RunCommandWithLogging(appIdent, command, args, envVars, workingDir)
}

func (e *Executor) RunCommandWithLoggingToFile(appIdent, command string, args []string, envVars []string, workingDir string, logPath string) (error, string) {
	e.actionMu.RLock()
	ctx := e.action
	if appCtx, ok := e.perApp[appIdent]; ok {
		ctx = appCtx
	}
	e.actionMu.RUnlock()
	stepID, output, started, done := ctx.stepID, ctx.output, ctx.command, ctx.done
	if output == nil {
		return e.logger.RunCommandWithLoggingToFile(appIdent, command, args, envVars, workingDir, logPath)
	}
	if started != nil {
		started(stepID, command, args)
	}
	execCtx := ctx.ctx
	if execCtx == nil {
		execCtx = context.Background()
	}
	err, result := e.logger.RunCommandWithActionLoggingToFile(execCtx, appIdent, command, args, envVars, workingDir, logPath, func(stream, chunk string) { output(stepID, stream, chunk) })
	if done != nil {
		done(stepID, err)
	}
	return err, result
}

func (e *Executor) ConfigureAction(output func(string, string, string), command func(string, string, []string), done func(string, error)) {
	e.actionMu.Lock()
	defer e.actionMu.Unlock()
	e.action = actionContext{output: output, command: command, done: done}
}
func (e *Executor) ConfigureActionForApp(app string, output func(string, string, string), command func(string, string, []string), done func(string, error)) {
	e.actionMu.Lock()
	defer e.actionMu.Unlock()
	if old := e.perApp[app].cancel; old != nil {
		old()
	}
	ctx, cancel := context.WithCancel(context.Background())
	e.perApp[app] = actionContext{output: output, command: command, done: done, ctx: ctx, cancel: cancel}
}
func (e *Executor) SetActionStep(stepID string) {
	e.actionMu.Lock()
	defer e.actionMu.Unlock()
	e.action.stepID = stepID
}
func (e *Executor) SetActionStepForApp(app, stepID string) {
	e.actionMu.Lock()
	defer e.actionMu.Unlock()
	ctx := e.perApp[app]
	ctx.stepID = stepID
	e.perApp[app] = ctx
}
func (e *Executor) ClearAction() {
	e.actionMu.Lock()
	defer e.actionMu.Unlock()
	e.action = actionContext{}
}
func (e *Executor) CancelActionForApp(app string) {
	e.actionMu.Lock()
	defer e.actionMu.Unlock()
	if ctx, ok := e.perApp[app]; ok && ctx.cancel != nil {
		ctx.cancel()
	}
}
func (e *Executor) ClearActionForApp(app string) {
	e.actionMu.Lock()
	defer e.actionMu.Unlock()
	if ctx, ok := e.perApp[app]; ok && ctx.cancel != nil {
		ctx.cancel()
	}
	delete(e.perApp, app)
}

// ActionOutput receives live stdout/stderr chunks for one action step.
type ActionOutput func(stream, chunk string)

// RunCommandWithActionLoggingToFile preserves normal command behavior while
// exposing action-scoped output to lifecycle event bridges.
func (e *Executor) RunCommandWithActionLoggingToFile(ctx context.Context, appIdent, command string, args []string, envVars []string, workingDir, logPath string, output ActionOutput) (error, string) {
	return e.logger.RunCommandWithActionLoggingToFile(ctx, appIdent, command, args, envVars, workingDir, logPath, func(stream, chunk string) { output(stream, chunk) })
}
