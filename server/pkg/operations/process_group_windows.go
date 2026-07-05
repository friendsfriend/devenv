//go:build windows

package operations

import (
	"os/exec"
)

func setProcessGroup(cmd *exec.Cmd) {
	// Process groups are not supported on Windows; the process already
	// belongs to a job object from cmd.Start.
}
