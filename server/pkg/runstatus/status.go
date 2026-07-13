package runstatus

import (
	"strconv"
	"strings"
)

// Candidate is one runtime's current observation for an application.
type Candidate struct {
	Source string
	Status string
}

// Rank orders user-visible runtime states. Runtime type never affects priority.
func Rank(status string) int {
	switch State(status) {
	case "running":
		return 5
	case "starting":
		return 4
	case "failed":
		return 3
	case "stopped":
		return 2
	default:
		return 1
	}
}

// State normalizes detailed provider output, such as "running (1/1 pods)".
func State(status string) string {
	value := strings.ToLower(strings.TrimSpace(status))
	switch {
	case strings.HasPrefix(value, "running"), strings.HasPrefix(value, "healthy"):
		return "running"
	case strings.HasPrefix(value, "starting"), strings.HasPrefix(value, "pending"), strings.HasPrefix(value, "creating"), strings.HasPrefix(value, "restarting"):
		return "starting"
	case strings.HasPrefix(value, "failed"), strings.HasPrefix(value, "error"), strings.HasPrefix(value, "unhealthy"), strings.Contains(value, "crash"):
		return "failed"
	case strings.HasPrefix(value, "stopped"), strings.HasPrefix(value, "exited"), strings.HasPrefix(value, "not found"), strings.HasPrefix(value, "unknown"), value == "":
		return "stopped"
	default:
		return "unknown"
	}
}

// Select returns highest-priority observed state. Equal highest states are
// aggregated so no runtime receives accidental precedence.
func Select(candidates []Candidate) string {
	if len(candidates) == 0 {
		return "stopped"
	}
	bestRank := -1
	best := []Candidate{}
	for _, candidate := range candidates {
		rank := Rank(candidate.Status)
		if rank > bestRank {
			bestRank = rank
			best = []Candidate{candidate}
			continue
		}
		if rank == bestRank {
			best = append(best, candidate)
		}
	}
	state := State(best[0].Status)
	if state == "stopped" || state == "unknown" {
		return "stopped"
	}
	if len(best) > 1 {
		return state + " (" + strconv.Itoa(len(best)) + " targets)"
	}
	return best[0].Status
}
