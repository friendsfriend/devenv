package build

import (
	"reflect"
	"testing"

	k8s "github.com/friendsfriend/devenv/pkg/kubernetes"
	"github.com/friendsfriend/devenv/pkg/resources"
)

func TestKubernetesLifecycleHelpers(t *testing.T) {
	wait := resources.KubernetesWaitConfig{Timeout: "90s"}
	if got := kubernetesWaitArgs(wait); !reflect.DeepEqual(got, []string{"--wait", "--timeout", "90s"}) {
		t.Fatalf("wait args = %#v", got)
	}
	plans, err := k8s.BuildSecretPlans(k8s.Runner{}, "apps", []resources.KubernetesSecretConfig{{Name: "env", Keys: []string{"TOKEN"}}}, map[string]string{"TOKEN": "secret"})
	if err != nil {
		t.Fatalf("BuildSecretPlans error = %v", err)
	}
	got := secretCreateArgs(plans[0])
	want := []string{"--context", "kind-devenv", "create", "secret", "generic", "env", "--namespace", "apps", "--from-literal", "TOKEN=secret"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("secret args = %#v", got)
	}
}
