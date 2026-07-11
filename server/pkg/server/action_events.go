package server

import (
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/friendsfriend/devenv/pkg/actionrun"
	"github.com/google/uuid"
)

func actionKind(action string) string {
	switch {
	case strings.Contains(action, "worktree"):
		return "worktree"
	case strings.HasPrefix(action, "git") || action == "checkout" || action == "pull" || action == "push" || action == "fetch":
		return "git"
	case strings.Contains(action, "kubernetes"):
		return "kubernetes"
	case strings.Contains(action, "infra"):
		return "infrastructure"
	case strings.Contains(action, "task") || strings.Contains(action, "script"):
		return "task"
	default:
		return "app"
	}
}

// emitActionStarted publishes structured action metadata.
func (s *Server) reserveAction(appIdent, action string, run actionrun.Run) error {
	return s.actionRuns.Start(run, appIdent, action, nil)
}

func (s *Server) finishAction(runID string, status actionrun.Status) {
	s.actionRuns.Complete(runID, status)
}

func (s *Server) beginAction(title, command, appIdent, action, profile, targetLabel string) (string, string, error) {
	runID, stepID := s.emitActionStarted(title, command, appIdent, action, profile, targetLabel)
	run := actionrun.Run{ID: runID, Title: title, Profile: profile, TargetLabel: targetLabel, Status: actionrun.StatusActive}
	if err := s.actionRuns.Start(run, appIdent, action, nil); err != nil {
		return "", "", err
	}
	return runID, stepID, nil
}

func (s *Server) beginActionPlan(title, appIdent, action, profile, targetLabel string, steps []actionrun.Step) (string, error) {
	runID := s.emitActionPlanStarted(title, steps, appIdent, action, profile, targetLabel)
	run := actionrun.Run{ID: runID, Title: title, Profile: profile, TargetLabel: targetLabel, Status: actionrun.StatusActive, Steps: steps}
	if err := s.actionRuns.Start(run, appIdent, action, nil); err != nil {
		return "", err
	}
	return runID, nil
}

func (s *Server) emitActionPlanStarted(title string, steps []actionrun.Step, metadata ...string) string {
	runID := "action-" + uuid.NewString()
	now := time.Now()
	run := actionrun.Run{ID: runID, Title: title, Status: actionrun.StatusActive, Steps: steps, StartedAt: &now}
	if len(metadata) > 0 {
		run.AppIdent = metadata[0]
	}
	if len(metadata) > 1 {
		run.Action = metadata[1]
		run.Kind = actionKind(metadata[1])
	}
	if len(metadata) > 2 {
		run.Profile = metadata[2]
	}
	if len(metadata) > 3 {
		run.TargetLabel = metadata[3]
	}
	s.BroadcastEvent(Event{Type: "action.started", Properties: map[string]interface{}{"run": run}, Timestamp: time.Now()})
	return runID
}

func (s *Server) emitActionStarted(title, command string, metadata ...string) (string, string) {
	runID := "action-" + uuid.NewString()
	stepID := runID + "-step-0"
	commands := []actionrun.Command{}
	if command != "" {
		commands = append(commands, actionrun.Command{ID: stepID + "-command-0", Command: command, Status: actionrun.StatusPending})
	}
	now := time.Now()
	run := actionrun.Run{ID: runID, Title: title, Status: actionrun.StatusActive, Steps: []actionrun.Step{{ID: stepID, Label: title, Commands: commands, Status: actionrun.StatusPending}}, StartedAt: &now}
	if len(metadata) > 0 {
		run.AppIdent = metadata[0]
	}
	if len(metadata) > 1 {
		run.Action = metadata[1]
		run.Kind = actionKind(metadata[1])
	}
	if len(metadata) > 2 {
		run.Profile = metadata[2]
	}
	if len(metadata) > 3 {
		run.TargetLabel = metadata[3]
	}
	s.BroadcastEvent(Event{Type: "action.started", Properties: map[string]interface{}{"run": run}, Timestamp: time.Now()})
	return runID, stepID
}

type actionOutputConfigurator interface {
	ConfigureActionOutput(appIdent, runID, stepID string, output func(stepID, stream, chunk string))
	ConfigureActionCommand(appIdent string, command func(stepID, command string, args []string))
	ConfigureActionCommandDone(appIdent string, done func(stepID string, err error))
	ConfigureActionStepEvent(appIdent string, event func(stepID, status, message string))
	SetActionStep(stepID string)
	ClearActionOutput()
}

func (s *Server) runAction(appIdent, runID, stepID, command string, nestedSteps bool, configurator actionOutputConfigurator, fn func()) {
	eventStepID := func(id string) string {
		if nestedSteps && id != "" {
			return id
		}
		return stepID
	}
	s.BroadcastEvent(Event{Type: "action.step.started", Properties: map[string]interface{}{"runId": runID, "stepId": stepID, "command": command, "index": 0}, Timestamp: time.Now()})
	go func() {
		var commandMu sync.RWMutex
		commandIndex, commandID, commandText, failedStepID := 0, "", "", ""
		if configurator != nil {
			configurator.ConfigureActionOutput(appIdent, runID, stepID, func(sourceStepID, stream, chunk string) {
				eventStepID := eventStepID(sourceStepID)
				commandMu.Lock()
				id := commandID
				if id == "" {
					id = eventStepID + "-diagnostic"
					commandID, commandText = id, "readiness / container logs"
				}
				commandMu.Unlock()
				s.emitActionOutput(runID, eventStepID, id, commandText, chunk, stream)
			})
			configurator.ConfigureActionCommand(appIdent, func(sourceStepID, command string, args []string) {
				eventStepID := eventStepID(sourceStepID)
				commandMu.Lock()
				commandID = fmt.Sprintf("%s-command-%d", eventStepID, commandIndex)
				commandText = strings.Join(append([]string{command}, args...), " ")
				id := commandID
				commandIndex++
				commandMu.Unlock()
				s.BroadcastEvent(Event{Type: "action.command.started", Properties: map[string]interface{}{"runId": runID, "stepId": eventStepID, "commandId": id, "command": commandText, "index": commandIndex - 1}, Timestamp: time.Now()})
			})
			configurator.ConfigureActionStepEvent(appIdent, func(sourceStepID, status, message string) {
				eventStepID := eventStepID(sourceStepID)
				typeName := "action.step." + status
				props := map[string]interface{}{"runId": runID, "stepId": eventStepID}
				if message != "" {
					props["error"] = message
				}
				if status == "failed" {
					commandMu.Lock()
					failedStepID = eventStepID
					commandMu.Unlock()
				}
				s.BroadcastEvent(Event{Type: typeName, Properties: props, Timestamp: time.Now()})
			})
			configurator.ConfigureActionCommandDone(appIdent, func(sourceStepID string, err error) {
				eventStepID := eventStepID(sourceStepID)
				commandMu.RLock()
				id := commandID
				commandMu.RUnlock()
				typeName := "action.command.completed"
				props := map[string]interface{}{"runId": runID, "stepId": eventStepID, "commandId": id}
				if err != nil {
					typeName, props["error"] = "action.command.failed", err.Error()
					commandMu.Lock()
					failedStepID = eventStepID
					commandMu.Unlock()
				}
				s.BroadcastEvent(Event{Type: typeName, Properties: props, Timestamp: time.Now()})
			})
		}
		status := actionrun.StatusCompleted
		defer func() {
			commandMu.RLock()
			commandFailedStep := failedStepID
			commandMu.RUnlock()
			if commandFailedStep != "" {
				status = actionrun.StatusFailed
				s.BroadcastEvent(Event{Type: "action.step.failed", Properties: map[string]interface{}{"runId": runID, "stepId": commandFailedStep, "error": "command failed"}, Timestamp: time.Now()})
			}
			if recovered := recover(); recovered != nil {
				status = actionrun.StatusFailed
				s.BroadcastEvent(Event{Type: "action.step.failed", Properties: map[string]interface{}{"runId": runID, "stepId": stepID, "error": fmt.Sprint(recovered)}, Timestamp: time.Now()})
			} else if commandFailedStep == "" {
				s.BroadcastEvent(Event{Type: "action.step.completed", Properties: map[string]interface{}{"runId": runID, "stepId": stepID}, Timestamp: time.Now()})
			}
			if configurator != nil {
				configurator.ClearActionOutput()
			}
			s.finishAction(runID, status)
			s.BroadcastEvent(Event{Type: "action.completed", Properties: map[string]interface{}{"runId": runID, "status": status}, Timestamp: time.Now()})
		}()
		fn()
	}()
}

func (s *Server) emitActionOutput(runID, stepID, commandID, command, output, stream string) {
	if commandID == "" {
		commandID = stepID + "-diagnostic"
		command = "readiness / container logs"
		s.BroadcastEvent(Event{Type: "action.command.started", Properties: map[string]interface{}{"runId": runID, "stepId": stepID, "commandId": commandID, "command": command, "index": 0}, Timestamp: time.Now()})
	}
	props := map[string]interface{}{"runId": runID, "stepId": stepID, "commandId": commandID, "command": command, "output": output, "stream": stream}
	s.BroadcastEvent(Event{Type: "action.step.output", Properties: props, Timestamp: time.Now()})
}
