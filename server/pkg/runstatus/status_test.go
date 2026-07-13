package runstatus

import "testing"

func TestSelectUsesStatePriorityNotRuntimePriority(t *testing.T) {
	if got := Select([]Candidate{{Source: "docker", Status: "stopped"}, {Source: "kubernetes", Status: "running (1/1 pods)"}}); got != "running (1/1 pods)" {
		t.Fatalf("status=%q", got)
	}
	if got := Select([]Candidate{{Source: "kubernetes", Status: "failed (0/1 pods)"}, {Source: "podman", Status: "running"}}); got != "running" {
		t.Fatalf("status=%q", got)
	}
	if got := Select([]Candidate{{Source: "docker", Status: "not found"}, {Source: "kubernetes", Status: "starting (0/1 pods)"}}); got != "starting (0/1 pods)" {
		t.Fatalf("status=%q", got)
	}
}

func TestSelectAggregatesEqualHighestStates(t *testing.T) {
	if got := Select([]Candidate{{Source: "docker", Status: "running"}, {Source: "kubernetes", Status: "running (1/1 pods)"}}); got != "running (2 targets)" {
		t.Fatalf("status=%q", got)
	}
}
