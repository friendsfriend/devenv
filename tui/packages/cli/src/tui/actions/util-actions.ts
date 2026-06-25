import { getLogger } from '@devenv/core';
import type { DevEnvClient } from '@devenv/core';
import type { ScriptParameter, SshHost } from '@devenv/types';
import type { EditorChoice } from '@devenv/ui';
import type { AppStore } from '../stores/app-store';
import type { AgentStore } from '../stores/agent-store';
import type { UiStore } from '../stores/ui-store';

const isTmuxSession = (): boolean => {
  if (!process.env.TMUX) return false;
  try {
    const { spawnSync } = require('child_process') as typeof import('child_process');
    const result = spawnSync('which', ['tmux'], { stdio: 'ignore', shell: false });
    return result.status === 0;
  } catch {
    return false;
  }
};

const spawnInTmuxWindow = (windowName: string, cmd: string, args: string[], cwd: string): void => {
  // tmux new-window focuses the new window automatically by default
  Bun.spawn(['tmux', 'new-window', '-n', windowName, '-c', cwd, cmd, ...args], {
    stdout: 'ignore',
    stderr: 'ignore',
    stdin: 'ignore',
  }).unref();
};

// Holds the current script parameters fetched from the server metadata endpoint.
// Used by openScriptArgsModal -> submitScriptArgsAndRun flow.
let currentScriptParameters: ScriptParameter[] = [];

const shellEscape = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;

const buildHeldCommand = (cmd: string, args: string[]): string => {
  const fullCommand = [cmd, ...args].map(shellEscape).join(' ');
  return `${fullCommand}; exit_code=$?; echo; read -r -n 1 -s -p "Press any key to close..." _; echo; exit $exit_code`;
};

export function createUtilActions(
  appStore: AppStore,
  agentStore: AgentStore,
  uiStore: UiStore,
  renderer: ReturnType<typeof import('@opentui/solid').useRenderer>,
  client: DevEnvClient,
) {
  const getSelectedApp = () => appStore.filteredApps()[appStore.selectedIndex()];

  const openLogFileInEditor = () => {
    const logPath = getLogger().getLogPath();
    const envEditor = process.env.EDITOR || process.env.VISUAL;
    let editorCmd = envEditor || (process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open');
    const editorArgs = envEditor ? [logPath] : process.platform === 'win32' ? ['/c', 'start', logPath] : [logPath];
    Bun.spawn([editorCmd, ...editorArgs], { stdout: 'ignore', stderr: 'ignore', stdin: 'ignore' }).unref();
  };

  const openInEditor = (targetPath?: string, lineNumber?: number) => {
    const resolvedPath = targetPath ?? getSelectedApp()?.localDirectoryPath;
    if (!resolvedPath) return;
    const envEditor = process.env.EDITOR || process.env.VISUAL;
    const TERMINAL_EDITORS = ['vim', 'nvim', 'vi', 'nano', 'emacs', 'hx', 'helix', 'micro'];
    const isTerminalEditor = envEditor ? TERMINAL_EDITORS.some((e) => envEditor === e || envEditor.endsWith(`/${e}`)) : false;
    if (isTerminalEditor && envEditor) {
      if (isTmuxSession()) {
        const app = getSelectedApp();
        const editorBin = envEditor.split('/').pop() ?? envEditor;
        const windowName = app ? `${editorBin} - ${app.displayName}` : editorBin;
        const editorArgs = lineNumber ? [`+${lineNumber}`, resolvedPath] : [resolvedPath];
        spawnInTmuxWindow(windowName, envEditor, editorArgs, app?.localDirectoryPath ?? resolvedPath);
        return;
      }
      const { spawnSync } = require('child_process') as typeof import('child_process');
      renderer.suspend();
      try {
        spawnSync(envEditor, lineNumber ? [`+${lineNumber}`, resolvedPath] : [resolvedPath], { stdio: 'inherit', shell: false });
      } finally {
        renderer.resume();
      }
      return;
    }
    let editorCmd: string;
    let editorArgs: string[];
    if (envEditor) {
      const editorBin = envEditor.split('/').pop() ?? '';
      if ((editorBin === 'code' || editorBin === 'cursor') && lineNumber) {
        editorCmd = envEditor;
        editorArgs = ['--goto', `${resolvedPath}:${lineNumber}`];
      } else {
        editorCmd = envEditor;
        editorArgs = [resolvedPath];
      }
    } else if (process.platform === 'darwin') {
      editorCmd = 'open';
      editorArgs = [resolvedPath];
    } else if (process.platform === 'win32') {
      editorCmd = 'cmd';
      editorArgs = ['/c', 'start', resolvedPath];
    } else {
      editorCmd = 'xdg-open';
      editorArgs = [resolvedPath];
    }
    Bun.spawn([editorCmd, ...editorArgs], { stdout: 'ignore', stderr: 'ignore', stdin: 'ignore' }).unref();
  };

  const launchLazygit = () => {
    const app = getSelectedApp();
    if (!app) return;
    if (isTmuxSession()) {
      spawnInTmuxWindow(`lazygit - ${app.displayName}`, 'lazygit', [], app.localDirectoryPath);
      return;
    }
    const { spawnSync } = require('child_process') as typeof import('child_process');
    renderer.suspend();
    try {
      spawnSync('lazygit', [], { stdio: 'inherit', shell: false, cwd: app.localDirectoryPath });
    } finally {
      renderer.resume();
    }
  };

  const launchLazygitBranchLog = (branchName: string) => {
    const app = getSelectedApp();
    if (!app) return;
    if (isTmuxSession()) {
      spawnInTmuxWindow(`lazygit log - ${app.displayName}`, 'lazygit', ['log'], app.localDirectoryPath);
      return;
    }
    const { spawnSync } = require('child_process') as typeof import('child_process');
    renderer.suspend();
    try {
      spawnSync('lazygit', ['log'], { stdio: 'inherit', shell: false, cwd: app.localDirectoryPath });
    } finally {
      renderer.resume();
    }
  };

  const launchLazygitStatus = () => {
    const app = getSelectedApp();
    if (!app) return;
    if (isTmuxSession()) {
      spawnInTmuxWindow(`lazygit - ${app.displayName}`, 'lazygit', ['status'], app.localDirectoryPath);
      return;
    }
    const { spawnSync } = require('child_process') as typeof import('child_process');
    renderer.suspend();
    try {
      spawnSync('lazygit', ['status'], { stdio: 'inherit', shell: false, cwd: app.localDirectoryPath });
    } finally {
      renderer.resume();
    }
  };

  const runSelectedScriptInForeground = (scriptArgs: string[] = []) => {
    const app = getSelectedApp();
    if (!app || app.resourceType !== 'script-file' || !app.scriptPath) return;

    const path = require('path') as typeof import('path');
    const fs = require('fs') as typeof import('fs');
    const { spawnSync } = require('child_process') as typeof import('child_process');

    const runWhich = (bin: string) => {
      const checker = process.platform === 'win32' ? 'where' : 'which';
      const result = spawnSync(checker, [bin], { stdio: 'ignore', shell: false });
      return result.status === 0;
    };

    const pauseUntilKeypress = () => {
      try {
        if (process.platform === 'win32') {
          spawnSync('powershell', ['-NoProfile', '-Command', 'Write-Host ""; Write-Host -NoNewline "Press any key to continue..."; $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown"); Write-Host ""'], { stdio: 'inherit', shell: false });
          return;
        }

        if (runWhich('bash')) {
          spawnSync('bash', ['-lc', 'echo; read -r -n 1 -s -p "Press any key to continue..." _; echo'], { stdio: 'inherit', shell: false });
          return;
        }

        spawnSync('sh', ['-c', 'echo; printf "Press Enter to continue..."; read _; echo'], { stdio: 'inherit', shell: false });
      } catch {
        // ignore prompt failures and return to UI
      }
    };

    const resolveInterpreterForWindows = (scriptPath: string): { cmd: string; args: string[] } | null => {
      if (process.platform !== 'win32') {
        return null; // signal: execute script directly
      }

      // Read the first line (shebang)
      try {
        const content = fs.readFileSync(scriptPath, 'utf8');
        const firstLine = content.split('\n')[0]?.trim() || '';
        if (firstLine.startsWith('#!')) {
          const rest = firstLine.slice(2).trim();
          const parts = rest.split(/\s+/);
          if (parts.length > 0) {
            const interpPath = parts[0];
            let interp = path.basename(interpPath);
            // Handle /usr/bin/env → next arg is actual interpreter
            const shebangArgs = interp === 'env' && parts.length > 1 ? parts.slice(2) : parts.slice(1);
            if (interp === 'env' && parts.length > 1) {
              interp = parts[1];
            }
            const windowsCmd = mapShebangToWindows(interp);
            if (runWhich(windowsCmd)) {
              return { cmd: windowsCmd, args: [...shebangArgs, scriptPath, ...scriptArgs] };
            }
            return null;
          }
        }
      } catch {
        // Fall through to extension-based mapping
      }

      // Fallback: extension-based mapping
      const ext = path.extname(scriptPath).toLowerCase();
      const extMap: Record<string, string> = {
        '.sh': 'bash',
        '.ps1': 'pwsh',
        '.py': 'python',
        '.ts': 'bun',
        '.js': 'bun',
      };
      const cmd = extMap[ext];
      if (cmd && runWhich(cmd)) {
        return { cmd, args: [scriptPath, ...scriptArgs] };
      }

      return null;
    };

    const mapShebangToWindows = (interp: string): string => {
      const base = interp.toLowerCase().replace(/\.exe$/, '');
      const windowsInterpMap: Record<string, string> = {
        bash: 'bash',
        sh: 'sh',
        zsh: 'zsh',
        python: 'python',
        python3: 'python',
        pwsh: 'pwsh',
        powershell: 'pwsh',
        bun: 'bun',
        node: 'node',
        deno: 'deno',
        ruby: 'ruby',
        perl: 'perl',
      };
      return windowsInterpMap[base] || interp;
    };

    let cmd: string;
    let cmdArgs: string[];
    const cwd = path.dirname(app.scriptPath);

    if (process.platform === 'win32') {
      const plan = resolveInterpreterForWindows(app.scriptPath);
      if (!plan) {
        uiStore.showError('Interpreter Not Found', `Could not find a compatible interpreter for ${app.displayName}.`);
        return;
      }
      cmd = plan.cmd;
      cmdArgs = plan.args;
    } else {
      // Unix: execute directly via shebang
      cmd = app.scriptPath;
      cmdArgs = scriptArgs;
    }

    if (isTmuxSession()) {
      const windowName = `${cmd} - ${app.displayName}`;
      if (runWhich('bash')) {
        spawnInTmuxWindow(windowName, 'bash', ['-lc', buildHeldCommand(cmd, cmdArgs)], cwd);
      } else {
        spawnInTmuxWindow(windowName, cmd, cmdArgs, cwd);
      }
      return;
    }

    renderer.suspend();
    try {
      spawnSync(cmd, cmdArgs, { stdio: 'inherit', shell: false, cwd });
      pauseUntilKeypress();
    } finally {
      renderer.resume();
    }
  };

  const buildArgsFromParameterValues = (values: Record<string, string>, parameters: ScriptParameter[]): string[] => {
    const args: string[] = [];

    for (const param of parameters) {
      const raw = (values[param.name] ?? '').trim();

      if (param.required && raw === '') {
        throw new Error(`Missing required parameter: ${param.name}`);
      }

      const flag = param.flag || `--${param.name}`;

      if (param.type === 'bool') {
        if (raw === 'true') {
          args.push(flag);
        }
        continue;
      }

      if (raw === '') continue;

      if (param.type === 'int' && !/^-?\d+$/.test(raw)) {
        throw new Error(`Parameter ${param.name} must be an integer`);
      }

      if (param.type === 'enum' && param.choices && param.choices.length > 0 && !param.choices.includes(raw)) {
        throw new Error(`Parameter ${param.name} must be one of: ${param.choices.join(', ')}`);
      }

      args.push(flag, raw);
    }

    return args;
  };

  const openScriptArgsModal = async () => {
    const app = getSelectedApp();
    if (!app || app.resourceType !== 'script-file' || !app.scriptRelativePath) return;

    // Fetch parameters from server via --devenv-metadata endpoint
    let metadataParams: ScriptParameter[] = [];
    try {
      const metadata = await client.getScriptMetadata(app.scriptRelativePath);
      metadataParams = metadata.parameters || [];
    } catch {
      // server unavailable → use empty parameters (script runs without args modal)
    }

    const initialValues: Record<string, string> = {};
    for (const param of metadataParams) {
      if (param.type === 'bool') {
        initialValues[param.name] = param.defaultValue === 'true' ? 'true' : 'false';
      } else if (param.type === 'enum' && param.choices && param.choices.length > 0) {
        initialValues[param.name] = param.defaultValue || param.choices[0] || '';
      } else {
        initialValues[param.name] = param.defaultValue || '';
      }
    }

    // Store fetched parameters for the keyboard handler
    uiStore.setScriptArgsParameters(metadataParams);
    currentScriptParameters = metadataParams;

    // If no parameters, run directly without showing modal
    if (metadataParams.length === 0) {
      runSelectedScriptInForeground();
      return;
    }

    uiStore.setScriptArgsTargetScript(app.scriptRelativePath);
    uiStore.setScriptArgValues(initialValues);
    uiStore.setScriptArgsSelectedIndex(0);
    uiStore.setScriptArgsHistoryCursor(-1);
    uiStore.setScriptArgsError(null);

    try {
      const response = await client.getScriptArgsHistory(app.scriptRelativePath, 50);
      uiStore.setScriptArgsHistory((prev) => ({ ...prev, [app.scriptRelativePath!]: response.entries || [] }));
    } catch {
      // keep modal usable even when history loading fails
    }

    uiStore.setShowScriptArgsModal(true);
  };

  const submitScriptArgsAndRun = async () => {
    const app = getSelectedApp();
    if (!app || app.resourceType !== 'script-file') return;

    try {
      const current = { ...(uiStore.scriptArgValues() || {}) };
      const args = buildArgsFromParameterValues(current, currentScriptParameters);
      runSelectedScriptInForeground(args);

      if (app.scriptRelativePath) {
        uiStore.setScriptArgsHistory((prev) => {
          const key = app.scriptRelativePath!;
          const existing = prev[key] || [];
          const deduped = existing.filter((entry) => JSON.stringify(entry) !== JSON.stringify(current));
          const next = [current, ...deduped].slice(0, 50);
          return { ...prev, [key]: next };
        });
        void client.addScriptArgsHistory(app.scriptRelativePath, current);
      }

      uiStore.setShowScriptArgsModal(false);
      uiStore.setScriptArgsError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid script arguments';
      uiStore.setScriptArgsError(message);
    }
  };

  const launchLazydocker = () => {
    const app = getSelectedApp();
    if (!app) return;
    if (isTmuxSession()) {
      spawnInTmuxWindow(`lazydocker - ${app.displayName}`, 'lazydocker', [], app.localDirectoryPath);
      return;
    }
    const { spawnSync } = require('child_process') as typeof import('child_process');
    renderer.suspend();
    try {
      spawnSync('lazydocker', [], { stdio: 'inherit', shell: false, cwd: app.localDirectoryPath });
    } finally {
      renderer.resume();
    }
  };

  const openEditorPicker = () => {
    const app = getSelectedApp();
    if (!app) return;
    uiStore.setEditorPickerSelectedIndex(0);
    uiStore.setShowEditorPicker(true);
  };

  const openInEditorWith = (editor: EditorChoice, targetPath?: string) => {
    const resolvedPath = targetPath ?? getSelectedApp()?.localDirectoryPath;
    if (!resolvedPath) return;
    const { spawnSync } = require('child_process') as typeof import('child_process');

    if (editor === 'nvim') {
      if (isTmuxSession()) {
        const app = getSelectedApp();
        const windowName = app ? `nvim - ${app.displayName}` : 'nvim';
        spawnInTmuxWindow(windowName, 'nvim', [resolvedPath], app?.localDirectoryPath ?? resolvedPath);
        return;
      }
      renderer.suspend();
      try {
        spawnSync('nvim', [resolvedPath], { stdio: 'inherit', shell: false });
      } finally {
        renderer.resume();
      }
      return;
    }

    if (editor === 'vscode') {
      Bun.spawn(['code', resolvedPath], { stdout: 'ignore', stderr: 'ignore', stdin: 'ignore' }).unref();
      return;
    }

    if (editor === 'intellij') {
      if (process.platform === 'darwin') {
        // On macOS prefer the `idea` CLI (JetBrains Toolbox shell script) and fall
        // back to the `open -a` approach when it is not in PATH.
        try {
          spawnSync('which', ['idea'], { stdio: 'ignore', shell: false });
          Bun.spawn(['idea', resolvedPath], { stdout: 'ignore', stderr: 'ignore', stdin: 'ignore' }).unref();
        } catch {
          Bun.spawn(['open', '-a', 'IntelliJ IDEA', resolvedPath], { stdout: 'ignore', stderr: 'ignore', stdin: 'ignore' }).unref();
        }
      } else {
        // Linux / Windows: rely on the `idea` shell script being in PATH
        Bun.spawn(['idea', resolvedPath], { stdout: 'ignore', stderr: 'ignore', stdin: 'ignore' }).unref();
      }
      return;
    }
  };

  const parseSshConfig = (): SshHost[] => {
    try {
      const os = require('os') as typeof import('os');
      const path = require('path') as typeof import('path');
      const fs = require('fs') as typeof import('fs');
      const configPath = path.join(os.homedir(), '.ssh', 'config');
      if (!fs.existsSync(configPath)) return [];
      const raw: string = fs.readFileSync(configPath, 'utf8');
      const hosts: SshHost[] = [];
      let current: SshHost | null = null;
      for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const match = trimmed.match(/^(\S+)\s+(.+)$/);
        if (!match) continue;
        const [, key, value] = match;
        if (key.toLowerCase() === 'host') {
          if (current) hosts.push(current);
          current = value.includes('*') || value.includes('?') ? null : { alias: value.trim() };
        } else if (current) {
          switch (key.toLowerCase()) {
            case 'hostname': current.hostname = value.trim(); break;
            case 'user': current.user = value.trim(); break;
            case 'port': current.port = parseInt(value.trim(), 10) || 22; break;
            case 'identityfile': current.identityFile = value.trim(); break;
          }
        }
      }
      if (current) hosts.push(current);
      return hosts;
    } catch {
      return [];
    }
  };

  const openSshPicker = () => {
    agentStore.setSshHosts(parseSshConfig());
    agentStore.setSelectedSshIndex(0);
    agentStore.setSshSearchQuery('');
    appStore.setViewMode('sshPicker');
  };

  const isKeyLoadedInAgent = (identityFile: string): Promise<boolean> => new Promise((resolve) => {
    try {
      const { spawn } = require('child_process') as typeof import('child_process');
      const child = spawn('ssh-add', ['-l'], { shell: false });
      let stdout = '';
      child.stdout?.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
      child.on('error', () => resolve(false));
      child.on('close', (code: number | null) => {
        if (code !== 0) return resolve(false);
        const os = require('os') as typeof import('os');
        const normalised = identityFile.replace(/^~\//, `${os.homedir()}/`);
        resolve(stdout.includes(normalised) || stdout.includes(identityFile));
      });
    } catch {
      resolve(false);
    }
  });

  const addKeyToAgent = (identityFile: string, passphrase: string): Promise<boolean> => new Promise((resolve) => {
    try {
      const os = require('os') as typeof import('os');
      const path = require('path') as typeof import('path');
      const fs = require('fs') as typeof import('fs');
      const { spawn } = require('child_process') as typeof import('child_process');
      const tmpDir = os.tmpdir();
      const passphraseFile = path.join(tmpDir, `.devenv-pp-${Date.now()}`);
      const askpassScript = path.join(tmpDir, `.devenv-askpass-${Date.now()}.sh`);
      fs.writeFileSync(passphraseFile, passphrase, { mode: 0o600 });
      fs.writeFileSync(askpassScript, `#!/bin/sh\ncat "${passphraseFile}"\n`, { mode: 0o700 });
      const normalised = identityFile.replace(/^~\//, `${os.homedir()}/`);
      const cleanup = () => {
        try { fs.unlinkSync(passphraseFile); } catch {}
        try { fs.unlinkSync(askpassScript); } catch {}
      };
      const child = spawn('ssh-add', [normalised], {
        shell: false,
        env: { ...process.env, SSH_ASKPASS: askpassScript, SSH_ASKPASS_REQUIRE: 'force', DISPLAY: process.env.DISPLAY || ':0' },
      });
      child.on('error', () => { cleanup(); resolve(false); });
      child.on('close', (code: number | null) => { cleanup(); resolve(code === 0); });
    } catch {
      resolve(false);
    }
  });

  const launchSsh = async (host: SshHost, skipAgentCheck = false) => {
    if (host.identityFile && !skipAgentCheck) {
      const loaded = await isKeyLoadedInAgent(host.identityFile);
      if (!loaded) {
        uiStore.setPendingSshHost(host);
        uiStore.setPassphraseText('');
        uiStore.setPassphraseError(null);
        uiStore.setShowPassphraseModal(true);
        return;
      }
    }
    appStore.setViewMode('table');
    const { spawnSync } = require('child_process') as typeof import('child_process');
    const args: string[] = [];
    if (host.port && host.port !== 22) args.push('-p', String(host.port));
    if (host.identityFile) args.push('-i', host.identityFile);
    args.push(host.user ? `${host.user}@${host.alias}` : host.alias);
    renderer.suspend();
    try {
      spawnSync('ssh', args, { stdio: 'inherit', shell: false });
    } finally {
      renderer.resume();
    }
  };

  const submitPassphrase = async () => {
    const host = uiStore.pendingSshHost();
    if (!host || !host.identityFile) return;
    const success = await addKeyToAgent(host.identityFile, uiStore.passphraseText());
    if (success) {
      uiStore.setShowPassphraseModal(false);
      uiStore.setPassphraseText('');
      uiStore.setPassphraseError(null);
      uiStore.setPendingSshHost(null);
      void launchSsh(host, true);
    } else {
      uiStore.setPassphraseError('Incorrect passphrase, try again');
      uiStore.setPassphraseText('');
    }
  };

  const handleCopySelection = async () => {
    const selectedText = renderer.getSelection()?.getSelectedText();
    if (!selectedText) {
      // Don't show status — caller should check selection first and let terminal
      // handle native copy when there's no TUI selection.
      return;
    }
    const { copyToClipboard } = await import('@devenv/core');
    const base64 = Buffer.from(selectedText).toString('base64');
    const osc52 = `\x1b]52;c;${base64}\x07`;
    const finalOsc52 = process.env.TMUX ? `\x1bPtmux;\x1b${osc52}\x1b\\` : osc52;
    process.stdout.write(finalOsc52);
    const success = copyToClipboard(selectedText);
    if (success) {
      uiStore.setCopyStatus('✓ Copied');
      setTimeout(() => uiStore.setCopyStatus(null), 2000);
    }
    renderer.clearSelection();
  };

  return {
    openLogFileInEditor,
    openInEditor,
    openEditorPicker,
    openInEditorWith,
    launchLazygit,
    launchLazygitBranchLog,
    launchLazygitStatus,
    launchLazydocker,
    runSelectedScriptInForeground,
    openScriptArgsModal,
    submitScriptArgsAndRun,
    parseSshConfig,
    openSshPicker,
    isKeyLoadedInAgent,
    addKeyToAgent,
    launchSsh,
    submitPassphrase,
    handleCopySelection,
  };
}

export type UtilActions = ReturnType<typeof createUtilActions>;
