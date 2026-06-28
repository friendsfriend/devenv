#!/usr/bin/env bun
import { Command } from 'commander';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import fs from 'fs';
import { APP_VERSION } from './version';

// Embedded server binary (base64 encoded) - defined at compile time
// @ts-ignore - EMBEDDED_SERVER_BINARY_BASE64 will be defined at compile time
declare const EMBEDDED_SERVER_BINARY_BASE64: string | undefined;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse a .env file and return its key-value pairs (no shell export needed).
function parseEnvFile(filePath: string): Record<string, string> {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const vars: Record<string, string> = {};
    for (const raw of content.split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      // Strip leading "export " if present
      const stripped = line.replace(/^export\s+/, '');
      const eq = stripped.indexOf('=');
      if (eq === -1) continue;
      const key = stripped.slice(0, eq).trim();
      let value = stripped.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      // Expand $HOME / ${HOME}
      value = value.replace(/\$\{HOME\}|\$HOME/g, os.homedir());
      if (key) vars[key] = value;
    }
    return vars;
  } catch {
    return {};
  }
}

// Resolve the devenv home directory.
// Priority: DEVENV_HOME env var → DEVENV_HOME in ~/.config/devenv/.env → ~/devenv fallback.
function resolveDevenvHome(): string {
  if (process.env.DEVENV_HOME) return process.env.DEVENV_HOME;
  const configDir = process.env.DEVENV_CONFIG_DIR || path.join(os.homedir(), '.config', 'devenv');
  const envVars = parseEnvFile(path.join(configDir, '.env'));
  if (envVars.DEVENV_HOME) return envVars.DEVENV_HOME;
  return path.join(os.homedir(), 'devenv');
}

const program = new Command();

// Helper function to extract embedded server binary
async function getEmbeddedServerPath(): Promise<string | null> {
  // Check if we have an embedded server binary
  if (typeof EMBEDDED_SERVER_BINARY_BASE64 === 'undefined' || !EMBEDDED_SERVER_BINARY_BASE64) {
    return null;
  }
  
  try {
    // Create temp directory for extracted binary
    const tmpDir = path.join(os.tmpdir(), 'devenv', `${process.pid}`);
    await fs.promises.mkdir(tmpDir, { recursive: true });
    
    const extension = process.platform === 'win32' ? '.exe' : '';
    const tmpBinaryPath = path.join(tmpDir, `devenv-server${extension}`);
    
    // Decode base64 and write binary to temp location
    const binaryData = Buffer.from(EMBEDDED_SERVER_BINARY_BASE64, 'base64');
    await Bun.write(tmpBinaryPath, binaryData);
    
    // Make executable on Unix systems
    if (process.platform !== 'win32') {
      await fs.promises.chmod(tmpBinaryPath, 0o755);
    }

    // Re-sign on macOS: extracted binaries are unsigned and may be killed by Gatekeeper
    if (process.platform === 'darwin') {
      try {
        Bun.spawnSync(['codesign', '--remove-signature', tmpBinaryPath]);
        Bun.spawnSync(['codesign', '-s', '-', tmpBinaryPath]);
      } catch (e) {
        // Non-fatal: codesign may not be available in all environments
      }
    }

    return tmpBinaryPath;
  } catch (error) {
    console.error('Failed to extract embedded server:', error);
    return null;
      }
    }
    
    
program
  .name('devenv')
  .description('DevEnv - Development Environment CLI')
  .version(APP_VERSION);

program
  .command('spawn', { isDefault: true })
  .description('Start Go backend server and OpenTUI frontend in separate processes (default command)')
  .option('-p, --port <port>', 'Backend server port', '4050')
  .action(async (options) => {
    const port = options.port || '4050';
    const serverUrl = `http://127.0.0.1:${port}`;
    
    let serverProcess;
    let serverBinaryPath: string | null = null;
    let isEmbedded = false;
    let isDevMode = false;
    let cleanupTemp = false;
    
    // Try to get embedded server first
    serverBinaryPath = await getEmbeddedServerPath();
    if (serverBinaryPath) {
      isEmbedded = true;
      cleanupTemp = true;
    } else {
      // Not compiled or no embedded binary - check for dev mode or dist binary
      const projectRoot = path.resolve(__dirname, '../../../..');
      const serverDir = path.join(projectRoot, 'server');
      const distBinaryPath = path.join(projectRoot, 'dist/server/devenv');
      
      // Check if dist binary exists (production mode without embedding)
      const distBinaryExists = await Bun.file(distBinaryPath).exists();
      
      if (distBinaryExists) {
        serverBinaryPath = distBinaryPath;
      } else {
        isDevMode = true;
      }
    }
    
    // Create log file for server output
    const devenvHome = resolveDevenvHome();
    await fs.promises.mkdir(devenvHome, { recursive: true });
    const logDir = path.join(devenvHome, 'logs');
    await fs.promises.mkdir(logDir, { recursive: true });
    const serverLogPath = path.join(logDir, 'server.log');
    const serverLogFile = await fs.promises.open(serverLogPath, 'a');
    

    
    if (isDevMode) {
      // Development mode: use go run from server directory
      const projectRoot = path.resolve(__dirname, '../../../..');
      const serverDir = path.join(projectRoot, 'server');

      serverProcess = Bun.spawn(['go', 'run', 'main.go', 'server', '--port', port], {
        cwd: serverDir,
        stdout: serverLogFile.fd,
        stderr: serverLogFile.fd,
        env: process.env,
      });
    } else {
      // Production mode: use binary (embedded or from dist)
      const mode = isEmbedded ? 'EMBEDDED' : 'DIST';

      serverProcess = Bun.spawn([serverBinaryPath!, 'server', '--port', port], {
        stdout: serverLogFile.fd,
        stderr: serverLogFile.fd,
        env: process.env,
      });
    }
    
    // Returns the PID of the process listening on the given port, or null.
    const getListeningPid = (p: string): number | null => {
      try {
        // -n: no DNS, -P: no port names, -iTCP:<port>: only TCP on this port, -sTCP:LISTEN: only LISTEN state
        const result = Bun.spawnSync(['lsof', '-n', '-P', `-iTCP:${p}`, '-sTCP:LISTEN']);
        const lines = new TextDecoder().decode(result.stdout).trim().split('\n').filter(Boolean);
        // Skip header line; grab PID from second column of first match
        for (const line of lines.slice(1)) {
          const parts = line.trim().split(/\s+/);
          const pid = parseInt(parts[1], 10);
          if (!isNaN(pid)) return pid;
        }
      } catch (e) { /* ignore */ }
      return null;
    };

    // Helper: poll health until the server responds with the correct homeDir
    const waitForServer = async (expectedHomeDir: string, maxRetries: number): Promise<boolean> => {
      let retries = maxRetries;
      while (retries > 0) {
        try {
          const response = await fetch(`${serverUrl}/api/health`, {
            signal: AbortSignal.timeout(1000),
          });
          if (response.ok) {
            const data = await response.json();
            if (data.status === 'ok' && data.homeDir === expectedHomeDir) {
              return true;
            }
          }
        } catch (e) {
          // Retry
        }
        retries--;
        if (retries > 0) await new Promise(resolve => setTimeout(resolve, 500));
      }
      return false;
    };

    // Check if a stale server is already listening on the port with a different homeDir
    let staleServerPid: number | null = null;
    try {
      const response = await fetch(`${serverUrl}/api/health`, { signal: AbortSignal.timeout(1000) });
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'ok' && data.homeDir !== devenvHome) {
          staleServerPid = getListeningPid(port);
        }
      }
    } catch (e) {
      // No existing server — that's fine
    }

    if (staleServerPid !== null) {
      // Kill only the LISTEN process (not connected clients)
      try {
        process.kill(staleServerPid);
      } catch (e) { /* already gone */ }
      // Wait for port to free up, then give our new server time to bind
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    const serverReady = await waitForServer(devenvHome, 10);

    if (!serverReady) {
      console.error('Server failed to start: Health check timed out after retries');
      serverProcess.kill();
      await serverLogFile.close();
      process.exit(1);
    }

    await serverLogFile.close();

    // Now spawn TUI in a separate process (like OpenCode does)

    // Determine the command to spawn TUI
    const bin = process.execPath;
    const cmd: string[] = bin.endsWith('bun')
      ? [bin, '--conditions', 'browser', __filename, 'attach', serverUrl]
      : [bin, 'attach', serverUrl];

    const tuiProcess = Bun.spawn(cmd, {
      cwd: process.cwd(),
      stdout: 'inherit',
      stderr: 'inherit',
      stdin: 'inherit',
      env: process.env,
    });

    // Ensure server is killed on any exit path: normal TUI exit, SIGINT, SIGTERM, or uncaught error
    const killServer = () => {
      const pid = getListeningPid(port);
      if (pid !== null) { try { process.kill(pid); } catch (e) { /* already gone */ } }
      try { serverProcess.kill(); } catch (e) { /* already gone */ }
      try { tuiProcess.kill(); } catch (e) { /* already gone */ }
    };

    process.on('SIGINT', () => { killServer(); process.exit(0); });
    process.on('SIGTERM', () => { killServer(); process.exit(0); });
    process.on('exit', () => { killServer(); });

    // Wait for TUI to exit
    await tuiProcess.exited;

    // Always kill the server when TUI exits — find the listener on the port in case
    // we connected to a pre-existing server (staleServerPid case replaced it).
    killServer();
    
    // Cleanup temp binary if we extracted one
    if (cleanupTemp && serverBinaryPath) {
      try {
        const tmpDir = path.dirname(serverBinaryPath);
        await fs.promises.rm(tmpDir, { recursive: true, force: true });
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    // Give it 1 second to shutdown gracefully
    await new Promise(resolve => setTimeout(resolve, 1000));
    process.exit(tuiProcess.exitCode || 0);
  });

program
  .command('attach <url>')
  .description('Attach TUI to a running DevEnv server')
  .action(async (url) => {
    const { startTUI } = await import('./tui/app-opentui');
    const { initializeLogging, getLogger } = await import('@devenv/core');
    
    const logger = getLogger();

    initializeLogging();
    
    logger.write('INFO', `[ATTACH] Connecting to server at: ${url}`);
    
    await startTUI(url);
  });

program
  .command('server')
  .description('Start only the Go backend server')
  .option('-p, --port <port>', 'Server port', '4050')
  .action(async (options) => {
    const port = options.port || '4050';
    
    let serverBinaryPath: string | null = null;
    let isEmbedded = false;
    let isDevMode = false;
    
    // Try to get embedded server first
    serverBinaryPath = await getEmbeddedServerPath();
    if (serverBinaryPath) {
      isEmbedded = true;
    } else {
      const projectRoot = path.resolve(__dirname, '../../../..');
      const serverDir = path.join(projectRoot, 'server');
      const distBinaryPath = path.join(projectRoot, 'dist/server/devenv');
      const distBinaryExists = await Bun.file(distBinaryPath).exists();
      
      if (distBinaryExists) {
        serverBinaryPath = distBinaryPath;
      } else {
        isDevMode = true;
      }
    }
    
    console.log('Starting DevEnv server...');
    
    let serverProcess;
    if (isDevMode) {
      const projectRoot = path.resolve(__dirname, '../../../..');
      const serverDir = path.join(projectRoot, 'server');
      serverProcess = Bun.spawn(['go', 'run', 'main.go', 'server', '--port', port], {
        cwd: serverDir,
        stdout: 'inherit',
        stderr: 'inherit',
      });
    } else {
      const mode = isEmbedded ? 'EMBEDDED' : 'DIST';
      console.log(`[${mode}] Running Go server: ${serverBinaryPath}`);
      serverProcess = Bun.spawn([serverBinaryPath!, 'server', '--port', port], {
        stdout: 'inherit',
        stderr: 'inherit',
      });
    }
    
    await serverProcess.exited;
    
    // Cleanup temp binary if we extracted one
    if (isEmbedded && serverBinaryPath) {
      try {
        const tmpDir = path.dirname(serverBinaryPath);
        await fs.promises.rm(tmpDir, { recursive: true, force: true });
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    process.exit(serverProcess.exitCode || 0);
  });

program.parse();

