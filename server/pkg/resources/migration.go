package resources

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

// MigrateLegacyActionResources copies legacy Docker/Compose action resources into
// the current apps/{build,compose} layout. Sources are preserved; destination
// files are never overwritten.
func (m *manager) MigrateLegacyActionResources() ([]string, error) {
	var migrated []string

	moves := []struct {
		legacyDir string
		destDir   string
		accept    func(string) bool
	}{
		{
			legacyDir: filepath.Join(m.configDir, "dockerfiles"),
			destDir:   filepath.Join(m.configDir, "apps", "build"),
			accept: func(name string) bool {
				return strings.HasSuffix(name, "-build.Dockerfile") || strings.HasSuffix(name, "-test.Dockerfile")
			},
		},
		{
			legacyDir: filepath.Join(m.configDir, "test"),
			destDir:   filepath.Join(m.configDir, "apps", "build"),
			accept: func(name string) bool {
				return strings.HasSuffix(name, "-test.Dockerfile")
			},
		},
		{
			legacyDir: filepath.Join(m.configDir, "compose"),
			destDir:   filepath.Join(m.configDir, "apps", "compose"),
			accept: func(name string) bool {
				return strings.HasSuffix(name, "-compose.yml") || strings.HasSuffix(name, "-compose.yaml")
			},
		},
	}

	for _, move := range moves {
		copied, err := migrateLegacyResourceDir(move.legacyDir, move.destDir, move.accept)
		if err != nil {
			return migrated, err
		}
		migrated = append(migrated, copied...)
	}

	return migrated, nil
}

func migrateLegacyResourceDir(legacyDir, destDir string, accept func(string) bool) ([]string, error) {
	entries, err := os.ReadDir(legacyDir)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return nil, nil
		}
		return nil, fmt.Errorf("reading legacy resource dir %q: %w", legacyDir, err)
	}

	var migrated []string
	for _, entry := range entries {
		if entry.IsDir() || !accept(entry.Name()) {
			continue
		}
		src := filepath.Join(legacyDir, entry.Name())
		dst := filepath.Join(destDir, entry.Name())
		if _, err := os.Stat(dst); err == nil {
			continue
		} else if !errors.Is(err, fs.ErrNotExist) {
			return migrated, err
		}
		if err := os.MkdirAll(destDir, 0755); err != nil {
			return migrated, err
		}
		content, err := os.ReadFile(src)
		if err != nil {
			return migrated, err
		}
		if err := os.WriteFile(dst, content, 0644); err != nil {
			return migrated, err
		}
		migrated = append(migrated, dst)
	}
	return migrated, nil
}
