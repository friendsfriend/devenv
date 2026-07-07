package logging

import (
	"bufio"
	"bytes"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

// StatusLogBroadcaster is a callback function type for broadcasting status log entries
type StatusLogBroadcaster func(entry LogEntry)

// globalBroadcaster is the global callback for broadcasting status log entries
var globalBroadcaster StatusLogBroadcaster

// SetStatusLogBroadcaster sets the global broadcaster callback
func SetStatusLogBroadcaster(broadcaster StatusLogBroadcaster) {
	globalBroadcaster = broadcaster
}

// Logger provides status and command logging operations.
type Logger interface {
	// LogStatus logs a status update entry.
	LogStatus(appIdent, appName string, operation OperationType, status StatusType, message string) error
	// LogCommand logs a command execution with its result.
	LogCommand(appIdent, appName, command string, args []string, err error, output string) error
	// ReadRecentLogEntries reads the most recent log entries.
	ReadRecentLogEntries(maxEntries int) ([]LogEntry, error)
	// ReadAppLogs reads log entries for a specific app.
	ReadAppLogs(appIdent string, maxEntries int) (string, error)
	// ReadAppLogHistory reads older raw command log lines for a specific app before a byte offset.
	ReadAppLogHistory(appIdent string, beforeOffset int64, maxLines int) (lines []string, nextBeforeOffset int64, hasMore bool, err error)
	// CleanOldLogEntries removes entries in the unified status log older than maxAge.
	CleanOldLogEntries(maxAge time.Duration) error
	// RunCommandWithLogging executes a command and logs the result.
	RunCommandWithLogging(appIdent, command string, args []string, envVars []string, workingDir string) (error, string)
	// RunCommandWithLoggingToFile executes a command and streams stdout/stderr to logPath.
	RunCommandWithLoggingToFile(appIdent, command string, args []string, envVars []string, workingDir string, logPath string) (error, string)
}

// OperationType represents the type of operation being logged
type OperationType string

// StatusType represents the status of an operation
type StatusType string

const (
	// Operation types
	OpBuild      OperationType = "build"
	OpStart      OperationType = "start"
	OpStop       OperationType = "stop"
	OpCheckout   OperationType = "checkout"
	OpPush       OperationType = "push"
	OpFetch      OperationType = "fetch"
	OpPull       OperationType = "pull"
	OpScript     OperationType = "script"
	OpJobCancel  OperationType = "job-cancel"
	OpJobRestart OperationType = "job-restart"

	// Status types
	StatusPending    StatusType = "pending"
	StatusInProgress StatusType = "in_progress"
	StatusCompleted  StatusType = "completed"
	StatusFailed     StatusType = "failed"
	StatusCancelled  StatusType = "cancelled"
)

// LogEntry represents a unified log entry
type LogEntry struct {
	Timestamp time.Time
	AppIdent  string
	AppName   string
	Operation OperationType
	Status    StatusType
	Message   string
}

const (
	logFileName = "status.log"
	maxLogLines = 3000
	trimToLines = 2500 // Trim to this many lines to avoid frequent rotations
)

// fileLogger implements the Logger interface
type fileLogger struct {
	homeDir     string
	logFilePath string
}

// NewLogger creates a new file-based logger.
// homeDir is the devenv home directory (e.g. ~/devenv).
func NewLogger(homeDir string) (Logger, error) {
	if homeDir == "" {
		return nil, fmt.Errorf("homeDir is required")
	}

	logDir := filepath.Join(homeDir, "logs")
	if err := os.MkdirAll(logDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create log directory: %w", err)
	}

	return &fileLogger{
		homeDir:     homeDir,
		logFilePath: filepath.Join(logDir, logFileName),
	}, nil
}

func (l *fileLogger) LogStatus(appIdent, appName string, operation OperationType, status StatusType, message string) error {
	entry := LogEntry{
		Timestamp: time.Now(),
		AppIdent:  appIdent,
		AppName:   appName,
		Operation: operation,
		Status:    status,
		Message:   message,
	}

	return l.writeLogEntry(entry)
}

func (l *fileLogger) LogCommand(appIdent, appName, command string, args []string, err error, output string) error {
	commandLine := fmt.Sprintf("%s %s", command, strings.Join(args, " "))
	status := StatusCompleted
	message := fmt.Sprintf("Command: %s", commandLine)

	if err != nil {
		status = StatusFailed
		message = fmt.Sprintf("Command failed: %s - %s", commandLine, err.Error())
	}

	if output != "" && len(output) < 200 { // Include short outputs
		message += fmt.Sprintf(" | Output: %s", strings.TrimSpace(output))
	}

	entry := LogEntry{
		Timestamp: time.Now(),
		AppIdent:  appIdent,
		AppName:   appName,
		Operation: OpBuild, // Use a generic operation type for commands
		Status:    status,
		Message:   message,
	}

	return l.writeLogEntry(entry)
}

// writeLogEntry writes a single log entry to the file with size management
func (l *fileLogger) writeLogEntry(entry LogEntry) error {
	// Check and rotate log if needed before writing
	if err := l.rotateLogIfNeeded(); err != nil {
		return fmt.Errorf("failed to rotate log: %w", err)
	}

	file, err := os.OpenFile(l.logFilePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return fmt.Errorf("failed to open log file: %w", err)
	}
	defer file.Close()

	// Format: timestamp|appIdent|appName|operation|status|message
	logLine := fmt.Sprintf("%s|%s|%s|%s|%s|%s\n",
		entry.Timestamp.Format("2006-01-02 15:04:05"),
		entry.AppIdent,
		entry.AppName,
		string(entry.Operation),
		string(entry.Status),
		entry.Message,
	)

	_, err = file.WriteString(logLine)

	// Broadcast the log entry via SSE if broadcaster is set
	if err == nil && globalBroadcaster != nil {
		globalBroadcaster(entry)
	}

	return err
}

// rotateLogIfNeeded checks if log file exceeds max lines and trims it if necessary
func (l *fileLogger) rotateLogIfNeeded() error {
	// Check if file exists
	if _, err := os.Stat(l.logFilePath); os.IsNotExist(err) {
		return nil // No rotation needed if file doesn't exist
	}

	// Count lines in the file
	file, err := os.Open(l.logFilePath)
	if err != nil {
		return fmt.Errorf("failed to open log file for reading: %w", err)
	}

	var lines []string
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		lines = append(lines, scanner.Text())
	}
	file.Close()

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("failed to read log file: %w", err)
	}

	// If we exceed maxLogLines, keep only the most recent trimToLines
	if len(lines) >= maxLogLines {
		keepLines := lines[len(lines)-trimToLines:]

		// Write the trimmed content back to the file
		tmpFile := l.logFilePath + ".tmp"
		outFile, err := os.Create(tmpFile)
		if err != nil {
			return fmt.Errorf("failed to create temp file: %w", err)
		}

		for _, line := range keepLines {
			if _, err := outFile.WriteString(line + "\n"); err != nil {
				outFile.Close()
				os.Remove(tmpFile)
				return fmt.Errorf("failed to write to temp file: %w", err)
			}
		}
		outFile.Close()

		// Replace original file with trimmed version
		if err := os.Rename(tmpFile, l.logFilePath); err != nil {
			os.Remove(tmpFile)
			return fmt.Errorf("failed to replace log file: %w", err)
		}
	}

	return nil
}

func (l *fileLogger) ReadRecentLogEntries(maxEntries int) ([]LogEntry, error) {
	// Check if log file exists
	if _, err := os.Stat(l.logFilePath); os.IsNotExist(err) {
		return []LogEntry{}, nil // Return empty slice if file doesn't exist
	}

	// Read all lines from the file
	file, err := os.Open(l.logFilePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open log file: %w", err)
	}
	defer file.Close()

	var lines []string
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		lines = append(lines, scanner.Text())
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("failed to read log file: %w", err)
	}

	// Parse the most recent entries
	var entries []LogEntry
	startIdx := 0
	if len(lines) > maxEntries {
		startIdx = len(lines) - maxEntries
	}

	for i := startIdx; i < len(lines); i++ {
		entry, err := l.parseLogLine(lines[i])
		if err != nil {
			continue // Skip malformed lines
		}
		entries = append(entries, entry)
	}

	return entries, nil
}

// parseLogLine parses a log line into a LogEntry
func (l *fileLogger) parseLogLine(line string) (LogEntry, error) {
	parts := strings.Split(line, "|")
	if len(parts) != 6 {
		return LogEntry{}, fmt.Errorf("invalid log line format")
	}

	timestamp, err := time.Parse("2006-01-02 15:04:05", parts[0])
	if err != nil {
		return LogEntry{}, fmt.Errorf("failed to parse timestamp: %w", err)
	}

	return LogEntry{
		Timestamp: timestamp,
		AppIdent:  parts[1],
		AppName:   parts[2],
		Operation: OperationType(parts[3]),
		Status:    StatusType(parts[4]),
		Message:   parts[5],
	}, nil
}

func (l *fileLogger) ReadAppLogs(appIdent string, maxEntries int) (string, error) {
	// Read all recent entries
	entries, err := l.ReadRecentLogEntries(maxEntries * 3) // Get more entries to filter
	if err != nil {
		return "", err
	}

	// Filter entries for this specific app
	var appEntries []LogEntry
	for _, entry := range entries {
		if entry.AppIdent == appIdent {
			appEntries = append(appEntries, entry)
		}
	}

	// Limit to maxEntries
	if len(appEntries) > maxEntries {
		appEntries = appEntries[len(appEntries)-maxEntries:]
	}

	commandLog, commandLogErr := l.readRawIndividualAppLog(appIdent)

	// Format as text similar to old format
	if len(appEntries) == 0 && commandLog == "" {
		return "", nil
	}

	var result strings.Builder
	for _, entry := range appEntries {
		timestamp := entry.Timestamp.Format("2006-01-02 15:04:05")
		status := "SUCCESS"
		if entry.Status == StatusFailed {
			status = "ERROR"
		}

		result.WriteString(fmt.Sprintf("[%s] Operation: %s - %s\n", timestamp, entry.Operation, status))
		if entry.Message != "" {
			result.WriteString(fmt.Sprintf("[%s] Message: %s\n", timestamp, entry.Message))
		}
		result.WriteString(fmt.Sprintf("[%s] ---\n\n", timestamp))
	}

	if commandLog != "" {
		result.WriteString("Command input/output log\n")
		result.WriteString("========================\n")
		result.WriteString(commandLog)
		if !strings.HasSuffix(commandLog, "\n") {
			result.WriteString("\n")
		}
	} else if commandLogErr != nil && !os.IsNotExist(commandLogErr) {
		result.WriteString(fmt.Sprintf("Command log unavailable: %v\n", commandLogErr))
	}

	return result.String(), nil
}

func (l *fileLogger) RunCommandWithLogging(appIdent, command string, args []string, envVars []string, workingDir string) (error, string) {
	return l.RunCommandWithLoggingToFile(appIdent, command, args, envVars, workingDir, "")
}

func (l *fileLogger) RunCommandWithLoggingToFile(appIdent, command string, args []string, envVars []string, workingDir string, logPath string) (error, string) {
	cmd := exec.Command(command, args...)
	cmd.Env = append(os.Environ(), envVars...)
	cmd.Dir = workingDir

	logFiles, closeLog := l.openCommandLogs(appIdent, command, args, envVars, workingDir, logPath)
	defer closeLog()

	var output bytes.Buffer
	writer := &lockedMultiWriter{writers: []io.Writer{&output}}
	for _, logFile := range logFiles {
		writer.writers = append(writer.writers, logFile)
	}
	cmd.Stdout = writer
	cmd.Stderr = writer

	err := cmd.Run()
	out := output.String()
	if len(logFiles) > 0 {
		timestamp := time.Now().Format("2006-01-02 15:04:05")
		for _, logFile := range logFiles {
			if err != nil {
				_, _ = fmt.Fprintf(logFile, "\n[%s] Exit: ERROR (%s)\n", timestamp, err.Error())
			} else {
				_, _ = fmt.Fprintf(logFile, "\n[%s] Exit: SUCCESS\n", timestamp)
			}
			_, _ = fmt.Fprintf(logFile, "[%s] ---\n\n", timestamp)
		}
	}

	// Log summary to unified status log; full output is in the individual app log.
	l.LogCommand(appIdent, l.getAppDisplayName(appIdent), command, args, err, out)
	return err, out
}

type lockedMultiWriter struct {
	mu      sync.Mutex
	writers []io.Writer
}

func (w *lockedMultiWriter) Write(p []byte) (int, error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	for _, writer := range w.writers {
		if _, err := writer.Write(p); err != nil {
			return 0, err
		}
	}
	return len(p), nil
}

func (l *fileLogger) openCommandLogs(appIdent, command string, args []string, envVars []string, workingDir string, logPath string) ([]*os.File, func()) {
	var files []*os.File
	if logPath != "" {
		if err := os.MkdirAll(filepath.Dir(logPath), 0755); err == nil {
			if logFile, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644); err == nil {
				l.writeCommandHeader(logFile, command, args, envVars, workingDir)
				files = append(files, logFile)
			}
		}
	}
	if appLog, closeAppLog := l.openIndividualAppLog(appIdent, command, args, envVars, workingDir); appLog != nil {
		_ = closeAppLog
		files = append(files, appLog)
	}
	return files, func() {
		for _, file := range files {
			_ = file.Close()
		}
	}
}

func (l *fileLogger) openIndividualAppLog(appIdent, command string, args []string, envVars []string, workingDir string) (*os.File, func()) {
	logDir := filepath.Join(l.homeDir, "logs")
	if err := os.MkdirAll(logDir, 0755); err != nil {
		return nil, func() {}
	}
	logFilePath := filepath.Join(logDir, appIdent+".log")
	logFile, err := os.OpenFile(logFilePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return nil, func() {}
	}
	l.writeCommandHeader(logFile, command, args, envVars, workingDir)
	return logFile, func() { _ = logFile.Close() }
}

func (l *fileLogger) writeCommandHeader(logFile *os.File, command string, args []string, envVars []string, workingDir string) {
	timestamp := time.Now().Format("2006-01-02 15:04:05")
	_, _ = fmt.Fprintf(logFile, "[%s] Command: %s\n", timestamp, shellQuoteCommand(command, args))
	if workingDir != "" {
		_, _ = fmt.Fprintf(logFile, "[%s] Working directory: %s\n", timestamp, workingDir)
	}
	if len(envVars) > 0 {
		_, _ = fmt.Fprintf(logFile, "[%s] Environment overrides: %s\n", timestamp, strings.Join(envVars, " "))
	}
	_, _ = fmt.Fprintf(logFile, "[%s] Output:\n", timestamp)
}

func shellQuoteCommand(command string, args []string) string {
	parts := make([]string, 0, len(args)+1)
	parts = append(parts, strconv.Quote(command))
	for _, arg := range args {
		parts = append(parts, strconv.Quote(arg))
	}
	return strings.Join(parts, " ")
}

func (l *fileLogger) readRawIndividualAppLog(appIdent string) (string, error) {
	logFilePath := filepath.Join(l.homeDir, "logs", appIdent+".log")
	content, err := os.ReadFile(logFilePath)
	if err != nil {
		return "", err
	}
	return string(content), nil
}

func (l *fileLogger) ReadAppLogHistory(appIdent string, beforeOffset int64, maxLines int) ([]string, int64, bool, error) {
	logFilePath := filepath.Join(l.homeDir, "logs", appIdent+".log")
	return ReadLinesBefore(logFilePath, beforeOffset, maxLines)
}

func ReadLinesBefore(path string, beforeOffset int64, maxLines int) ([]string, int64, bool, error) {
	if maxLines <= 0 {
		maxLines = 1000
	}
	file, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return []string{}, 0, false, nil
		}
		return nil, 0, false, err
	}
	defer file.Close()

	info, err := file.Stat()
	if err != nil {
		return nil, 0, false, err
	}
	if beforeOffset <= 0 || beforeOffset > info.Size() {
		beforeOffset = info.Size()
	}
	if beforeOffset == 0 {
		return []string{}, 0, false, nil
	}

	const chunkSize int64 = 32 * 1024
	pos := beforeOffset
	buf := make([]byte, 0, chunkSize*2)
	lineCount := 0

	for pos > 0 && lineCount <= maxLines {
		readSize := chunkSize
		if pos < readSize {
			readSize = pos
		}
		pos -= readSize
		chunk := make([]byte, readSize)
		if _, err := file.ReadAt(chunk, pos); err != nil && err != io.EOF {
			return nil, 0, false, err
		}
		buf = append(chunk, buf...)
		lineCount = bytes.Count(buf, []byte{'\n'})
	}

	if len(buf) > 0 && buf[len(buf)-1] == '\n' {
		buf = buf[:len(buf)-1]
	}
	parts := strings.Split(string(buf), "\n")
	if len(parts) > maxLines {
		drop := len(parts) - maxLines
		parts = parts[drop:]
		consumed := 0
		for i := 0; i < drop; i++ {
			consumed += len(strings.Split(string(buf), "\n")[i]) + 1
		}
		pos += int64(consumed)
	}
	if len(parts) == 1 && parts[0] == "" {
		parts = []string{}
	}
	return parts, pos, pos > 0, nil
}

func (l *fileLogger) readIndividualAppLog(appIdent string, maxEntries int) (string, error) {
	logFilePath := filepath.Join(l.homeDir, "logs", appIdent+".log")
	content, err := os.ReadFile(logFilePath)
	if err != nil {
		return "", err
	}
	lines := strings.Split(string(content), "\n")
	maxLines := maxEntries
	if maxLines <= 0 {
		maxLines = 500
	}
	if len(lines) > maxLines {
		lines = lines[len(lines)-maxLines:]
	}
	return strings.Join(lines, "\n"), nil
}

func (l *fileLogger) CleanOldLogEntries(maxAge time.Duration) error {
	logFilePath := l.logFilePath

	info, err := os.Stat(logFilePath)
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return err
	}

	// If the file is newer than maxAge, skip entirely
	if time.Since(info.ModTime()) < maxAge {
		return nil
	}

	content, err := os.ReadFile(logFilePath)
	if err != nil {
		return err
	}

	lines := strings.Split(string(content), "\n")
	if len(lines) == 0 || (len(lines) == 1 && lines[0] == "") {
		return nil
	}

	cutoff := time.Now().Add(-maxAge)
	var kept []string
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		parts := strings.SplitN(line, "|", 2)
		if len(parts) < 2 {
			kept = append(kept, line)
			continue
		}
		ts, err := time.Parse("2006-01-02 15:04:05", parts[0])
		if err != nil {
			// Can't parse timestamp — keep the line to be safe
			kept = append(kept, line)
			continue
		}
		if ts.After(cutoff) || ts.Equal(cutoff) {
			kept = append(kept, line)
		}
	}

	if len(kept) == len(lines) {
		return nil // nothing to remove
	}

	// Write filtered lines back
	output := strings.Join(kept, "\n") + "\n"
	return os.WriteFile(logFilePath, []byte(output), 0644)
}

// logCommandToIndividualFile maintains backward compatibility with individual app log files
func (l *fileLogger) logCommandToIndividualFile(appIdent, command string, args []string, output string, err error) {
	logDir := filepath.Join(l.homeDir, "logs")
	if err := os.MkdirAll(logDir, 0755); err != nil {
		return // Silently fail if we can't create log directory
	}

	logFilePath := filepath.Join(logDir, appIdent+".log")
	logFile, fileErr := os.OpenFile(logFilePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if fileErr != nil {
		return // Silently fail if we can't open log file
	}
	defer logFile.Close()

	timestamp := time.Now().Format("2006-01-02 15:04:05")
	commandLine := fmt.Sprintf("%s %v", command, args)

	logEntry := fmt.Sprintf("[%s] Command: %s\n", timestamp, commandLine)
	if err != nil {
		logEntry += fmt.Sprintf("[%s] Error: %s\n", timestamp, err.Error())
	}
	if output != "" {
		logEntry += fmt.Sprintf("[%s] Output:\n%s\n", timestamp, output)
	}
	logEntry += fmt.Sprintf("[%s] ---\n\n", timestamp)

	logFile.WriteString(logEntry)
}

// getAppDisplayName is a placeholder - this should be provided by the app manager
func (l *fileLogger) getAppDisplayName(appIdent string) string {
	// This is a simplified version - in practice this would come from app configuration
	return appIdent
}
