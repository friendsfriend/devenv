package server

import (
	"net/url"
	"regexp"
	"strings"
)

type agentSessionInfo struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	TimeCreated int64  `json:"timeCreated"`
	TimeUpdated int64  `json:"timeUpdated"`
}

type agentGroup struct {
	Name     string             `json:"name"`
	Model    string             `json:"model"`
	Sessions []agentSessionInfo `json:"sessions"`
}

func slugify(s string) string {
	s = strings.ToLower(s)
	reg := regexp.MustCompile(`[^a-z0-9]+`)
	s = reg.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	return s
}

func extractHostFromURL(rawURL string) string {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return ""
	}
	return parsed.Hostname()
}
