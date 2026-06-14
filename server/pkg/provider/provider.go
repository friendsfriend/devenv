package provider

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/friendsfriend/devenv/pkg/resources"
)

const (
	TypeGitHub = "github"
	TypeGitLab = "gitlab"
)

// Provider represents a named git provider configuration.
type Provider struct {
	Name     string `json:"name"`
	Type     string `json:"type"`
	Username string `json:"username"`
	Token    string `json:"token"`
}

// HasCredentials returns true when both username and token are non-empty.
func (p Provider) HasCredentials() bool {
	return p.Username != "" && p.Token != ""
}

// Store provides access to provider credentials.
type Store interface {
	Dir() string
	Load() error
	Get(name string) (Provider, bool)
	List() []Provider
	Save(p Provider) error
	Delete(name string) error
	CredentialsFor(name string) (username, token string)
}

type store struct {
	dir         string
	envFilePath string
	mu          sync.RWMutex
	providers   map[string]Provider
}

func NewStore(dir string, envFilePath string) Store {
	return &store{
		dir:         dir,
		envFilePath: envFilePath,
		providers:   make(map[string]Provider),
	}
}

func (s *store) Dir() string {
	return s.dir
}

func (s *store) Load() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if err := os.MkdirAll(s.dir, 0755); err != nil {
		return fmt.Errorf("failed to create providers directory %s: %w", s.dir, err)
	}

	var envVars map[string]string
	if s.envFilePath != "" {
		loaded, err := resources.LoadEnvFile(s.envFilePath)
		if err == nil {
			envVars = loaded
		}
	}

	entries, err := os.ReadDir(s.dir)
	if err != nil {
		return fmt.Errorf("failed to read providers directory %s: %w", s.dir, err)
	}

	s.providers = make(map[string]Provider)
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".json") {
			continue
		}

		data, err := os.ReadFile(filepath.Join(s.dir, entry.Name()))
		if err != nil {
			return fmt.Errorf("failed to read provider file %s: %w", entry.Name(), err)
		}

		if envVars != nil {
			data = []byte(resources.SubstituteVars(string(data), envVars))
		}

		var p Provider
		if err := json.Unmarshal(data, &p); err != nil {
			return fmt.Errorf("failed to parse provider file %s: %w", entry.Name(), err)
		}

		if p.Name == "" {
			p.Name = strings.TrimSuffix(entry.Name(), ".json")
		}

		s.providers[p.Name] = p
	}

	return nil
}

// Get returns a provider by name.
func (s *store) Get(name string) (Provider, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	p, ok := s.providers[name]
	return p, ok
}

// List returns all providers sorted by name.
func (s *store) List() []Provider {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result := make([]Provider, 0, len(s.providers))
	for _, p := range s.providers {
		result = append(result, p)
	}
	return result
}

// Save persists a provider to disk and updates the in-memory cache.
// If a provider with the same name already exists, it is overwritten.
func (s *store) Save(p Provider) error {
	if err := validateProvider(p); err != nil {
		return err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	s.providers[p.Name] = p
	return s.saveProviderLocked(p)
}

// Delete removes a provider by name from disk and the in-memory cache.
func (s *store) Delete(name string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.providers[name]; !exists {
		return fmt.Errorf("provider %q not found", name)
	}

	filePath := filepath.Join(s.dir, name+".json")
	if err := os.Remove(filePath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete provider file %s: %w", filePath, err)
	}

	delete(s.providers, name)
	return nil
}

// CredentialsFor looks up the provider by name and returns its credentials.
// Returns empty strings if the provider is not found.
func (s *store) CredentialsFor(name string) (username, token string) {
	p, ok := s.Get(name)
	if !ok {
		return "", ""
	}
	return p.Username, p.Token
}

// saveProviderLocked writes a single provider to disk.
// Caller must hold s.mu.
func (s *store) saveProviderLocked(p Provider) error {
	if err := os.MkdirAll(s.dir, 0755); err != nil {
		return fmt.Errorf("failed to create providers directory: %w", err)
	}

	data, err := json.MarshalIndent(p, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal provider %s: %w", p.Name, err)
	}

	filePath := filepath.Join(s.dir, p.Name+".json")
	if err := os.WriteFile(filePath, data, 0600); err != nil {
		return fmt.Errorf("failed to write provider file %s: %w", filePath, err)
	}

	return nil
}

// validateProvider checks that a provider has valid required fields.
func validateProvider(p Provider) error {
	if p.Name == "" {
		return fmt.Errorf("provider name is required")
	}
	if p.Type != TypeGitHub && p.Type != TypeGitLab {
		return fmt.Errorf("provider type must be %q or %q, got %q", TypeGitHub, TypeGitLab, p.Type)
	}
	// Name must be filesystem-safe (no slashes, etc.)
	if strings.ContainsAny(p.Name, `/\:*?"<>|`) {
		return fmt.Errorf("provider name contains invalid characters")
	}
	return nil
}
