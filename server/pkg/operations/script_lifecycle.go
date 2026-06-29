package operations

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"time"

	"github.com/friendsfriend/devenv/pkg/app"
)

type scriptRunState struct {
	service app.InfraService
	runner  string
	mode    string
	paneID  string
	cmd     *exec.Cmd
	logPath string
	exitCh  chan error
}

type scriptTerminalState struct {
	status  string
	logPath string
}

func resolveScriptRunner(svc app.InfraService, requested string) (string, string, []string, error) {
	runner := strings.TrimSpace(requested)
	if runner == "" {
		runner = strings.TrimSpace(svc.DefaultRunner)
	}
	if runner == "" {
		if svc.ShellPath != "" && svc.PowerShellPath == "" {
			runner = app.ScriptRunnerShell
		} else if svc.PowerShellPath != "" && svc.ShellPath == "" {
			runner = app.ScriptRunnerPowerShell
		} else {
			return "", "", nil, fmt.Errorf("runner selection required for %s", svc.Ident)
		}
	}

	switch runner {
	case app.ScriptRunnerShell:
		if svc.ShellPath == "" {
			return "", "", nil, fmt.Errorf("shell runner not configured for %s", svc.Ident)
		}
		cmd, err := findShell()
		if err != nil {
			return "", "", nil, err
		}
		return runner, cmd, append([]string{svc.ShellPath}, svc.Args...), nil
	case app.ScriptRunnerPowerShell:
		if svc.PowerShellPath == "" {
			return "", "", nil, fmt.Errorf("PowerShell runner not configured for %s", svc.Ident)
		}
		cmd, err := findPowerShell()
		if err != nil {
			return "", "", nil, err
		}
		return runner, cmd, append([]string{"-File", svc.PowerShellPath}, svc.Args...), nil
	default:
		return "", "", nil, fmt.Errorf("unsupported runner %q", runner)
	}
}

func findShell() (string, error) {
	for _, name := range []string{"sh", "bash"} {
		if path, err := exec.LookPath(name); err == nil {
			return path, nil
		}
	}
	return "", fmt.Errorf("missing shell runtime: sh or bash not found")
}

func findPowerShell() (string, error) {
	for _, name := range []string{"pwsh", "powershell"} {
		if path, err := exec.LookPath(name); err == nil {
			return path, nil
		}
	}
	return "", fmt.Errorf("missing PowerShell runtime: pwsh or powershell not found")
}

func scriptEnv(env map[string]string) []string {
	vars := os.Environ()
	for k, v := range env {
		vars = append(vars, k+"="+v)
	}
	return vars
}

func defaultScriptLogPath(homeDir, ident string) string {
	return filepath.Join(homeDir, "logs", "infrastructure", ident+".log")
}

func killProcessGroup(cmd *exec.Cmd) error {
	if cmd == nil || cmd.Process == nil {
		return nil
	}
	if runtime.GOOS == "windows" {
		return cmd.Process.Kill()
	}
	return syscall.Kill(-cmd.Process.Pid, syscall.SIGTERM)
}

func startLoggedProcess(svc app.InfraService, command string, args []string, logPath string) (*exec.Cmd, chan error, error) {
	if err := os.MkdirAll(filepath.Dir(logPath), 0755); err != nil {
		return nil, nil, err
	}
	logFile, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return nil, nil, err
	}
	_, _ = fmt.Fprintf(logFile, "[%s] Command: %s %s\n", time.Now().Format(time.RFC3339), command, strings.Join(args, " "))
	cmd := exec.Command(command, args...)
	cmd.Dir = svc.Cwd
	cmd.Env = scriptEnv(svc.Env)
	cmd.Stdout = logFile
	cmd.Stderr = logFile
	if runtime.GOOS != "windows" {
		cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	}
	if err := cmd.Start(); err != nil {
		_ = logFile.Close()
		return nil, nil, err
	}
	exitCh := make(chan error, 1)
	go func() {
		err := cmd.Wait()
		_, _ = fmt.Fprintf(logFile, "[%s] Exit: %v\n", time.Now().Format(time.RFC3339), err)
		_ = logFile.Close()
		exitCh <- err
	}()
	return cmd, exitCh, nil
}

func exitCodeFromError(err error) int {
	if err == nil {
		return 0
	}
	var exitErr *exec.ExitError
	if errors.As(err, &exitErr) {
		return exitErr.ExitCode()
	}
	return -1
}
