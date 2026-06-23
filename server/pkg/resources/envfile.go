package resources

import (
	"bufio"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
)

var varPattern = regexp.MustCompile(`\$\{([^}]+)\}`)

// LoadEnvFile reads a .env file and returns its key-value pairs.
func LoadEnvFile(path string) (map[string]string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	vars := make(map[string]string)
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}

		key = strings.TrimSpace(key)
		value = strings.TrimSpace(value)
		value = unquoteEnvValue(value)

		if key != "" {
			vars[key] = value
		}
	}

	return vars, scanner.Err()
}

// SubstituteVars replaces ${VAR} placeholders in s with values from vars.
func SubstituteVars(s string, vars map[string]string) string {
	return varPattern.ReplaceAllStringFunc(s, func(match string) string {
		key := match[2 : len(match)-1]
		if val, ok := vars[key]; ok {
			return val
		}
		return match
	})
}

// UpsertEnvFile updates or appends key-value pairs while preserving unrelated lines.
func UpsertEnvFile(path string, values map[string]string) error {
	lines, err := readEnvLines(path)
	if err != nil {
		return err
	}

	seen := make(map[string]bool, len(values))
	for i, line := range lines {
		key, _, ok := strings.Cut(strings.TrimSpace(line), "=")
		key = strings.TrimSpace(key)
		if !ok || key == "" || strings.HasPrefix(key, "#") {
			continue
		}
		if value, exists := values[key]; exists {
			lines[i] = key + "=" + quoteEnvValue(value)
			seen[key] = true
		}
	}

	keys := make([]string, 0, len(values))
	for key := range values {
		if !seen[key] {
			keys = append(keys, key)
		}
	}
	sort.Strings(keys)
	for _, key := range keys {
		lines = append(lines, key+"="+quoteEnvValue(values[key]))
	}

	return writeEnvLines(path, lines)
}

// RemoveEnvFileKeys removes selected keys while preserving unrelated lines.
func RemoveEnvFileKeys(path string, keys []string) error {
	lines, err := readEnvLines(path)
	if err != nil {
		return err
	}
	remove := make(map[string]bool, len(keys))
	for _, key := range keys {
		remove[key] = true
	}

	kept := lines[:0]
	for _, line := range lines {
		key, _, ok := strings.Cut(strings.TrimSpace(line), "=")
		key = strings.TrimSpace(key)
		if ok && remove[key] {
			continue
		}
		kept = append(kept, line)
	}
	return writeEnvLines(path, kept)
}

func readEnvLines(path string) ([]string, error) {
	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	text := strings.TrimSuffix(string(data), "\n")
	if text == "" {
		return nil, nil
	}
	return strings.Split(text, "\n"), nil
}

func writeEnvLines(path string, lines []string) error {
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}
	content := strings.Join(lines, "\n")
	if content != "" {
		content += "\n"
	}
	return os.WriteFile(path, []byte(content), 0600)
}

func quoteEnvValue(value string) string {
	if value == "" || strings.ContainsAny(value, " \t#'\"\\") {
		value = strings.ReplaceAll(value, "\\", "\\\\")
		value = strings.ReplaceAll(value, "'", "\\'")
		return "'" + value + "'"
	}
	return value
}

func unquoteEnvValue(value string) string {
	if len(value) >= 2 {
		quote := value[0]
		if (quote == '\'' || quote == '"') && value[len(value)-1] == quote {
			value = value[1 : len(value)-1]
			value = strings.ReplaceAll(value, "\\"+string(quote), string(quote))
			value = strings.ReplaceAll(value, "\\\\", "\\")
		}
	}
	return value
}
