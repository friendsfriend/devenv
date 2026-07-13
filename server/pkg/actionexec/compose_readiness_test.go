package actionexec

import (
	"context"
	"testing"
	"time"
)

type composeRunner struct {
	out string
	err error
}

func (r composeRunner) Run(context.Context, CommandSpec, func(string, string)) CommandResult {
	return CommandResult{Stdout: r.out, Err: r.err}
}
func TestComposeReadinessRejectsNonRunningState(t *testing.T) {
	p := ComposeReadinessProbe{Runner: composeRunner{out: "running\nexited\n"}, Name: "docker", Interval: 0}
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()
	if err := p.Wait(ctx); err == nil {
		t.Fatal("expected unhealthy compose state")
	}
}
func TestComposeReadinessAcceptsRunningStates(t *testing.T) {
	p := ComposeReadinessProbe{Runner: composeRunner{out: "running\nrunning\n"}, Name: "docker", Interval: 0}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	if err := p.Wait(ctx); err != nil {
		t.Fatal(err)
	}
}
