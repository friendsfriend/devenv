package git

import (
	"encoding/base64"
	"fmt"
	"net/url"
	"strconv"
	"strings"
)

// NativeAuthRepository supplies runtime-only authentication for native Git.
type NativeAuthRepository interface {
	NativeAuthFor(repoURL string) (NativeAuth, error)
}

type credentialResolver interface {
	CredentialsForWithError(repoURL string) (username, token string, err error)
}

// NativeAuth never belongs in an action definition or its persisted snapshot.
type NativeAuth struct {
	url    string
	token  string
	header string
}

func (gr *gitRepository) NativeAuthFor(repoURL string) (NativeAuth, error) {
	parsed, err := url.Parse(repoURL)
	if err != nil {
		if strings.HasPrefix(repoURL, "http:") || strings.HasPrefix(repoURL, "https:") {
			return NativeAuth{}, fmt.Errorf("invalid HTTP(S) Git repository URL")
		}
		return NativeAuth{}, nil
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return NativeAuth{}, nil
	}
	var username, token string
	if resolver, ok := gr.auth.(credentialResolver); ok {
		username, token, err = resolver.CredentialsForWithError(repoURL)
		if err != nil {
			return NativeAuth{}, err
		}
	} else {
		username, token = gr.credentialsFor(repoURL)
	}
	if username == "" && token == "" {
		return NativeAuth{}, nil
	}
	if username == "" || token == "" {
		return NativeAuth{}, fmt.Errorf("Git provider credentials require both username and token")
	}
	if strings.Contains(username, ":") {
		return NativeAuth{}, fmt.Errorf("Git provider username must not contain a colon")
	}
	if parsed.Host == "" || parsed.User != nil || parsed.RawQuery != "" || parsed.Fragment != "" {
		return NativeAuth{}, fmt.Errorf("authenticated Git repository must use an HTTP(S) URL without embedded credentials, query, or fragment")
	}
	return NativeAuth{
		url:    parsed.String(),
		token:  token,
		header: "Authorization: Basic " + base64.StdEncoding.EncodeToString([]byte(username+":"+token)),
	}, nil
}

// Environment appends URL-scoped configuration without modifying process or disk state.
func (auth NativeAuth) Environment(env []string) ([]string, error) {
	if auth.header == "" {
		return env, nil
	}
	count := 0
	for _, entry := range env {
		key, value, found := strings.Cut(entry, "=")
		if found && strings.EqualFold(key, "GIT_CONFIG_COUNT") {
			var err error
			count, err = strconv.Atoi(value)
			if err != nil || count < 0 {
				return nil, fmt.Errorf("invalid inherited GIT_CONFIG_COUNT")
			}
		}
	}
	result := make([]string, 0, len(env)+9)
	for _, entry := range env {
		key, _, _ := strings.Cut(entry, "=")
		upperKey := strings.ToUpper(key)
		if upperKey != "GIT_CONFIG_COUNT" && upperKey != "GIT_TERMINAL_PROMPT" && upperKey != "GIT_CURL_VERBOSE" && !strings.HasPrefix(upperKey, "GIT_TRACE") {
			result = append(result, entry)
		}
	}
	// Reset pre-existing headers/helpers for this URL, then use the selected provider.
	config := [][2]string{
		{"http." + auth.url + ".extraHeader", ""},
		{"http." + auth.url + ".extraHeader", auth.header},
		{"credential." + auth.url + ".helper", ""},
		{"http." + auth.url + ".followRedirects", "false"},
	}
	for index, entry := range config {
		result = append(result,
			fmt.Sprintf("GIT_CONFIG_KEY_%d=%s", count+index, entry[0]),
			fmt.Sprintf("GIT_CONFIG_VALUE_%d=%s", count+index, entry[1]))
	}
	// Git tracing can write environment/configuration secrets directly to files.
	result = append(result, fmt.Sprintf("GIT_CONFIG_COUNT=%d", count+len(config)), "GIT_TERMINAL_PROMPT=0",
		"GIT_TRACE2=0", "GIT_TRACE2_EVENT=0", "GIT_TRACE2_PERF=0", "GIT_TRACE_REDACT=1")
	return result, nil
}

func (auth NativeAuth) Redact(text string) string {
	if auth.header == "" {
		return text
	}
	text = strings.ReplaceAll(text, auth.header, "[REDACTED]")
	text = strings.ReplaceAll(text, strings.TrimPrefix(auth.header, "Authorization: Basic "), "[REDACTED]")
	return strings.ReplaceAll(text, auth.token, "[REDACTED]")
}

type redactedGitError struct {
	message string
	cause   error
}

func (err redactedGitError) Error() string { return err.message }
func (err redactedGitError) Unwrap() error { return err.cause }

func (auth NativeAuth) RedactError(err error) error {
	if err == nil {
		return nil
	}
	return redactedGitError{message: auth.Redact(err.Error()), cause: err}
}
