package resources

import (
	"strings"
	"testing"
)

func TestTargetRegistryResolveStartPlan(t *testing.T) {
	t.Parallel()

	target := func(id string, requires ...DependencyRef) RegistryTarget {
		return RegistryTarget{ID: id, Kind: TargetKindAppRun, Requires: requires}
	}
	infra := func(id string, running bool) RegistryTarget {
		return RegistryTarget{ID: InfraTargetID(id), Kind: TargetKindInfra, Infra: id, Running: running}
	}

	t.Run("nested deps shared deps and already running", func(t *testing.T) {
		t.Parallel()
		backendID := AppRunTargetID("backend", ActionRuntimeSystemShell, "dev")
		frontendID := AppRunTargetID("frontend", ActionRuntimeSystemShell, "dev")
		workerID := AppRunTargetID("worker", ActionRuntimeDocker, "dev")
		registry := NewTargetRegistry([]RegistryTarget{
			infra("postgres", false),
			infra("redis", true),
			target(backendID, DependencyRef{Infra: "postgres"}),
			target(workerID, DependencyRef{Infra: "postgres"}, DependencyRef{Infra: "redis"}),
			target(frontendID,
				DependencyRef{App: "backend", Runtime: string(ActionRuntimeSystemShell), Profile: "dev"},
				DependencyRef{App: "worker", Runtime: string(ActionRuntimeDocker), Profile: "dev"},
			),
		})
		plan, err := registry.ResolveStartPlan(frontendID)
		if err != nil {
			t.Fatalf("ResolveStartPlan error = %v", err)
		}
		var ids []string
		for _, item := range plan {
			ids = append(ids, item.ID)
		}
		want := []string{InfraTargetID("postgres"), backendID, workerID, frontendID}
		if strings.Join(ids, ",") != strings.Join(want, ",") {
			t.Fatalf("plan = %#v, want %#v", ids, want)
		}
	})

	t.Run("missing dependency", func(t *testing.T) {
		t.Parallel()
		frontendID := AppRunTargetID("frontend", ActionRuntimeSystemShell, "dev")
		registry := NewTargetRegistry([]RegistryTarget{
			target(frontendID, DependencyRef{App: "missing", Runtime: string(ActionRuntimeShell), Profile: "dev"}),
		})
		_, err := registry.ResolveStartPlan(frontendID)
		if err == nil || !strings.Contains(err.Error(), "unknown app run target") {
			t.Fatalf("err = %v, want unknown app", err)
		}
	})

	t.Run("cycle chain", func(t *testing.T) {
		t.Parallel()
		aID := AppRunTargetID("a", ActionRuntimeShell, "dev")
		bID := AppRunTargetID("b", ActionRuntimeShell, "dev")
		registry := NewTargetRegistry([]RegistryTarget{
			target(aID, DependencyRef{App: "b", Runtime: string(ActionRuntimeShell), Profile: "dev"}),
			target(bID, DependencyRef{App: "a", Runtime: string(ActionRuntimeShell), Profile: "dev"}),
		})
		_, err := registry.ResolveStartPlan(aID)
		if err == nil || !strings.Contains(err.Error(), aID+" -> "+bID+" -> "+aID) {
			t.Fatalf("err = %v, want cycle chain", err)
		}
	})

	t.Run("missing runtime and profile", func(t *testing.T) {
		t.Parallel()
		registry := NewTargetRegistry([]RegistryTarget{})
		if _, err := registry.ResolveRef(DependencyRef{App: "api", Profile: "dev"}); err == nil || !strings.Contains(err.Error(), "requires runtime") {
			t.Fatalf("runtime err = %v", err)
		}
		if _, err := registry.ResolveRef(DependencyRef{App: "api", Runtime: string(ActionRuntimeDocker)}); err == nil || !strings.Contains(err.Error(), "requires profile") {
			t.Fatalf("profile err = %v", err)
		}
	})
}
