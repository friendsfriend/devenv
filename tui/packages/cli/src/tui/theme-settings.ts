import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { isThemeJson, setActiveThemeName, setCustomThemes, setSystemTheme, themeNames, type ThemeJson } from '@devenv/ui';

const configDir = () => process.env.DEVENV_CONFIG_DIR || path.join(os.homedir(), ".config", "devenv");
const settingsPath = () => path.join(configDir(), "tui.json");
const themesDir = () => path.join(configDir(), "themes");

export interface TerminalThemeColors {
  foreground?: string;
  background?: string;
  palette?: string[];
}

const ANSI_FALLBACK = ["#000000", "#800000", "#008000", "#808000", "#000080", "#800080", "#008080", "#c0c0c0", "#808080", "#ff0000", "#00ff00", "#ffff00", "#0000ff", "#ff00ff", "#00ffff", "#ffffff"];

function hexToRgb(hex: string) {
  const raw = hex.replace(/^#/, "");
  const value = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function mix(a: string, b: string, amount: number) {
  const left = hexToRgb(a);
  const right = hexToRgb(b);
  const channel = (x: number, y: number) => Math.round(x + (y - x) * amount).toString(16).padStart(2, "0");
  return `#${channel(left.r, right.r)}${channel(left.g, right.g)}${channel(left.b, right.b)}`;
}

function isLight(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b > 160;
}

function parseOscColor(value: string): string | undefined {
  const match = value.match(/rgb:([0-9a-fA-F]{2,4})\/([0-9a-fA-F]{2,4})\/([0-9a-fA-F]{2,4})/);
  if (!match) return undefined;
  const toByte = (part: string) => part.length === 2 ? part : part.slice(0, 2);
  return `#${toByte(match[1]!).toLowerCase()}${toByte(match[2]!).toLowerCase()}${toByte(match[3]!).toLowerCase()}`;
}

export async function queryTerminalThemeColors(timeoutMs = 120): Promise<TerminalThemeColors> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return {};

  return await new Promise((resolve) => {
    const previousRaw = process.stdin.isRaw;
    let buffer = "";
    const done = () => {
      clearTimeout(timer);
      process.stdin.off("data", onData);
      if (process.stdin.setRawMode) process.stdin.setRawMode(previousRaw);
      const foreground = parseOscColor(buffer.match(/\]10;([^\u0007\u001b]+)/)?.[1] ?? "");
      const background = parseOscColor(buffer.match(/\]11;([^\u0007\u001b]+)/)?.[1] ?? "");
      const palette = [...buffer.matchAll(/\]4;(\d+);([^\u0007\u001b]+)/g)]
        .filter(([_, idx]) => Number(idx) < 16)
        .reduce<string[]>((acc, match) => {
          const parsed = parseOscColor(match[2] ?? "");
          if (parsed) acc[Number(match[1])] = parsed;
          return acc;
        }, []);
      resolve({ foreground, background, palette });
    };
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      if ((buffer.includes("]10;") && buffer.includes("]11;")) || buffer.length > 4096) done();
    };
    const timer = setTimeout(done, timeoutMs);
    process.stdin.on("data", onData);
    process.stdin.resume();
    if (process.stdin.setRawMode) process.stdin.setRawMode(true);
    process.stdout.write(`\x1b]10;?\x1b\\\x1b]11;?\x1b\\${Array.from({ length: 16 }, (_, i) => `\x1b]4;${i};?\x1b\\`).join("")}`);
  });
}

export function loadSystemTheme(colors: TerminalThemeColors = {}) {
  const palette = colors.palette?.length ? colors.palette : ANSI_FALLBACK;
  const bg = colors.background ?? (process.env.COLORFGBG?.split(";").at(-1) === "15" ? "#ffffff" : "#000000");
  const fg = colors.foreground ?? (isLight(bg) ? "#111111" : "#eeeeee");
  const dark = !isLight(bg);
  const panel = mix(bg, dark ? "#ffffff" : "#000000", dark ? 0.10 : 0.06);
  const element = mix(bg, dark ? "#ffffff" : "#000000", dark ? 0.16 : 0.12);
  const border = mix(bg, dark ? "#ffffff" : "#000000", dark ? 0.32 : 0.28);
  const muted = mix(fg, bg, 0.42);
  const p = (idx: number, fallback: string) => palette[idx] ?? fallback;

  setSystemTheme({
    defs: { bg, fg, muted, panel, element, border },
    theme: {
      primary: p(6, "#00ffff"),
      secondary: p(5, "#ff00ff"),
      accent: p(4, "#0000ff"),
      error: p(1, "#ff0000"),
      warning: p(3, "#ffff00"),
      success: p(2, "#00ff00"),
      info: p(6, "#00ffff"),
      text: "fg",
      textMuted: "muted",
      selectedListItemText: "bg",
      background: "bg",
      backgroundPanel: "panel",
      backgroundElement: "element",
      backgroundMenu: "element",
      border,
      borderActive: p(6, "#00ffff"),
      borderSubtle: mix(bg, dark ? "#ffffff" : "#000000", dark ? 0.22 : 0.18),
      diffAdded: p(2, "#00ff00"),
      diffRemoved: p(1, "#ff0000"),
      diffContext: "muted",
      diffAddedBg: mix(bg, p(2, "#00ff00"), dark ? 0.22 : 0.12),
      diffRemovedBg: mix(bg, p(1, "#ff0000"), dark ? 0.22 : 0.12),
      diffContextBg: "panel",
    },
  });
}

export function loadCustomThemes(): Record<string, ThemeJson> {
  const loaded: Record<string, ThemeJson> = {};
  try {
    for (const entry of fs.readdirSync(themesDir(), { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
      const name = path.basename(entry.name, ".json");
      const raw = fs.readFileSync(path.join(themesDir(), entry.name), "utf8");
      const parsed = JSON.parse(raw) as unknown;
      if (isThemeJson(parsed)) loaded[name] = parsed;
    }
  } catch {}
  setCustomThemes(loaded);
  return loaded;
}

export function loadThemeName(): string {
  try {
    const raw = fs.readFileSync(settingsPath(), "utf8");
    const parsed = JSON.parse(raw) as { theme?: unknown };
    return typeof parsed.theme === "string" && themeNames.includes(parsed.theme) ? parsed.theme : "catppuccin";
  } catch {
    return "catppuccin";
  }
}

export function applyTheme(name: string): boolean {
  return setActiveThemeName(name);
}

export function saveThemeName(name: string) {
  fs.mkdirSync(configDir(), { recursive: true });
  let existing: Record<string, unknown> = {};
  try {
    existing = JSON.parse(fs.readFileSync(settingsPath(), "utf8")) as Record<string, unknown>;
  } catch {}
  fs.writeFileSync(settingsPath(), `${JSON.stringify({ ...existing, theme: name }, null, 2)}\n`, "utf8");
}
