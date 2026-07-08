package server

import (
	"testing"

	"github.com/friendsfriend/devenv/pkg/build"
	"github.com/friendsfriend/devenv/pkg/docker"
	"github.com/friendsfriend/devenv/pkg/resources"
)

func TestAppStatusEventPropertiesRunTargetInfoOptional(t *testing.T) {
	buildSvc := build.NewService(nil, nil, nil, "")
	buildSvc.SetRunTargetInfo("app", resources.ActionTarget{ID: "target", Runtime: resources.ActionRuntimeShell, LaunchMode: resources.LaunchModeTmux, Label: "bun build", Profile: "default", SourcePath: "/repo/package.json"})
	withInfo := &Server{services: &stubServicesContainer{buildService: buildSvc}}
	props := withInfo.appStatusEventProperties("app", docker.Info{}, "✓", "main", nil, "running")
	info, ok := props["runTargetInfo"].(*build.RunTargetInfo)
	if !ok || info.Display != "[tmux] bun build (default)" {
		t.Fatalf("runTargetInfo = %#v", props["runTargetInfo"])
	}

	withoutInfo := &Server{services: &stubServicesContainer{buildService: build.NewService(nil, nil, nil, "")}}
	props = withoutInfo.appStatusEventProperties("app", docker.Info{}, "✓", "main", nil, "running")
	if _, ok := props["runTargetInfo"]; ok {
		t.Fatalf("runTargetInfo present when absent: %#v", props["runTargetInfo"])
	}
}
