package operations

import (
	"github.com/friendsfriend/devenv/pkg/app"
	"github.com/friendsfriend/devenv/pkg/docker"
	"github.com/friendsfriend/devenv/pkg/resources"
	"github.com/friendsfriend/devenv/pkg/status"
)

// Service manages container lifecycle operations for applications.
type Service interface {
	StartInfrastructureServiceWithStatus(infra app.InfraService)
	KillAndRemoveAllContainersForAppWithStatus(a *app.App)
	KillAllRunningContainersWithStatus(apps []app.App)
	SetOnComplete(callback func(appIdent string))
}

type service struct {
	dockerClient docker.Client
	executor     *Executor
	statusMgr    status.Manager
	resourceMgr  resources.Manager
	envFilePath  string
	OnComplete   func(appIdent string)
}

func NewService(dockerClient docker.Client, exec *Executor, statusMgr status.Manager, resourceMgr resources.Manager, envFilePath string) Service {
	return &service{
		dockerClient: dockerClient,
		executor:     exec,
		statusMgr:    statusMgr,
		resourceMgr:  resourceMgr,
		envFilePath:  envFilePath,
	}
}

func (s *service) SetOnComplete(callback func(appIdent string)) {
	s.OnComplete = callback
}

func (s *service) newComposeArgs() []string {
	args := []string{"compose", "-p", "devenv"}
	if s.envFilePath != "" {
		args = append(args, "--env-file", s.envFilePath)
	}
	return args
}

func (s *service) StartInfrastructureServiceWithStatus(infra app.InfraService) {
	callback := s.statusMgr.StartOperation(infra.Ident, status.OpStart)
	callback("starting...")

	composeFilePath, err := s.resourceMgr.ResolveInfrastructureComposeFile(infra.Ident)
	if err != nil {
		callback("Error: " + err.Error())
		return
	}

	composeArgs := s.newComposeArgs()
	composeArgs = append(composeArgs, "-f", composeFilePath, "up", "-d")

	err, _ = s.executor.RunCommandWithLogging(infra.Ident, "docker", composeArgs, []string{}, "")
	if err != nil {
		callback("Error: " + err.Error())
		return
	}

	s.dockerClient.InvalidateContainerCache()

	callback("start successful")

	if s.OnComplete != nil {
		s.OnComplete(infra.Ident)
	}
}

func (s *service) KillAndRemoveAllContainersForAppWithStatus(a *app.App) {
	callback := s.statusMgr.StartOperation(a.Ident, status.OpStop)
	s.killAndRemoveContainersForAppInternal(a, callback)
}

func (s *service) killAndRemoveContainersForAppInternal(a *app.App, statusCb func(string)) {
	statusCb("killing containers...")

	composeArgs := s.newComposeArgs()
	composeArgs = append(composeArgs, "down", "--remove-orphans")

	err, _ := s.executor.RunCommandWithLogging(a.Ident, "docker", composeArgs, []string{}, "")
	if err != nil {
		statusCb("Error: " + err.Error())
		return
	}

	s.dockerClient.InvalidateContainerCache()

	statusCb("containers stopped")

	if s.OnComplete != nil {
		s.OnComplete(a.Ident)
	}
}

func (s *service) KillAllRunningContainersWithStatus(apps []app.App) {
	callback := s.statusMgr.StartOperation("all-apps", status.OpStop)
	s.killAllRunningContainersInternal(apps, callback)
}

func (s *service) killAllRunningContainersInternal(apps []app.App, statusCb func(string)) {
	statusCb("killing all containers...")

	composeArgs := s.newComposeArgs()
	composeArgs = append(composeArgs, "down", "--remove-orphans")

	err, _ := s.executor.RunCommandWithLogging("all-apps", "docker", composeArgs, []string{}, "")
	if err != nil {
		statusCb("Error: " + err.Error())
		return
	}

	s.dockerClient.InvalidateContainerCache()

	statusCb("all containers stopped")
}
