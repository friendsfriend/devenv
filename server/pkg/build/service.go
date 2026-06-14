package build

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/friendsfriend/devenv/pkg/app"
	"github.com/friendsfriend/devenv/pkg/resources"
	"github.com/friendsfriend/devenv/pkg/status"
)

type commandRunner interface {
	RunCommandWithLogging(appIdent, command string, args []string, envVars []string, workingDir string) (error, string)
	RunCommandSilent(command string, args []string, envVars []string, workingDir string) (error, string)
}

type resourceManager interface {
	ExistsDir(string) (bool, error)
	ResolveDockerfileForAction(appIdent, localDir string, action resources.ActionType) (string, error)
	ResolveComposeFile(appIdent, localDir string, profile string) (string, error)
	ResolveInfrastructureComposeFile(infraIdent string) (string, error)
	DiscoverProfiles(appIdent, localDir string) ([]string, error)
	EnvFilePath() (string, bool)
	CopyTemplatesDir(destDir string) ([]string, error)
	CopyFile(src, dst string) error
}

// Service provides build, test, and run operations for applications.
type Service interface {
	BuildAppWithStatus(a *app.App)
	TestAppWithStatus(a *app.App)
	RunAppWithStatus(a *app.App, profile string)
	SetOnComplete(callback func(appIdent string))
}

type service struct {
	resourceMgr resourceManager
	executor    commandRunner
	statusMgr   status.Manager
	OnComplete  func(appIdent string)
}

func NewService(resourceMgr resourceManager, exec commandRunner, statusMgr status.Manager) Service {
	return &service{
		resourceMgr: resourceMgr,
		executor:    exec,
		statusMgr:   statusMgr,
	}
}

func (s *service) SetOnComplete(callback func(appIdent string)) {
	s.OnComplete = callback
}

func (s *service) BuildAppWithStatus(a *app.App) {
	callback := s.statusMgr.StartOperation(a.Ident, status.OpBuild)
	s.buildAppInternal(a, callback)
}

func (s *service) TestAppWithStatus(a *app.App) {
	callback := s.statusMgr.StartOperation(a.Ident, status.OpTest)
	s.testAppInternal(a, callback)
}

func (s *service) RunAppWithStatus(a *app.App, profile string) {
	callback := s.statusMgr.StartOperation(a.Ident, status.OpRun)
	s.runAppInternal(a, profile, callback)
}

func (s *service) buildAppInternal(a *app.App, statusCb func(string)) {
	folderExists, _ := s.resourceMgr.ExistsDir(a.LocalDirectoryPath)
	if !folderExists {
		statusCb("Error: Checkout needed")
		return
	}

	statusCb("resolving dockerfile...")

	dockerFilePath, err := s.resourceMgr.ResolveDockerfileForAction(a.Ident, a.LocalDirectoryPath, resources.ActionBuild)
	if err != nil {
		statusCb("Error: " + err.Error())
		return
	}

	copied, err := s.resourceMgr.CopyTemplatesDir(a.LocalDirectoryPath)
	if err != nil {
		statusCb("Error: " + err.Error())
		return
	}
	defer func() {
		for _, p := range copied {
			_ = os.Remove(p)
		}
	}()

	imageName := fmt.Sprintf("%s:latest", a.Ident)

	// Copy Dockerfile into build context so Docker Desktop can access it
	// (Docker does not allow -f paths outside the build context on some drivers)
	localDockerfilePath := filepath.Join(a.LocalDirectoryPath, ".devenv-build.Dockerfile")
	if err := s.resourceMgr.CopyFile(dockerFilePath, localDockerfilePath); err != nil {
		statusCb("Error: " + err.Error())
		return
	}
	defer os.Remove(localDockerfilePath)

	statusCb("building image...")
	if buildErr, _ := s.executor.RunCommandWithLogging(a.Ident, "docker", []string{"build", "--rm", "-f", localDockerfilePath, "-t", imageName, "."}, []string{}, a.LocalDirectoryPath); buildErr != nil {
		statusCb("Error: " + buildErr.Error())
		return
	}

	statusCb("extracting artifacts...")
	artifactsPath, err := s.readArtifactsLabel(imageName)
	if err != nil {
		statusCb("Error: " + err.Error())
		return
	}

	if artifactsPath != "" {
		if err := s.extractArtifacts(a.Ident, a.LocalDirectoryPath, imageName, artifactsPath); err != nil {
			statusCb("Error: artifact extraction failed: " + err.Error())
			return
		}
	}

	statusCb("build successful")
	if s.OnComplete != nil {
		s.OnComplete(a.Ident)
	}
}

func (s *service) readArtifactsLabel(imageName string) (string, error) {
	inspectErr, output := s.executor.RunCommandSilent("docker", []string{"inspect", "--format", "{{json .Config.Labels}}", imageName}, []string{}, "")
	if inspectErr != nil {
		return "", fmt.Errorf("failed to inspect image %s: %w", imageName, inspectErr)
	}

	var labels map[string]string
	if err := json.Unmarshal([]byte(strings.TrimSpace(output)), &labels); err != nil {
		return "", fmt.Errorf("failed to parse image labels: %w", err)
	}

	return labels["devenv.artifacts"], nil
}

func (s *service) extractArtifacts(appIdent, localDir, imageName, artifactsPath string) error {
	containerName := fmt.Sprintf("%s-extract", appIdent)

	if createErr, _ := s.executor.RunCommandSilent("docker", []string{"create", "--name", containerName, imageName}, []string{}, ""); createErr != nil {
		return fmt.Errorf("failed to create extraction container: %w", createErr)
	}

	defer func() {
		s.executor.RunCommandSilent("docker", []string{"rm", containerName}, []string{}, "")
	}()

	destPath := filepath.Join(localDir, artifactsPath)
	if err := os.MkdirAll(filepath.Dir(destPath), 0755); err != nil {
		return fmt.Errorf("failed to create destination directory: %w", err)
	}

	containerSrc := fmt.Sprintf("%s:%s", containerName, artifactsPath)
	if cpErr, _ := s.executor.RunCommandSilent("docker", []string{"cp", containerSrc, destPath}, []string{}, ""); cpErr != nil {
		return fmt.Errorf("failed to copy artifacts: %w", cpErr)
	}

	return nil
}

func (s *service) testAppInternal(a *app.App, statusCb func(string)) {
	folderExists, _ := s.resourceMgr.ExistsDir(a.LocalDirectoryPath)
	if !folderExists {
		statusCb("Error: Checkout needed")
		return
	}

	statusCb("resolving test dockerfile...")

	dockerFilePath, err := s.resourceMgr.ResolveDockerfileForAction(a.Ident, a.LocalDirectoryPath, resources.ActionTest)
	if err != nil {
		statusCb("Error: " + err.Error())
		return
	}

	testImageName := fmt.Sprintf("%s-test:latest", a.Ident)

	localDockerfilePath := filepath.Join(a.LocalDirectoryPath, ".devenv-test.Dockerfile")
	if err := s.resourceMgr.CopyFile(dockerFilePath, localDockerfilePath); err != nil {
		statusCb("Error: " + err.Error())
		return
	}
	defer os.Remove(localDockerfilePath)

	statusCb("building test image...")
	if buildErr, _ := s.executor.RunCommandWithLogging(a.Ident, "docker", []string{"build", "--rm", "-f", localDockerfilePath, "-t", testImageName, "."}, []string{}, a.LocalDirectoryPath); buildErr != nil {
		statusCb("Error: " + buildErr.Error())
		return
	}

	statusCb("running tests...")
	if runErr, _ := s.executor.RunCommandWithLogging(a.Ident, "docker", []string{"run", "--rm", testImageName}, []string{}, a.LocalDirectoryPath); runErr != nil {
		statusCb("Error: tests failed")
		return
	}

	statusCb("tests passed")
}

func (s *service) runAppInternal(a *app.App, profile string, statusCb func(string)) {
	folderExists, _ := s.resourceMgr.ExistsDir(a.LocalDirectoryPath)
	if !folderExists {
		statusCb("Error: Checkout needed")
		return
	}

	statusCb("resolving compose file...")

	composeFilePath, err := s.resourceMgr.ResolveComposeFile(a.Ident, a.LocalDirectoryPath, profile)
	if err != nil {
		statusCb("Error: " + err.Error())
		return
	}

	composeArgs := []string{"compose", "-p", "devenv", "-f", composeFilePath}

	if envFilePath, ok := s.resourceMgr.EnvFilePath(); ok {
		composeArgs = append(composeArgs, "--env-file", envFilePath)
	}

	composeArgs = append(composeArgs, "up", "-d")

	statusCb("starting containers...")
	if runErr, _ := s.executor.RunCommandWithLogging(a.Ident, "docker", composeArgs, []string{}, a.LocalDirectoryPath); runErr != nil {
		statusCb("Error: " + runErr.Error())
		return
	}

	statusCb("run successful")
	if s.OnComplete != nil {
		s.OnComplete(a.Ident)
	}
}
