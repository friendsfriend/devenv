package resources

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestEnvFileLoadUpsertAndRemove(t *testing.T) {
	path := filepath.Join(t.TempDir(), ".env")
	initial := "# keep\nFOO=bar\nTOKEN='old value'\n"
	if err := os.WriteFile(path, []byte(initial), 0600); err != nil {
		t.Fatal(err)
	}

	vars, err := LoadEnvFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if vars["FOO"] != "bar" || vars["TOKEN"] != "old value" {
		t.Fatalf("unexpected vars: %#v", vars)
	}

	if err := UpsertEnvFile(path, map[string]string{"TOKEN": "a'b\\c #x", "NEW": "value"}); err != nil {
		t.Fatal(err)
	}
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	text := string(data)
	if !strings.Contains(text, "# keep\n") || !strings.Contains(text, "FOO=bar\n") {
		t.Fatalf("unrelated content not preserved:\n%s", text)
	}
	vars, err = LoadEnvFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if vars["TOKEN"] != "a'b\\c #x" || vars["NEW"] != "value" {
		t.Fatalf("unexpected updated vars: %#v", vars)
	}

	if err := RemoveEnvFileKeys(path, []string{"TOKEN"}); err != nil {
		t.Fatal(err)
	}
	data, err = os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	text = string(data)
	if strings.Contains(text, "TOKEN=") || !strings.Contains(text, "FOO=bar") || !strings.Contains(text, "NEW=") {
		t.Fatalf("unexpected removal result:\n%s", text)
	}
}

func TestUpsertEnvFileCreatesFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), ".env")
	if err := UpsertEnvFile(path, map[string]string{"A": "b"}); err != nil {
		t.Fatal(err)
	}
	vars, err := LoadEnvFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if vars["A"] != "b" {
		t.Fatalf("unexpected vars: %#v", vars)
	}
}
