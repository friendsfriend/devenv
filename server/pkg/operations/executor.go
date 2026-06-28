package operations

import (
	"fmt"
	"os"
	"os/exec"

	"github.com/friendsfriend/devenv/pkg/logging"
)

// Executor handles command execution with logging capabilities.
type Executor struct {
	logger logging.Logger
}

// NewExecutor creates a new command executor.
func NewExecutor(logger logging.Logger) *Executor {
	return &Executor{
		logger: logger,
	}
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
	return e.logger.RunCommandWithLoggingToFile(appIdent, command, args, envVars, workingDir, logPath)
}
