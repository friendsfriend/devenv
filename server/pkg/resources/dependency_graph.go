package resources

import (
	"fmt"
	"sort"
	"strings"
)

type TargetKind string

const (
	TargetKindAppRun TargetKind = "app-run"
	TargetKindInfra  TargetKind = "infra"
)

type RegistryTarget struct {
	ID       string
	Kind     TargetKind
	App      string
	Runtime  ActionRuntime
	Profile  string
	Infra    string
	Requires []DependencyRef
	Running  bool
}

type TargetRegistry struct {
	targets map[string]RegistryTarget
}

func NewTargetRegistry(targets []RegistryTarget) TargetRegistry {
	registry := TargetRegistry{targets: map[string]RegistryTarget{}}
	for _, target := range targets {
		registry.targets[target.ID] = target
	}
	return registry
}

func AppRunTargetID(appIdent string, runtime ActionRuntime, profile string) string {
	return actionTargetID(appIdent, AppActionRun, runtime, profile)
}

func InfraTargetID(infraIdent string) string {
	return "infra/" + infraIdent
}

func (r TargetRegistry) ResolveRef(ref DependencyRef) (string, error) {
	if strings.TrimSpace(ref.Infra) != "" {
		id := InfraTargetID(ref.Infra)
		if _, ok := r.targets[id]; !ok {
			return "", fmt.Errorf("unknown infrastructure service %q", ref.Infra)
		}
		return id, nil
	}
	if strings.TrimSpace(ref.App) == "" {
		return "", fmt.Errorf("dependency requires app or infra")
	}
	if strings.TrimSpace(ref.Runtime) == "" {
		return "", fmt.Errorf("app dependency %q requires runtime", ref.App)
	}
	if strings.TrimSpace(ref.Profile) == "" {
		return "", fmt.Errorf("app dependency %q requires profile", ref.App)
	}
	id := AppRunTargetID(ref.App, ActionRuntime(ref.Runtime), ref.Profile)
	if _, ok := r.targets[id]; !ok {
		return "", fmt.Errorf("unknown app run target %q runtime %q profile %q", ref.App, ref.Runtime, ref.Profile)
	}
	return id, nil
}

func (r TargetRegistry) ResolveStartPlan(rootID string) ([]RegistryTarget, error) {
	if _, ok := r.targets[rootID]; !ok {
		return nil, fmt.Errorf("unknown target %q", rootID)
	}
	visited := map[string]bool{}
	visiting := map[string]bool{}
	var stack []string
	var plan []RegistryTarget
	var visit func(string) error
	visit = func(id string) error {
		if visited[id] {
			return nil
		}
		if visiting[id] {
			cycle := appendCycle(stack, id)
			return fmt.Errorf("dependency cycle: %s", strings.Join(cycle, " -> "))
		}
		target := r.targets[id]
		visiting[id] = true
		stack = append(stack, id)
		refs := append([]DependencyRef(nil), target.Requires...)
		sort.SliceStable(refs, func(i, j int) bool { return refKey(refs[i]) < refKey(refs[j]) })
		for _, ref := range refs {
			depID, err := r.ResolveRef(ref)
			if err != nil {
				return err
			}
			if err := visit(depID); err != nil {
				return err
			}
		}
		stack = stack[:len(stack)-1]
		visiting[id] = false
		visited[id] = true
		if !target.Running {
			plan = append(plan, target)
		}
		return nil
	}
	if err := visit(rootID); err != nil {
		return nil, err
	}
	return plan, nil
}

func refKey(ref DependencyRef) string {
	if ref.Infra != "" {
		return "infra/" + ref.Infra
	}
	return AppRunTargetID(ref.App, ActionRuntime(ref.Runtime), ref.Profile)
}

func appendCycle(stack []string, id string) []string {
	for i, candidate := range stack {
		if candidate == id {
			return append(append([]string{}, stack[i:]...), id)
		}
	}
	return append(append([]string{}, stack...), id)
}
