package logging

import (
	"os"
	"path/filepath"
	"reflect"
	"testing"
)

func TestReadLinesBeforePagesBackward(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "app.log")
	content := "line1\nline2\nline3\nline4\nline5\n"
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}

	lines, cursor, hasMore, err := ReadLinesBefore(path, 0, 2)
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(lines, []string{"line4", "line5"}) {
		t.Fatalf("last page lines = %#v", lines)
	}
	if !hasMore || cursor <= 0 {
		t.Fatalf("expected more with positive cursor, got hasMore=%v cursor=%d", hasMore, cursor)
	}

	lines, cursor, hasMore, err = ReadLinesBefore(path, cursor, 2)
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(lines, []string{"line2", "line3"}) {
		t.Fatalf("previous page lines = %#v", lines)
	}
	if !hasMore || cursor <= 0 {
		t.Fatalf("expected more with positive cursor, got hasMore=%v cursor=%d", hasMore, cursor)
	}

	lines, cursor, hasMore, err = ReadLinesBefore(path, cursor, 2)
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(lines, []string{"line1"}) {
		t.Fatalf("first page lines = %#v", lines)
	}
	if hasMore || cursor != 0 {
		t.Fatalf("expected start of file, got hasMore=%v cursor=%d", hasMore, cursor)
	}
}
